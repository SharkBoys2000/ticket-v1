import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
export function verifySignature(raw, signature, secret) {
  if (!secret || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  const actual = Buffer.from(signature, 'base64');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const payloadSchema = z.object({ events: z.array(z.object({ type: z.string() }).passthrough()) });
const eventSchema = z.object({
  type: z.literal('message'), webhookEventId: z.string().min(1),
  timestamp: z.number().int().nonnegative().max(8640000000000000),
  source: z.object({ type: z.enum(['user', 'group', 'room']), userId: z.string().optional(), groupId: z.string().optional(), roomId: z.string().optional() }),
  message: z.object({
    id: z.string().min(1), type: z.string().min(1), text: z.string().optional(),
    contentProvider: z.object({ type: z.enum(['line', 'external']), originalContentUrl: z.string().url().optional(), previewImageUrl: z.string().url().optional() }).optional(),
  }),
});
export function parseMessage(event) {
  if (event.type !== 'message') return null;
  const e = eventSchema.parse(event);
  if (e.message.type === 'text' && typeof e.message.text !== 'string') throw new Error('Missing text');
  return {
    webhookEventId: e.webhookEventId, lineUserId: e.source.userId ?? null,
    sourceType: e.source.type, groupId: e.source.groupId, roomId: e.source.roomId,
    messageId: e.message.id, messageType: e.message.type, text: e.message.text ?? '',
    eventAt: new Date(e.timestamp),
    ...(e.message.type === 'image' ? { image: {
      provider: e.message.contentProvider?.type ?? 'line',
      originalContentUrl: e.message.contentProvider?.originalContentUrl,
      previewImageUrl: e.message.contentProvider?.previewImageUrl,
    } } : {}),
  };
}
