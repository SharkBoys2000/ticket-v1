'use client';

import { useState } from 'react';

export default function AssigneeEditor({ ticket, onSaved }) {
  const [name, setName] = useState(ticket.assignee || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);

    try {
      const response = await fetch(
        '/api/tickets/' + ticket._id + '/assignee',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignee: name,
            expected: ticket.assignee || '',
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setSaved(true);
      await onSaved();
    } catch (error) {
      setError(
        error.name === 'TimeoutError'
          ? 'ยังยืนยันผลไม่ได้ กรุณารีเฟรช'
          : error.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="assign-box">
      <summary>
        ผู้รับผิดชอบ: {ticket.assignee || 'ยังไม่มอบหมาย'}
      </summary>
      <form onSubmit={save}>
        <label>
          ชื่อพนักงาน
          <input
            maxLength={80}
            disabled={busy}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            placeholder="กรอกชื่อ หรือเว้นว่างเพื่อยกเลิก"
          />
        </label>
        <button disabled={busy}>
          {busy ? 'กำลังบันทึก…' : 'บันทึกผู้รับผิดชอบ'}
        </button>
        {error && (
          <small role="alert" className="notify-error">
            {error}
          </small>
        )}
        {saved && <small role="status">บันทึกแล้ว</small>}
      </form>
    </details>
  );
}
