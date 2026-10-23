# Ticket V1 — Next.js + MongoDB + LINE
ตัวอย่างโปรเจกต์ JavaScript ใช้ Next.js 16 App Router, React 19, Mongoose 9 และ Node.js 22.12+ (แนะนำ Node.js 24 LTS)
ติดตั้งเวอร์ชันย่อยที่แน่นอนตาม package-lock.json ด้วย npm ci

## 1. สถาปัตยกรรมและขอบเขต
LINE OA → POST /api/webhook/line → ตรวจ signature → validate payload → Customer + Ticket ใน MongoDB
Dashboard → GET /api/tickets → MongoDB → ตาราง
เจ้าหน้าที่ → PATCH /api/tickets/:id → เปลี่ยนสถานะ

- 1 message event = 1 Ticket; ข้อความและรูปภาพที่ส่งแยกกันจะเป็นคนละ Ticket
- เริ่ม Pending; เจ้าหน้าที่เปลี่ยนเป็น InProgress หรือ Resolved
- Dashboard polling ทุก 10 วินาทีและกดรีเฟรชได้ ไม่ใช่ WebSocket realtime
- ดูทุกรายการผ่าน pagination 25 รายการต่อหน้า
- follow, unfollow, postback และ unsend ไม่สร้าง Ticket; V1 ยังไม่ลบข้อความเมื่อได้รับ unsend
- text เก็บเนื้อหา; image เก็บ message ID และ provider metadata; ชนิดอื่นเก็บ ID/type เท่านั้น
- ไม่ส่งข้อความตอบกลับ LINE และไม่มีการรวมบทสนทนา/มอบหมายงานใน V1
- ใช้กับ LINE channel เดียว; หากขยายหลาย channel ให้เพิ่ม channel/destination ใน key ของข้อมูล

## 2. โครงสร้างไฟล์
```text
app/
  api/webhook/line/route.js      รับ Webhook
  api/tickets/route.js          อ่านรายการแบบแบ่งหน้า
  api/tickets/[id]/route.js     เปลี่ยนสถานะ
  api/tickets/[id]/image/route.js ดึงรูปจาก LINE ผ่านเซิร์ฟเวอร์
  dashboard/page.jsx           ตาราง Client Component
  layout.jsx
  page.jsx
  globals.css
lib/
  db.js                        cache การเชื่อมต่อ MongoDB
  models.js                    Customer + Ticket schema
  line.js                      signature และ validation
  auth.js                      Basic Authentication
proxy.js                       ป้องกันหน้า Dashboard และ Ticket APIs
scripts/indexes.js             สร้าง indexes ก่อนรับ Webhook
tests/line.test.js
.env.example
```

## 3. Database Schema
โค้ดทั้งหมดอยู่ที่ lib/models.js

| Collection | Field | ความหมาย |
| --- | --- | --- |
| customers | lineUserId | LINE User ID, unique |
| customers | displayName / pictureUrl | ช่องเตรียมไว้สำหรับข้อมูล Profile, ค่าเริ่มต้น null |
| customers | firstSeenAt / lastSeenAt | เวลาที่พบลูกค้าครั้งแรก/ล่าสุดตาม event |
| tickets | webhookEventId | unique key สำหรับป้องกัน Webhook ซ้ำ |
| tickets | customer | ObjectId อ้างถึง customers; null หากไม่มี userId |
| tickets | lineUserId / sourceType / groupId / roomId | ผู้ส่งและแหล่งข้อความ |
| tickets | messageId / messageType / text | ข้อมูลข้อความ |
| tickets | image | provider และ URL metadata หาก LINE ส่งมา |
| tickets | eventAt | เวลาข้อความจาก LINE timestamp (milliseconds) |
| tickets | status | Pending, InProgress, Resolved |
| ทั้งสอง | createdAt / updatedAt | เวลาที่แอปบันทึก/แก้ไข |

ฐานข้อมูลเก็บ Date เป็น UTC; ตารางแสดงเวลาประเทศไทย
Webhook ไม่มี displayName มาให้ โค้ดนี้แสดง User ID และใช้ชื่อสำรอง “ลูกค้า LINE”
หากต้องการชื่อจริง ให้เพิ่มขั้นตอนเรียก LINE Profile API แยกต่างหาก โดยอย่าให้ความล้มเหลวของ Profile API ทำให้ Ticket สูญหาย

**ต้องรัน npm run db:indexes ก่อนเปิด Webhook**: unique ใน Mongoose เป็นการประกาศ MongoDB index ไม่ใช่ validator
แอปตั้ง autoIndex: false เพื่อให้สร้าง index อย่างชัดเจน หากมีข้อมูลซ้ำเดิม ให้แก้ข้อมูลก่อนรัน
index { eventAt: -1, _id: -1 } ช่วยการเรียงรายการ

## 4. Webhook ทำงานอย่างไร
อ่านโค้ด app/api/webhook/line/route.js และ lib/line.js ตามลำดับ:
1. อ่าน raw bytes ผ่าน request.arrayBuffer()
2. คำนวณ HMAC-SHA256 ด้วย LINE_CHANNEL_SECRET แล้วเปรียบเทียบ x-line-signature ด้วย timingSafeEqual
3. parse JSON หลัง signature ผ่านเท่านั้น; ห้าม request.json() แล้ว JSON.stringify() ก่อนตรวจ เพราะ whitespace มีผล
4. validate events ทั้งชุดก่อนเริ่มบันทึก
5. events: [] ตอบ 200 รองรับปุ่ม Verify ของ LINE Console โดยไม่ต้องเชื่อม DB
6. upsert Customer ด้วย lineUserId ใช้ $min/$max เพื่อรองรับ event ที่มาถึงผิดลำดับ
7. upsert Ticket ด้วย webhookEventId และ $setOnInsert จึงไม่รีเซ็ตสถานะเมื่อ LINE ส่ง event เดิมซ้ำ
8. ตอบ 200 หลังบันทึกทั้งหมด; ฐานข้อมูลล้มเหลวตอบ 503 เพื่อเปิดโอกาสให้ LINE redeliver
9. รองรับ concurrent duplicate-key 11000; unique indexes เป็นตัวรับประกันการไม่ซ้ำ

ตัวอย่างแกนหลักที่ใช้จริง:
```js
const raw = Buffer.from(await request.arrayBuffer());
if (!verifySignature(raw, request.headers.get('x-line-signature'), secret)) {
  return Response.json({ error: 'Invalid signature' }, { status: 401 });
}
await Ticket.updateOne(
  { webhookEventId: record.webhookEventId },
  { $setOnInsert: { ...record, customer: customer?._id ?? null, status: 'Pending' } },
  { upsert: true, runValidators: true }
);
```
Customer กับ Ticket ไม่ได้ใช้ multi-document transaction: หากล้มเหลวกลางทางอาจมี Customer โดยยังไม่มี Ticket แต่เมื่อส่งซ้ำจะเติม Ticket ได้
ถ้า batch บันทึกได้บางส่วนแล้วล้มเหลว การ retry จะข้าม Ticket เดิมและบันทึกส่วนที่เหลือ
V1 รอเขียน DB ใน request เพื่อให้ง่ายต่อการติดตั้ง; ปริมาณสูงควรใช้ durable queue แล้วตอบ 200 หลัง enqueue สำเร็จ ห้ามตอบก่อนบันทึกหรือ enqueue
ตั้ง timeout/body-size limit/rate limit ที่ hosting ตามปริมาณงานจริง

## 5. Dashboard และสิทธิ์เข้าถึง
app/dashboard/page.jsx เป็น Client Component ใช้ fetch('/api/tickets?page=1', { cache: 'no-store' })
API ฝั่ง Node.js เรียก MongoDB และ populate ชื่อลูกค้า ส่ง JSON กลับ พร้อม Cache-Control: private, no-store
มี loading/error/empty state, pagination, รีเฟรชอัตโนมัติ และ dropdown เปลี่ยนสถานะ
ไม่มี secret อยู่ใน client bundle และไม่ใช้ NEXT_PUBLIC_ กับ environment variables

proxy.js ป้องกัน /dashboard และ /api/tickets/* ด้วย HTTP Basic Auth
Ticket API ตรวจ credential ซ้ำใน handler ด้วย; Webhook ยกเว้น Basic Auth และใช้ LINE signature แทน
เบราว์เซอร์จะแสดงช่องกรอก username/password เอง
PATCH ตรวจ Origin ตรงกับ APP_ORIGIN เพื่อป้องกัน cross-site mutation
V1 ใช้บัญชีเจ้าหน้าที่ร่วมกันและการแก้สถานะแบบ last-write-wins; ยังไม่มีบัญชีแยกคน, audit log หรือ optimistic locking
เมื่อใช้งานภายนอกต้องผ่าน HTTPS; ระบบหลายเจ้าหน้าที่ควรขยายเป็น session login/SSO + roles + audit log

## 6. รูปภาพ
LINE ไม่ส่งไฟล์รูปใน JSON; เราเก็บ messageId แล้วเรียก:
GET https://api-data.line.me/v2/bot/message/{messageId}/content
โดยส่ง Authorization: Bearer LINE_CHANNEL_ACCESS_TOKEN จาก server เท่านั้น
ลิงก์เปิดรูปในตารางวิ่งผ่าน API ที่มี authentication; ไม่ส่ง token ไป browser
รองรับ JPEG, PNG, GIF, WebP จาก LINE provider
provider external เก็บ metadata เท่านั้น ไม่ fetch URL อิสระ เพื่อไม่ให้ server ถูกใช้เรียก URL ภายใน
**V1 ไม่ได้เก็บ binary ของภาพถาวร** และเนื้อหาบน LINE อาจหมดอายุ จึงอาจเปิดไม่ได้ภายหลัง
ถ้าต้องเก็บเป็นหลักฐานระยะยาว ให้ดาวน์โหลดตอนรับ event ผ่าน queue แล้วเก็บใน object storage พร้อม URL ที่มีสิทธิ์เข้าถึง

## 7. ตั้งค่าทีละขั้น
### A. เตรียม MongoDB
เลือก MongoDB local หรือ Atlas
- Local: เริ่ม MongoDB ที่ 127.0.0.1:27017
- Atlas: สร้าง cluster, database user, กำหนด network access ให้เครื่อง/hosting ที่รันแอป แล้วคัดลอก connection string
- ใช้ database ticket_v1 และบัญชีที่มีสิทธิ์อ่าน/เขียนและสร้าง indexes
- หากรหัสผ่านใน URI มีอักขระพิเศษ ต้อง URL-encode
### B. ติดตั้งและตั้ง environment
เปิด terminal ในโฟลเดอร์ ticket-v1:
```powershell
npm ci
Copy-Item .env.example .env.local
```
แก้ .env.local:
```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/ticket_v1
LINE_CHANNEL_SECRET=ค่าจากแท็บ Basic settings
LINE_CHANNEL_ACCESS_TOKEN=ค่าจากแท็บ Messaging API
DASHBOARD_USER=staff
DASHBOARD_PASSWORD=รหัสผ่านยาวแบบสุ่ม
APP_ORIGIN=http://localhost:3000
```
Channel secret ใช้ตรวจ signature; Channel access token ใช้ดึงรูป เป็นคนละค่า
ไม่ commit .env.local และไม่ใส่ NEXT_PUBLIC_ นำหน้าคีย์เหล่านี้
```powershell
npm run db:indexes
npm run dev
```
เปิด http://localhost:3000/dashboard แล้วเข้าสู่ระบบด้วย DASHBOARD_USER / DASHBOARD_PASSWORD
### C. เปิด Messaging API สำหรับ LINE OA
1. สร้างหรือเลือก LINE Official Account ใน LINE Official Account Manager
2. ไป Settings → Messaging API → Enable Messaging API และเลือก Provider
3. เปิด LINE Developers Console เลือก Provider และ Messaging API channel ที่สร้าง
4. Basic settings → Channel secret คัดลอกไป LINE_CHANNEL_SECRET
5. Messaging API → Channel access token ออก token แล้วใส่ LINE_CHANNEL_ACCESS_TOKEN
6. restart แอปหลังเปลี่ยน environment
### D. ตั้ง HTTPS Webhook
Localhost รับ request จาก LINE โดยตรงไม่ได้:
- ใช้ HTTPS tunnel ของเครื่องมือที่คุณมี หรือ deploy Next.js ไป Node.js hosting ที่เชื่อม MongoDB ได้
- production: npm ci → npm run build → npm start และตั้ง env ใน hosting
- ตั้ง APP_ORIGIN ให้ตรง origin ที่เปิด Dashboard เช่น https://ticket.example.com (ไม่มี slash ท้าย)
- ไม่ใช้ static export หรือ Edge runtime สำหรับ Mongoose
- LINE Developers → Messaging API → Webhook settings → Webhook URL:
  https://ticket.example.com/api/webhook/line
- กด Verify ต้องได้ Success
- เปิด Use webhook และ Webhook redelivery
- หากไม่ต้องการข้อความตอบอัตโนมัติของ OA ให้ปรับ Auto-response/Greeting ใน OA Manager ตาม workflow
- ทดสอบส่งข้อความจาก LINE จริง; Verify เพียงอย่างเดียวไม่ทดสอบการบันทึก MongoDB
### E. ทดสอบครบวงจร
1. เพิ่ม OA เป็นเพื่อน แล้วส่ง “แจ้งปัญหาการใช้งาน”
2. ภายในรอบ polling เห็น Ticket สถานะ Pending
3. ส่งรูปแล้วเปิดลิงก์รูปภาพจากตาราง
4. เปลี่ยนเป็น InProgress แล้วรีเฟรช ตรวจว่าค่ายังอยู่
5. ทดสอบส่ง event เดิมซ้ำด้วย signed request: ต้องมี Ticket เดียวและสถานะไม่กลับ Pending
6. POST ไม่มี/ผิด signature ต้องได้ 401
7. signed payload ที่มี events: [] ต้องได้ 200
8. DB ล่มแล้วส่ง message event ต้องได้ 503; เมื่อ LINE redeliver หลัง DB กลับมา Ticket ต้องถูกบันทึก
9. ไม่ login ต้องไม่สามารถอ่าน /api/tickets หรือเปิดรูปได้

## 8. การตรวจสอบและข้อจำกัด
npm test รันทดสอบ signature, parsing, image/group, invalid payload และ stable redelivery key
npm run build ตรวจว่า Next.js สร้าง production build ได้
การทดสอบ local ไม่ทดแทน end-to-end กับ LINE และ MongoDB จริง; ต้องใส่ credentials และทดสอบรายการในข้อ 7E
ไม่รองรับ unsend deletion, การเก็บภาพถาวร, SLA, assignment, role-based permissions หรือ audit trail ในรุ่นนี้
สำหรับ unsend ควรเพิ่มการลบ/ซ่อนข้อความและรูปตาม messageId รวมทั้งจัดการ event ที่มาถึงผิดลำดับก่อนใช้งานที่ต้องรองรับการถอนข้อความ

## เอกสารอ้างอิง
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Mongoose + Next.js: https://mongoosejs.com/docs/nextjs.html
- LINE signature: https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
- LINE receiving/redelivery/content: https://developers.line.biz/en/docs/messaging-api/receiving-messages/
- LINE channel setup: https://developers.line.biz/en/docs/messaging-api/getting-started/

