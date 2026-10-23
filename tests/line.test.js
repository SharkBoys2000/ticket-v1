import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySignature, parseMessage, payloadSchema } from '../lib/line.js';
const secret = 'test-only-secret';
test('signature verifies original bytes and rejects tampering', () => {
  const raw = Buffer.from('{"events":[], "text":"สวัสดี"}');
  const sig = createHmac('sha256', secret).update(raw).digest('base64');
  assert.equal(verifySignature(raw, sig, secret), true);
  assert.equal(verifySignature(Buffer.from(JSON.stringify(JSON.parse(raw))), sig, secret), false);
  assert.equal(verifySignature(raw, sig, 'wrong'), false);
  for (const invalid of [null, '', 'bad', sig + 'junk']) assert.equal(verifySignature(raw, invalid, secret), false);
});
const event = { type: 'message', webhookEventId: 'event-1', timestamp: 1700000000000, source: { type: 'user', userId: 'U123' }, message: { id: '123', type: 'text', text: 'ช่วยตรวจสอบครับ' } };
test('text preserves user, message and occurrence time', () => {
  const result = parseMessage(event); assert.equal(result.lineUserId, 'U123'); assert.equal(result.text, event.message.text); assert.equal(result.eventAt.getTime(), event.timestamp);
});
test('redelivery preserves the idempotency key', () => {
  assert.deepEqual(parseMessage(event), parseMessage({ ...event, deliveryContext: { isRedelivery: true } }));
});
test('image and group without user ID are accepted', () => {
  const result = parseMessage({ ...event, source: { type: 'group', groupId: 'G1' }, message: { id: '456', type: 'image', contentProvider: { type: 'line' } } });
  assert.equal(result.lineUserId, null); assert.equal(result.image.provider, 'line'); assert.equal(result.groupId, 'G1');
});
test('verification and non-message events do not create tickets', () => {
  assert.deepEqual(payloadSchema.parse({ events: [] }).events, []); assert.equal(parseMessage({ type: 'follow' }), null);
});
test('invalid message payload is rejected', () => {
  assert.throws(() => parseMessage({ ...event, webhookEventId: undefined }));
  assert.throws(() => parseMessage({ ...event, message: { id: '1', type: 'text' } }));
});
