import { headers } from 'next/headers';
import { authorize } from '../../lib/auth.js';
import { listTickets } from '../../lib/tickets.js';
import Dashboard from './Dashboard.jsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const denied = authorize({ headers: await headers() });
  if (denied) return <main>กรุณาเข้าสู่ระบบเพื่อดู Ticket</main>;

  let initialData = null;
  let initialError = '';

  try {
    initialData = await listTickets(1);
  } catch {
    initialError = 'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบฐานข้อมูลแล้วรีเฟรช';
  }

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return (
    <Dashboard
      today={today}
      initialData={initialData}
      initialError={initialError}
    />
  );
}
