import mongoose from 'mongoose';
import { connectDB } from '../../../../../lib/db.js';
import { Ticket, Message } from '../../../../../lib/models.js';
import { authorize } from '../../../../../lib/auth.js';
export const runtime = 'nodejs';
export async function GET(request, { params }) {
  const denied = authorize(request); if (denied) return denied;
  const { id } = await params;
  if (!mongoose.isObjectIdOrHexString(id)) return new Response('Invalid ID', { status: 400 });
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return new Response('Image access is not configured', { status: 503 });
  try {
    await connectDB();
    let ticket = await Ticket.findById(id).lean();
    const event = new URL(request.url).searchParams.get('event');
    if (event && ticket) ticket = await Message.findOne({ _id: event, ticket: ticket.mergedInto || ticket._id }).lean();
    if (!ticket || ticket.messageType !== 'image') return new Response('Not found', { status: 404 });
    // Avoid fetching arbitrary URLs. Preserve external-provider metadata only.
    if (ticket.image?.provider !== 'line') return new Response('External images are not supported in V1', { status: 422 });
    const upstream = await fetch('https://api-data.line.me/v2/bot/message/' + encodeURIComponent(ticket.messageId) + '/content', {
      headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!upstream.ok) return new Response('Image unavailable or expired at LINE', { status: [404, 410].includes(upstream.status) ? 410 : 502 });
    const type = upstream.headers.get('content-type')?.split(';')[0];
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type)) return new Response('Unsupported format', { status: 415 });
    return new Response(upstream.body, { headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response('Image service unavailable', { status: 503 }); }
}
