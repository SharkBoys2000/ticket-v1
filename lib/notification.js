export { statusLabels, statusMessage } from './status-message.js';
export async function pushStatus(notification, fetcher = fetch) {
  const response = await fetcher('https://api.line.me/v2/bot/message/push', {
    method: 'POST', headers: {
      Authorization: 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN,
      'Content-Type': 'application/json', 'X-Line-Retry-Key': notification.key,
    },
    body: JSON.stringify({ to: notification.to, messages: [{ type: 'text', text: notification.text }] }),
    signal: AbortSignal.timeout(10000), redirect: 'error',
  });
  if (response.ok || (response.status === 409 && response.headers.get('x-line-accepted-request-id'))) return;
  throw new Error('LINE ไม่รับข้อความ (HTTP ' + response.status + ') กรุณาตรวจ Token หรือโควตาข้อความ');
}
