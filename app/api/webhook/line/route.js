import {after} from 'next/server.js';
import {refreshCustomerProfile} from '../../../../lib/line-profile.js';
import {receiveMessage} from '../../../../lib/receive-ticket.js';
import {connectDB} from '../../../../lib/db.js';
import {verifySignature,payloadSchema,parseMessage} from '../../../../lib/line.js';
export const runtime='nodejs';
export async function POST(request){
 const secret=process.env.LINE_CHANNEL_SECRET;if(!secret)return Response.json({error:'Webhook not configured'},{status:503});
 const raw=Buffer.from(await request.arrayBuffer());
 if(!verifySignature(raw,request.headers.get('x-line-signature'),secret))return Response.json({error:'Invalid signature'},{status:401});
 let entries;
 try{entries=payloadSchema.parse(JSON.parse(raw.toString('utf8'))).events.map(event=>({record:parseMessage(event),replyToken:event.replyToken})).filter(e=>e.record);}
 catch{return Response.json({error:'Invalid payload'},{status:400});}
 if(!entries.length)return Response.json({ok:true});
 try{
 await connectDB();
 // Intake is silent. Customer notifications are sent only by staff actions in the dashboard.
 for(const e of entries)await receiveMessage(e.record);
 after(async()=>{

 const users=[...new Map(entries.filter(e=>e.record.lineUserId).map(e=>[e.record.lineUserId,e.record])).values()];
 for(let i=0;i<users.length;i+=4)await Promise.all(users.slice(i,i+4).map(refreshCustomerProfile));
 });return Response.json({ok:true});
 }catch{console.error('LINE webhook database write failed');return Response.json({error:'Temporary storage failure'},{status:503});}
}
