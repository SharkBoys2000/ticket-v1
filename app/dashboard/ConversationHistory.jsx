'use client';

import { useEffect, useState } from 'react';

export default function ConversationHistory({ ticket }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let disposed = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    setLoading(true);
    setError('');

    fetch(
      '/api/tickets/' + ticket._id + '/messages?page=' + page,
      {
        cache: 'no-store',
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((result) => {
        if (!disposed) setData(result);
      })
      .catch(() => {
        if (!disposed) {
          setError('โหลดไม่สำเร็จ กรุณาปิดแล้วเปิดบทสนทนาอีกครั้ง');
        }
      })
      .finally(() => {
        clearTimeout(timer);
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, page, ticket._id, ticket.messageCount]);

  return (
    <div className="conversation">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? 'ซ่อนบทสนทนา' : 'ดูบทสนทนา'} ({ticket.messageCount || 1}{' '}
        ข้อความ)
      </button>
      {open && (
        <div className="conversation-body">
          {loading && <small>กำลังโหลดบทสนทนา…</small>}
          {error && <p role="alert">{error}</p>}
          {data?.messages.map((message) => (
            <article
              key={message._id}
              className="conversation-message"
            >
              <small>
                {new Date(message.eventAt).toLocaleString('th-TH', {
                  timeZone: 'Asia/Bangkok',
                })}
              </small>
              <div>
                {message.messageType === 'text'
                  ? message.text
                  : message.messageType === 'image' &&
                      message.image?.provider === 'line'
                    ? (
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={
                            '/api/tickets/' +
                            ticket._id +
                            '/image?event=' +
                            encodeURIComponent(message._id)
                          }
                        >
                          เปิดรูปภาพ ↗
                        </a>
                      )
                    : '[' + message.messageType + ']'}
              </div>
              {message.duplicateOf && (
                <small>
                  ข้อความซ้ำภายใน 30 วินาที (เก็บไว้ในเรื่องเดิม)
                </small>
              )}
              {message.isNewIssueCommand && <small>เริ่มเรื่องใหม่</small>}
            </article>
          ))}
          {data && data.total > 50 && (
            <div>
              <button
                type="button"
                disabled={page === 1 || loading}
                onClick={() => setPage((currentPage) => currentPage - 1)}
              >
                ก่อนหน้า
              </button>{' '}
              หน้า {page}{' '}
              <button
                type="button"
                disabled={page * 50 >= data.total || loading}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
