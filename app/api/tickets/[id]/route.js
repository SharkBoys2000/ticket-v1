import { Ticket } from '../../../../lib/models.js';
import { withConversation, conversationKey } from '../../../../lib/conversations.js';
import mongoose from 'mongoose';
import { connectDB } from '../../../../lib/db.js';
import { authorize } from '../../../../lib/auth.js';
import { saveAndNotify } from '../../../../lib/status-update.js';
export const runtime = 'nodejs';
export async function PATCH(request, { params }) {
  const denied = authorize(request); if (denied) return denied;
  if (!process.env.APP_ORIGIN || request.headers.get('origin') !== process.env.APP_ORIGIN)
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const { id } = await params;
  if (!mongoose.isObjectIdOrHexString(id)) return Response.json({ error: 'Invalid ID' }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const statuses = ['Pending', 'InProgress', 'Resolved'];
  if (!statuses.includes(body?.status) || !statuses.includes(body?.expectedStatus) ||
      body?.notify !== true || typeof body?.note !== 'string' || body.note.length > 2000)
    return Response.json({ error: 'ข้อมูลไม่ถูกต้อง รายละเอียดต้องไม่เกิน 2,000 ตัวอักษร' }, { status: 400 });
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) return Response.json({ error: 'ยังไม่ได้ตั้งค่า LINE Token' }, { status: 503 });
  try {
    await connectDB();
    const ticket = await Ticket.findById(id).lean();
    if (!ticket) return Response.json({error:'Not found'},{status:404});
    const result = await withConversation(ticket.conversationKey || conversationKey(ticket),
      () => saveAndNotify(id, body.status, body.note.trim(), body.expectedStatus));
    return Response.json(result, { status: result.accepted ? 200 : 502, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.status ? error.message : 'บันทึกหรือยืนยันผลไม่สำเร็จ กรุณารีเฟรชก่อนลองส่งข้อความเดิมซ้ำ' },
      { status: error.status || 503 });
  }
}
