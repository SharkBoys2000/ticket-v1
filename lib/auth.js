import { createHash, timingSafeEqual } from 'node:crypto';
const digest = value => createHash('sha256').update(value).digest();
export function authorize(request) {
  const user = process.env.DASHBOARD_USER, password = process.env.DASHBOARD_PASSWORD;
  if (!user || !password) return Response.json({ error: 'Dashboard credentials not configured' }, { status: 503 });
  const header = request.headers.get('authorization') ?? '';
  const decoded = header.startsWith('Basic ') ? Buffer.from(header.slice(6), 'base64').toString('utf8') : '';
  if (!timingSafeEqual(digest(decoded), digest(user + ':' + password)))
    return new Response('Authentication required', { status: 401, headers: {
      'WWW-Authenticate': 'Basic realm="Ticket V1", charset="UTF-8"', 'Cache-Control': 'no-store',
    } });
  return null;
}
