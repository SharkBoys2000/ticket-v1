import { Customer } from './models.js';
import { connectDB } from './db.js';
export async function fetchLineProfile(record, fetcher = fetch) {
  if (!record.lineUserId || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return null;
  const uid = encodeURIComponent(record.lineUserId);
  let path = '/v2/bot/profile/' + uid;
  if (record.sourceType === 'group' && record.groupId)
    path = '/v2/bot/group/' + encodeURIComponent(record.groupId) + '/member/' + uid;
  if (record.sourceType === 'room' && record.roomId)
    path = '/v2/bot/room/' + encodeURIComponent(record.roomId) + '/member/' + uid;
  try {
    const response = await fetcher('https://api.line.me' + path, {
      headers: { Authorization: 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN },
      cache: 'no-store', signal: AbortSignal.timeout(3000), redirect: 'error',
    });
    if (!response.ok) return null;
    const profile = await response.json();
    if (profile.userId !== record.lineUserId || typeof profile.displayName !== 'string' || !profile.displayName.trim()) return null;
    return { displayName: profile.displayName, pictureUrl: typeof profile.pictureUrl === 'string' ? profile.pictureUrl : null };
  } catch { return null; }
}
export async function refreshCustomerProfile(record) {
  const profile = await fetchLineProfile(record);
  if (!profile) return false;
  try {
    await connectDB();
    const result = await Customer.updateOne({ lineUserId: record.lineUserId }, { $set: profile });
    return result.matchedCount > 0;
  } catch { return false; }
}
