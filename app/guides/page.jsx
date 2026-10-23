import { headers } from 'next/headers';
import { authorize } from '../../lib/auth.js';
import GuideLibrary from './GuideLibrary.jsx';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (authorize({ headers: await headers() })) {
    return <main>กรุณาเข้าสู่ระบบ</main>;
  }

  return <GuideLibrary />;
}
