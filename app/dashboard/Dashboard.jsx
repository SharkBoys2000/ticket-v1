'use client';

import AssigneeEditor from './AssigneeEditor.jsx';
import Analytics from './Analytics.jsx';
import { statusLabels } from '../../lib/status-message.js';
import ConversationHistory from './ConversationHistory.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import StatusEditor from './StatusEditor.jsx';

export default function Dashboard({
  initialData = null,
  initialError = '',
  today,
}) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const emptyFilters = {
    q: '',
    status: '',
    assignee: '',
    from: '',
    to: '',
  };
  const [draft, setDraft] = useState(emptyFilters);
  const [filterQuery, setFilterQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [updated, setUpdated] = useState(null);
  const active = useRef(null);
  const generation = useRef(0);

  const refresh = useCallback(
    async (background = false) => {
      if (background === true && active.current) return;

      const version = ++generation.current;
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      setLoading(true);
      const timeout = setTimeout(
        () =>
          controller.abort(
            new DOMException('Request timed out', 'TimeoutError'),
          ),
        15000,
      );

      try {
        const response = await fetch(
          '/api/tickets?page=' + page + '&' + filterQuery,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          throw new Error(
            'โหลดรายการไม่สำเร็จ กรุณาตรวจสอบการเข้าสู่ระบบหรือฐานข้อมูล',
          );
        }

        const result = await response.json();
        if (version === generation.current) {
          setData(result);
          setUpdated(new Date());
          setError('');
        }
      } catch (error) {
        if (error.name !== 'AbortError' && version === generation.current) {
          setError(
            error.name === 'TimeoutError'
              ? 'โหลดข้อมูลนานเกินไป กรุณากดรีเฟรชเพื่อลองใหม่'
              : error.message,
          );
        }
      } finally {
        clearTimeout(timeout);
        if (version === generation.current) {
          active.current = null;
          setLoading(false);
        }
      }
    },
    [page, filterQuery],
  );

  useEffect(() => {
    if (page !== 1) setData(null);
    refresh();
    const timer = setInterval(() => refresh(true), 10000);

    return () => {
      clearInterval(timer);
      generation.current++;
      active.current?.abort();
    };
  }, [refresh]);

  async function download() {
    setExporting(true);
    setError('');

    try {
      const response = await fetch(
        '/api/tickets/export?' + filterQuery,
        {
          cache: 'no-store',
          signal: AbortSignal.timeout(60000),
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tickets-' + today + '.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(
        error.name === 'TimeoutError'
          ? 'ส่งออกใช้เวลานาน กรุณาลดช่วงวันที่'
          : error.message,
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <main>
      <nav className="main-nav">
        <a href="/dashboard" aria-current="page">
          คำร้องและรายงาน
        </a>
        <a href="/guides">คู่มือการแก้ปัญหา</a>
      </nav>
      <header>
        <div>
          <span className="eyebrow">LINE OFFICIAL ACCOUNT / SUPPORT</span>
          <h1>
            ศูนย์ดูแลคำร้อง<span className="dot">●</span>
          </h1>
          <p>Ticket V1 · ติดตามทุกเรื่องจากลูกค้า LINE</p>
          <span className="today-date">
            {new Date(today + 'T12:00:00+07:00').toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'Asia/Bangkok',
            })}
          </span>
        </div>
        <button onClick={refresh} disabled={loading}>
          {loading ? 'กำลังโหลด…' : 'รีเฟรชข้อมูล'}
        </button>
      </header>
      <Analytics today={today} />
      <section className="summary">
        <div>
          <small>รายการที่ค้นพบ</small>
          <strong>{data?.total ?? '—'}</strong>
        </div>
        <div>
          <small>การอัปเดต</small>
          <b>ทุก 10 วินาที</b>
        </div>
        <div>
          <small>อัปเดตล่าสุด</small>
          <b>{updated?.toLocaleTimeString('th-TH') ?? '—'}</b>
        </div>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section className="panel">
        <div className="panel-title">
          <h2>ค้นหาและจัดการคำร้อง</h2>
          <span>เรียงตามเวลาข้อความล่าสุด</span>
        </div>
        <form
          className="ticket-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setFilterQuery(new URLSearchParams(draft).toString());
          }}
        >
          <label className="search-field">
            ค้นหาคำร้อง
            <input
              maxLength={100}
              value={draft.q}
              onChange={(event) =>
                setDraft({ ...draft, q: event.target.value })
              }
              placeholder="ชื่อ LINE เลขคำร้อง หรือข้อความ"
            />
          </label>
          <label>
            สถานะ
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value })
              }
            >
              <option value="">ทั้งหมด</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            ผู้รับผิดชอบ
            <input
              maxLength={80}
              disabled={draft.assignee === '__unassigned'}
              value={
                draft.assignee === '__unassigned' ? '' : draft.assignee
              }
              onChange={(event) =>
                setDraft({ ...draft, assignee: event.target.value })
              }
              placeholder="ชื่อพนักงาน (ตรงชื่อ)"
            />
          </label>
          <label className="unassigned-check">
            <input
              type="checkbox"
              checked={draft.assignee === '__unassigned'}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  assignee: event.target.checked ? '__unassigned' : '',
                })
              }
            />
            ยังไม่มอบหมาย
          </label>
          <label>
            เปิดเรื่องตั้งแต่
            <input
              type="date"
              value={draft.from}
              onChange={(event) =>
                setDraft({ ...draft, from: event.target.value })
              }
            />
          </label>
          <label>
            ถึงวันที่
            <input
              type="date"
              min={draft.from || undefined}
              value={draft.to}
              onChange={(event) =>
                setDraft({ ...draft, to: event.target.value })
              }
            />
          </label>
          <div className="form-actions">
            <button type="submit">ค้นหา</button>
            <button
              type="button"
              onClick={() => {
                setDraft(emptyFilters);
                setPage(1);
                setFilterQuery('');
              }}
            >
              ล้างตัวกรอง
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={download}
            >
              {exporting ? 'กำลังส่งออก…' : 'ดาวน์โหลด Excel'}
            </button>
          </div>
          <small className="filter-note">
            ตัวกรองใช้กับรายการคำร้องและ Excel · Excel ส่งออกครบทุกหน้าตามผลค้นหา
            สูงสุด 10,000 รายการ · กราฟด้านบนเลือกช่วงเวลาแยกกัน
          </small>
        </form>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>เลขคำร้อง / วันที่เปิดเรื่อง</th>
                <th>ลูกค้า LINE</th>
                <th>ข้อความ / รูปภาพ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {data?.tickets.map((ticket) => (
                <tr key={ticket._id}>
                  <td>
                    <code title={ticket._id}>#{ticket._id.slice(-8)}</code>
                    <small>
                      {new Date(ticket.eventAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'Asia/Bangkok',
                      })}
                    </small>
                    <small>
                      {new Date(ticket.eventAt).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Bangkok',
                      })}{' '}
                      น.
                    </small>
                  </td>
                  <td>
                    <b>{ticket.customer?.displayName || 'ลูกค้า LINE'}</b>
                    <details className="customer-details">
                      <summary>ข้อมูลลูกค้า</summary>
                      <small className="user-id">
                        {ticket.lineUserId || 'ไม่ระบุ User ID'}
                      </small>
                    </details>
                  </td>
                  <td className="message">
                    {ticket.messageType === 'text'
                      ? ticket.text
                      : ticket.messageType === 'image'
                        ? ticket.image?.provider === 'line'
                          ? (
                              <a
                                href={'/api/tickets/' + ticket._id + '/image'}
                                target="_blank"
                                rel="noreferrer"
                              >
                                เปิดรูปภาพ ↗
                              </a>
                            )
                          : 'รูปภาพจากแหล่งภายนอก (เก็บ Metadata แล้ว)'
                        : '[' + ticket.messageType + ']'}
                    <ConversationHistory ticket={ticket} />
                  </td>
                  <td>
                    <AssigneeEditor
                      key={ticket._id + (ticket.assignee || '')}
                      ticket={ticket}
                      onSaved={refresh}
                    />
                    <span className={'status-badge ' + ticket.status}>
                      {statusLabels[ticket.status]}
                    </span>
                    <details className="manage-ticket">
                      <summary>จัดการและแจ้งลูกค้า</summary>
                      <StatusEditor
                        key={
                          ticket._id + (ticket.notification?.key || '')
                        }
                        ticket={ticket}
                        onSaved={refresh}
                      />
                    </details>
                  </td>
                </tr>
              ))}
              {!data && (
                <tr>
                  <td colSpan="4" className="empty">
                    {loading
                      ? 'กำลังโหลด Ticket…'
                      : 'ยังโหลดข้อมูลไม่ได้ กดรีเฟรชเพื่อลองใหม่'}
                  </td>
                </tr>
              )}
              {data?.tickets.length === 0 && (
                <tr>
                  <td colSpan="4" className="empty">
                    ไม่พบคำร้องที่ตรงกับตัวกรอง ลองเปลี่ยนคำค้นหรือช่วงวันที่
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer>
          <span>
            หน้า {page} / {Math.max(1, Math.ceil((data?.total ?? 0) / 25))} · 25
            รายการต่อหน้า
          </span>
          <div>
            <button
              disabled={page === 1 || loading}
              onClick={() => setPage((currentPage) => currentPage - 1)}
            >
              ก่อนหน้า
            </button>
            <button
              disabled={!data || loading || page * 25 >= data.total}
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              ถัดไป
            </button>
          </div>
        </footer>
      </section>
      <p className="footnote">
        เวลารายการแสดงตามประเทศไทย · ข้อความต่อเนื่องรวมในเรื่องเดิม · พิมพ์
        “แจ้งเรื่องใหม่” ใน LINE เพื่อแยกเรื่อง
      </p>
    </main>
  );
}
