export const statusLabels = { Pending: 'รอดำเนินการ', InProgress: 'กำลังดำเนินการ', Resolved: 'เสร็จสิ้น' };
export function statusMessage(id, status, note = '') {
  return 'อัปเดตคำร้อง #' + id.toString().slice(-8) + '\nสถานะ: ' + statusLabels[status] +
    (note ? '\nรายละเอียด: ' + note : '') + '\nหากต้องการสอบถามเพิ่มเติม แจ้งเลขคำร้องนี้ได้เลยครับ';
}
