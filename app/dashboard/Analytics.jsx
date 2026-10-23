'use client';

import { useEffect, useState } from 'react';

const months = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export default function Analytics({ today }) {
  const [mode, setMode] = useState('daily');
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [report, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let disposed = false;
    let active = null;

    setData(null);
    setError('');

    async function load() {
      if (active) return;

      const controller = new AbortController();
      active = controller;
      setBusy(true);
      const timer = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(
          '/api/reports?mode=' +
            mode +
            '&year=' +
            year +
            '&month=' +
            month,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        if (!disposed) {
          setData(result);
          setError('');
        }
      } catch (error) {
        if (!disposed) {
          setError(
            error.name === 'AbortError'
              ? 'โหลดสถิตินานเกินไป กรุณาลองอีกครั้ง'
              : error.message,
          );
        }
      } finally {
        clearTimeout(timer);
        active = null;
        if (!disposed) setBusy(false);
      }
    }

    load();
    const timer = setInterval(load, 30000);

    return () => {
      disposed = true;
      clearInterval(timer);
      active?.abort();
    };
  }, [mode, year, month, retry]);

  const data =
    report?.mode === mode &&
    report?.year === year &&
    report?.month === month
      ? report
      : null;
  const label = (bucket) =>
    mode === 'monthly'
      ? months[Number(bucket.key.slice(5, 7)) - 1]
      : mode === 'weekly'
        ? bucket.label
        : Number(bucket.key.slice(8, 10));
  const period =
    (mode !== 'monthly' ? months[month - 1] + ' ' : 'ปี ') + (year + 543);
  const max = Math.max(
    1,
    ...(data?.buckets || []).flatMap((bucket) => [
      bucket.tickets,
      bucket.people,
    ]),
  );
  const chartWidth = mode === 'daily' ? 980 : 700;

  return (
    <section className="analytics" aria-label="สถิติคำร้อง">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ภาพรวมการรับเรื่อง</span>
          <h2>คำร้องเข้า · {period}</h2>
          <p>ตามวันที่เปิดเรื่องใหม่ · เวลาประเทศไทย</p>
        </div>
        <div className="report-filters">
          <div className="segmented" aria-label="รูปแบบกราฟ">
            <button
              aria-pressed={mode === 'daily'}
              onClick={() => setMode('daily')}
            >
              รายวัน
            </button>
            <button
              aria-pressed={mode === 'weekly'}
              onClick={() => setMode('weekly')}
            >
              รายสัปดาห์
            </button>
            <button
              aria-pressed={mode === 'monthly'}
              onClick={() => setMode('monthly')}
            >
              รายเดือน
            </button>
          </div>
          {mode !== 'monthly' && (
            <label>
              เดือน
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {months.map((monthName, index) => (
                  <option key={monthName} value={index + 1}>
                    {monthName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            ปี พ.ศ.
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {Array.from({ length: 101 }, (_, index) => 2100 - index).map(
                (yearValue) => (
                  <option key={yearValue} value={yearValue}>
                    {yearValue + 543}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}{' '}
          <button onClick={() => setRetry((currentRetry) => currentRetry + 1)}>
            ลองอีกครั้ง
          </button>
        </div>
      )}
      <div className="metric-grid">
        {[
          ['คำร้องในช่วงนี้', data?.total, 'เรื่อง', 'total'],
          ['รอดำเนินการ', data?.pending, 'เรื่อง', 'pending'],
          ['กำลังดำเนินการ', data?.inProgress, 'เรื่อง', 'progress'],
          ['เสร็จสิ้น', data?.resolved, 'เรื่อง', 'done'],
        ].map(([metricLabel, value, unit, style]) => (
          <article className={'metric ' + style} key={metricLabel}>
            <span>{metricLabel}</span>
            <strong>
              {value ?? '—'} <small>{unit}</small>
            </strong>
          </article>
        ))}
      </div>
      <div className="chart-card">
        <div className="chart-title">
          <div>
            <h3>
              แนวโน้มคำร้อง
              {mode === 'daily'
                ? 'รายวัน'
                : mode === 'weekly'
                  ? 'รายสัปดาห์'
                  : 'รายเดือน'}
            </h3>
            <p>
              ผู้แจ้งไม่ซ้ำในช่วงนี้ <b>{data?.people ?? '—'} คน</b>
            </p>
          </div>
          <div className="legend">
            <span>
              <i className="ticket-key" />
              คำร้อง (เรื่อง)
            </span>
            <span>
              <i className="people-key" />
              ผู้แจ้ง (คน)
            </span>
          </div>
        </div>
        {!data && !error ? (
          <div className="chart-placeholder" role="status">
            กำลังโหลดกราฟ…
          </div>
        ) : !data ? (
          <div className="chart-placeholder">ยังไม่มีข้อมูลกราฟ</div>
        ) : (
          <>
            {data.total === 0 && (
              <p className="no-report">ยังไม่มีคำร้องในช่วงที่เลือก</p>
            )}
            <div
              className="chart-scroll"
              tabIndex={0}
              aria-label="กราฟ เลื่อนแนวนอนเพื่อดูครบทุกช่วง"
            >
              <svg
                viewBox={'0 0 ' + chartWidth + ' 260'}
                style={{ minWidth: mode === 'daily' ? 760 : 580 }}
                role="img"
                aria-label={
                  'กราฟ' +
                  period +
                  ' รวม ' +
                  data.total +
                  ' คำร้อง ผู้แจ้ง ' +
                  data.people +
                  ' คน มีตารางตัวเลขด้านล่าง'
                }
              >
                {[0, 0.5, 1].map((ratio) => (
                  <g key={ratio}>
                    <line
                      x1="35"
                      x2={chartWidth - 10}
                      y1={210 - ratio * 175}
                      y2={210 - ratio * 175}
                      stroke="#e4ebe9"
                    />
                    <text
                      x="26"
                      y={215 - ratio * 175}
                      textAnchor="end"
                      fill="#61746e"
                      fontSize="12"
                    >
                      {Number((max * ratio).toFixed(1))}
                    </text>
                  </g>
                ))}
                {data.buckets.map((bucket, index) => {
                  const step = (chartWidth - 50) / data.buckets.length;
                  const x = 40 + index * step;
                  const width = Math.min(17, step * 0.3);
                  const ticketHeight = (bucket.tickets / max) * 175;
                  const peopleHeight = (bucket.people / max) * 175;

                  return (
                    <g key={bucket.key}>
                      <title>
                        {label(bucket)}: {bucket.tickets} คำร้อง, {bucket.people}{' '}
                        คน
                      </title>
                      <rect
                        x={x}
                        y={210 - ticketHeight}
                        width={width}
                        height={ticketHeight}
                        rx="3"
                        fill="#13755b"
                      />
                      <rect
                        x={x + width + 2}
                        y={210 - peopleHeight}
                        width={width}
                        height={peopleHeight}
                        rx="3"
                        fill="#91c6e3"
                      />
                      <text
                        x={x + width}
                        y="235"
                        textAnchor="middle"
                        fill="#61746e"
                        fontSize="12"
                      >
                        {mode === 'monthly'
                          ? label(bucket).slice(0, 3)
                          : label(bucket)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <details className="chart-data">
              <summary>ดูตัวเลขในตาราง</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>
                        {mode === 'daily'
                          ? 'วันที่'
                          : mode === 'weekly'
                            ? 'ช่วงวันที่ (จันทร์–อาทิตย์)'
                            : 'เดือน'}
                      </th>
                      <th>คำร้อง (เรื่อง)</th>
                      <th>ผู้แจ้งไม่ซ้ำ (คน)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.buckets.map((bucket) => (
                      <tr key={bucket.key}>
                        <td>
                          {label(bucket) +
                            ' ' +
                            (mode === 'monthly' ? year + 543 : period)}
                        </td>
                        <td>{bucket.tickets}</td>
                        <td>{bucket.people}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
        <p className="chart-note">
          {mode === 'weekly' &&
            'สัปดาห์จันทร์–อาทิตย์ นับเฉพาะวันที่ในเดือนที่เลือก · '}
          นับคำร้องที่ยังไม่ถูกรวมกับเรื่องอื่น · ผู้แจ้งนับจาก LINE ID ที่ระบุได้
          คนเดิมอาจปรากฏหลายวัน · สถานะเป็นสถานะปัจจุบันของคำร้องในช่วงนี้
        </p>
      </div>
    </section>
  );
}
