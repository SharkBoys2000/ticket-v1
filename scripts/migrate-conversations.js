import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import mongoose from 'mongoose';
import {connectDB} from '../lib/db.js';
import {Ticket,Message,Conversation} from '../lib/models.js';
import {conversationKey,withConversation} from '../lib/conversations.js';
import {refreshSummary} from '../lib/receive-ticket.js';
process.loadEnvFile('.env.local');
try{
 await connectDB();
 const before=await Ticket.find({}).lean();
 await writeFile('C:/Users/armzu/Documents/Codex/2026-10-23/senior-full-stack-developer-system-architect-2/work/tickets-before-conversation-merge.json',JSON.stringify(before,null,2),{flag:'wx'});
 const sourceId='6adb35ec4c8dd4efea667940',targetId='6adb35ec4c8dd4efea66793f';
 const source=before.find(t=>String(t._id)===sourceId),target=before.find(t=>String(t._id)===targetId);
 assert(source&&target);assert.equal(source.lineUserId,target.lineUserId);assert.equal(source.text,target.text);assert.equal(source.status,'Pending');assert.equal(target.status,'Pending');assert(Math.abs(source.eventAt-target.eventAt)<30000);
 for(const t of before){
  await withConversation(conversationKey(t),async()=>{
   const { _id,createdAt,updatedAt,__v,status,customer,notification,...record}=t;
   await Message.updateOne({_id:t.webhookEventId},{$setOnInsert:{...record,ticket:t.mergedInto||_id,originalTicket:_id,conversationKey:conversationKey(t)}},{upsert:true});
   await Ticket.updateOne({_id},{$set:{conversationKey:conversationKey(t)}});
   await refreshSummary(t.mergedInto||_id);
  });
 }
 await withConversation(conversationKey(target),async()=>{
  await Message.updateMany({ticket:sourceId},{$set:{ticket:targetId,duplicateOf:target.webhookEventId}});
  await Ticket.updateOne({_id:sourceId},{$set:{mergedInto:targetId,mergedAt:new Date()}});
  await refreshSummary(targetId);
  const latest=await Ticket.findOne({conversationKey:conversationKey(target),mergedInto:null}).sort({lastMessageAt:-1,eventAt:-1}).lean();
  await Conversation.updateOne({_id:conversationKey(target)},{$set:{activeTicket:latest._id,lastEventAt:latest.lastMessageAt}});
 });
 await Message.createIndexes();await Ticket.createIndexes();
 assert.equal(await Message.countDocuments({ticket:targetId}),2);
 console.log('Merged ea667940 into ea66793f; originals preserved; history has 2 messages. Visible tickets:',await Ticket.countDocuments({mergedInto:null}));
}finally{await mongoose.disconnect();}
