import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {connectDB} from '../lib/db.js';
import {Ticket,Message,Customer,Conversation} from '../lib/models.js';
import {receiveMessage} from '../lib/receive-ticket.js';
import {conversationKey} from '../lib/conversations.js';
process.loadEnvFile('.env.local');
const uid='TEST_CONVERSATION_'+crypto.randomUUID();let seq=0;
const base=Date.now();
const record=(text,extra={})=>({webhookEventId:uid+'-'+(++seq),lineUserId:uid,sourceType:'user',messageId:String(seq),messageType:'text',text,eventAt:new Date(base+seq*1000),...extra});
try {
 await connectDB();await Message.createIndexes();
 const first=record('แจ้งปัญหาครับ'),second=record('แจ้งปัญหาครับ');
 const [a,b]=await Promise.all([receiveMessage(first),receiveMessage(second)]);
 assert.equal(String(a.ticketId),String(b.ticketId));
 const image=record('',{messageType:'image',image:{provider:'line'}});
 const c=await receiveMessage(image);assert.equal(String(c.ticketId),String(a.ticketId));
 await receiveMessage(first);
 assert.equal(await Message.countDocuments({lineUserId:uid}),3);
 assert.equal((await Ticket.findById(a.ticketId)).messageCount,3);
 const duplicates=await Message.countDocuments({lineUserId:uid,duplicateOf:{$ne:null}});assert.equal(duplicates,1);
 const separate=await receiveMessage(record('แจ้งเรื่องใหม่'));assert.notEqual(String(separate.ticketId),String(a.ticketId));
 const next=await receiveMessage(record('อีกปัญหาหนึ่ง'));assert.equal(String(next.ticketId),String(separate.ticketId));
 await Ticket.updateOne({_id:separate.ticketId},{$set:{status:'Resolved'}});
 const afterClose=await receiveMessage(record('เรื่องถัดไป'));assert.notEqual(String(afterClose.ticketId),String(a.ticketId));assert.notEqual(String(afterClose.ticketId),String(separate.ticketId));
 await receiveMessage(first);assert.equal(String((await Conversation.findById(conversationKey(first))).activeTicket),String(afterClose.ticketId));
 const group=await receiveMessage(record('คนเดิมอีกห้อง',{sourceType:'group',groupId:'TEST_GROUP'}));assert.notEqual(String(group.ticketId),String(afterClose.ticketId));
 const anon1=await receiveMessage(record('anon',{lineUserId:null})),anon2=await receiveMessage(record('anon',{lineUserId:null}));assert.notEqual(String(anon1.ticketId),String(anon2.ticketId));
 console.log('PASS: concurrent messages grouped; duplicate retained; image retained; redelivery idempotent; explicit new issue; closed issue creates new; scope isolated; anonymous isolated. No LINE messages sent.');
} finally {
 await Message.deleteMany({webhookEventId:{$regex:'^'+uid}});
 await Ticket.deleteMany({webhookEventId:{$regex:'^'+uid}});
 await Customer.deleteMany({lineUserId:uid});
 await Conversation.deleteMany({_id:{$regex:uid}});
 await mongoose.disconnect();
}
