import { randomUUID } from 'node:crypto';
import { Ticket } from './models.js';
import { statusMessage, pushStatus } from './notification.js';
function fail(message, status = 409) { const error = new Error(message); error.status = status; throw error; }
export async function saveAndNotify(id, status, note, expectedStatus, send = pushStatus) {
  const ticket = await Ticket.findById(id).lean();
  if (!ticket) fail('ไม่พบ Ticket', 404);
  if (ticket.mergedInto) fail('Ticket นี้ถูกรวมแล้ว กรุณาเปิดรายการหลัก');
  if (!ticket.lineUserId || ticket.sourceType !== 'user') fail('รุ่นนี้แจ้งลูกค้าได้เฉพาะข้อความแชทส่วนตัวกับ OA', 422);
  let notification = ticket.notification;
  const same = notification && notification.status === status && notification.note === note;
  if (same && notification.state === 'accepted') return { accepted: true, alreadySent: true };
  if (notification && notification.state !== 'accepted' && !same)
    fail('มีข้อความเดิมที่ยังส่งไม่สำเร็จ กรุณาส่งรายการเดิมซ้ำก่อนเปลี่ยนข้อมูล');
  if (!same) {
    if (ticket.status !== expectedStatus) fail('สถานะถูกแก้ไขแล้ว กรุณารีเฟรชแล้วตรวจสอบอีกครั้ง');
    notification = { key: randomUUID(), to: ticket.lineUserId, text: statusMessage(id, status, note),
      status, note, state: 'pending', createdAt: new Date(), error: '' };
    const filter = { _id: id, status: ticket.status,
      ...(ticket.notification?.key ? { 'notification.key': ticket.notification.key } : { 'notification.key': { $exists: false } }) };
    const saved = await Ticket.updateOne(filter, { $set: { status, notification } }, { runValidators: true });
    if (!saved.modifiedCount) fail('มีการบันทึกพร้อมกัน กรุณารีเฟรชแล้วลองอีกครั้ง');
  }
  // Stay safely inside LINE's 24-hour deduplication window.
  if (Date.now() - new Date(notification.createdAt).getTime() > 23 * 60 * 60 * 1000)
    fail('รายการส่งนี้เกิน 23 ชั่วโมงแล้ว กรุณาตรวจประวัติแชทก่อนให้ผู้ดูแลดำเนินการต่อ');
  try {
    await send(notification);
  } catch (error) {
    await Ticket.updateOne({ _id: id, 'notification.key': notification.key, 'notification.state': { $ne: 'accepted' } },
      { $set: { 'notification.state': 'failed', 'notification.error': 'ส่งไม่สำเร็จหรือยังยืนยันไม่ได้' } });
    return { accepted: false, statusSaved: true, error: error.message?.startsWith('LINE ไม่รับ') ? error.message :
      'บันทึกสถานะแล้ว แต่ยังยืนยันการส่ง LINE ไม่ได้ กดส่งซ้ำได้โดยใช้ข้อความเดิม' };
  }
  await Ticket.updateOne({ _id: id, 'notification.key': notification.key },
    { $set: { 'notification.state': 'accepted', 'notification.acceptedAt': new Date(), 'notification.error': '' } });
  return { accepted: true, statusSaved: true };
}
