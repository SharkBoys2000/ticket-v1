'use client';

import { useState } from 'react';
import {
  statusLabels,
  statusMessage,
} from '../../lib/status-message.js';

export default function StatusEditor({ ticket, onSaved }) {
  const queued =
    ticket.notification && ticket.notification.state !== 'accepted';
  const [status, setStatus] = useState(
    ticket.notification?.status || ticket.status,
  );
  const [note, setNote] = useState(
    queued ? ticket.notification.note : '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const disabled = busy || Boolean(queued);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/tickets/' + ticket._id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          note,
          expectedStatus: ticket.status,
          notify: true,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ส่งไม่สำเร็จ กรุณาลองใหม่');
      }

      setSuccess(
        result.alreadySent
          ? 'รายการนี้แจ้ง LINE แล้ว ไม่ส่งซ้ำ'
          : 'บันทึกแล้ว และ LINE รับข้อความแล้ว',
      );
    } catch (error) {
      setError(
        error.name === 'TimeoutError'
          ? 'ยังยืนยันผลไม่ได้ กรุณารีเฟรชแล้วลองส่งข้อความเดิมซ้ำ'
          : error.message,
      );
    } finally {
      setBusy(false);
      await onSaved();
    }
  }

  return (
    <form className="status-editor" onSubmit={submit}>
      <small>สถานะที่บันทึก: {statusLabels[ticket.status]}</small>
      <select
        aria-label={'สถานะ Ticket ' + ticket._id}
        className={status}
        value={status}
        disabled={disabled}
        onChange={(event) => {
          setStatus(event.target.value);
          setSuccess('');
        }}
      >
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        aria-label={'รายละเอียดแจ้งลูกค้า ' + ticket._id}
        placeholder="รายละเอียดเพิ่มเติมถึงลูกค้า (ไม่บังคับ)"
        value={note}
        maxLength={2000}
        rows={3}
        disabled={disabled}
        onChange={(event) => {
          setNote(event.target.value);
          setSuccess('');
        }}
      />
      <details>
        <summary>ดูข้อความที่จะส่งทาง LINE</summary>
        <p className="notification-preview">
          {statusMessage(ticket._id, status, note.trim())}
        </p>
      </details>
      <button
        type="submit"
        disabled={busy || ticket.sourceType !== 'user' || !ticket.lineUserId}
      >
        {busy
          ? 'กำลังบันทึกและส่ง…'
          : queued
            ? 'ลองส่งข้อความเดิมอีกครั้ง'
            : 'บันทึกและแจ้งลูกค้า'}
      </button>
      {ticket.notification?.state === 'accepted' && (
        <small>
          LINE รับแจ้งสถานะ {statusLabels[ticket.notification.status]} แล้ว
        </small>
      )}
      {queued && (
        <small>
          สถานะบันทึกแล้ว แต่ยังยืนยันการส่งไม่ได้ ข้อความเดิมจะถูกใช้เมื่อส่งซ้ำ
        </small>
      )}
      {ticket.sourceType !== 'user' && (
        <small>แจ้งลูกค้าได้เฉพาะแชทส่วนตัว</small>
      )}
      {error && (
        <p role="alert" className="notify-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="notify-success">
          {success}
        </p>
      )}
    </form>
  );
}
