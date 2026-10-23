import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { POST } from '../app/api/webhook/line/route.js';
import { GET } from '../app/api/tickets/route.js';
import { PATCH } from '../app/api/tickets/[id]/route.js';
const secret = 'test-only-secret';
process.env.LINE_CHANNEL_SECRET = secret;
process.env.DASHBOARD_USER = 'staff-test';
process.env.DASHBOARD_PASSWORD = 'test-password';
process.env.APP_ORIGIN = 'https://test.example';
delete process.env.MONGODB_URI;
function signed(body, valid = true) {
  return new Request('http://localhost/api/webhook/line', { method: 'POST', body,
    headers: { 'x-line-signature': valid ? createHmac('sha256', secret).update(body).digest('base64') : 'bad' } });
}
const authorization = 'Basic ' + Buffer.from('staff-test:test-password').toString('base64');
test('webhook rejects invalid signature', async () => {
  assert.equal((await POST(signed('{"events":[]}', false))).status, 401);
});
test('signed empty verification succeeds without database', async () => {
  assert.equal((await POST(signed('{"events":[]}'))).status, 200);
});
test('signed malformed JSON and invalid events rejected', async () => {
  for (const raw of ['{', '{"events":null}', '{"events":[{"type":"message"}]}']) assert.equal((await POST(signed(raw))).status, 400);
});
test('message storage failure returns retryable 503', async () => {
  const body = JSON.stringify({ events: [{ type: 'message', webhookEventId: 'event-1', timestamp: 1, source: { type: 'user', userId: 'U1' }, message: { id: '1', type: 'text', text: 'hello' } }] });
  assert.equal((await POST(signed(body))).status, 503);
});
test('ticket API denies unauthenticated requests', async () => {
  assert.equal((await GET(new Request('https://test.example/api/tickets'))).status, 401);
});
test('ticket API validates pagination before querying', async () => {
  assert.equal((await GET(new Request('https://test.example/api/tickets?page=-1', { headers: { authorization } }))).status, 400);
});
test('status update rejects cross-site request', async () => {
  const req = new Request('https://test.example/api/tickets/123', { method: 'PATCH', headers: { authorization, origin: 'https://other.example' }, body: '{"status":"Resolved"}' });
  assert.equal((await PATCH(req, { params: Promise.resolve({ id: '123' }) })).status, 403);
});
test('status update validates enum', async () => {
  const req = new Request('https://test.example/api/tickets/123', { method: 'PATCH', headers: { authorization, origin: 'https://test.example' }, body: '{"status":"Admin"}' });
  assert.equal((await PATCH(req, { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) })).status, 400);
});

