import {Customer,Ticket,Message,Conversation} from './models.js';
import {conversationKey,withConversation} from './conversations.js';
export const isNewIssue=r=>r.messageType==='text'&&r.text.trim()==='แจ้งเรื่องใหม่';
export async function refreshSummary(id){
 const [count,last]=await Promise.all([Message.countDocuments({ticket:id}),Message.findOne({ticket:id}).sort({eventAt:-1,_id:-1}).lean()]);
 if(last)await Ticket.updateOne({_id:id},{$set:{messageCount:count,lastMessageAt:last.eventAt}});
}
export async function receiveMessage(record){
 const key=conversationKey(record);
 return withConversation(key,async()=>{
 const existing=await Message.findById(record.webhookEventId).lean();
 if(existing){
 await refreshSummary(existing.ticket);
 await Conversation.updateOne({_id:key,$or:[{lastEventAt:{$exists:false}},{lastEventAt:{$lt:existing.eventAt}}]},{$set:{activeTicket:existing.ticket,lastEventAt:existing.eventAt}});
 return {ticketId:existing.ticket,created:false};
 }
 let customer=null;
 if(record.lineUserId){
 const filter={lineUserId:record.lineUserId},update={$min:{firstSeenAt:record.eventAt},$max:{lastSeenAt:record.eventAt}};
 try{customer=await Customer.findOneAndUpdate(filter,update,{upsert:true,new:true});}
 catch(e){if(e.code!==11000)throw e;customer=await Customer.findOneAndUpdate(filter,update,{new:true});}
 }
 const previous=record.messageType==='text'?await Message.findOne({conversationKey:key,messageType:'text',text:record.text,eventAt:{$gte:new Date(record.eventAt.getTime()-30000),$lte:record.eventAt}}).sort({eventAt:-1}).lean():null;
 const conversation=await Conversation.findById(key).lean();
 let ticket=await Ticket.findOne({webhookEventId:record.webhookEventId,mergedInto:null}).lean();
 let created=Boolean(ticket);
 const repeatedCommand=isNewIssue(record)&&await Message.exists({conversationKey:key,isNewIssueCommand:true,eventAt:{$gte:new Date(record.eventAt.getTime()-30000),$lte:new Date(record.eventAt.getTime()+30000)}});
 if(!ticket&&(!isNewIssue(record)||repeatedCommand)){
 if(conversation?.activeTicket)ticket=await Ticket.findOne({_id:conversation.activeTicket,mergedInto:null,status:{$ne:'Resolved'}}).lean();
 if(!ticket&&!conversation?.activeTicket)ticket=await Ticket.findOne({conversationKey:key,mergedInto:null,status:{$ne:'Resolved'}}).sort({eventAt:-1,_id:-1}).lean();
 }
 if(!ticket){
 ticket=await Ticket.findOneAndUpdate({webhookEventId:record.webhookEventId},{$setOnInsert:{...record,customer:customer?._id??null,conversationKey:key,status:'Pending',messageCount:0,lastMessageAt:record.eventAt}},{upsert:true,new:true,runValidators:true}).lean();created=true;
 }
 await Message.updateOne({_id:record.webhookEventId},{$setOnInsert:{...record,ticket:ticket._id,originalTicket:ticket._id,conversationKey:key,duplicateOf:previous&&String(previous.ticket)===String(ticket._id)?previous._id:null,isNewIssueCommand:isNewIssue(record)}},{upsert:true,runValidators:true});
 if(record.messageType==='text'){
  const following=await Message.findOne({ticket:ticket._id,messageType:'text',text:record.text,eventAt:{$gt:record.eventAt,$lte:new Date(record.eventAt.getTime()+30000)}}).sort({eventAt:1}).lean();
  if(following)await Message.updateOne({_id:following._id},{$set:{duplicateOf:record.webhookEventId}});
 }
 await refreshSummary(ticket._id);
 await Conversation.updateOne({_id:key,$or:[{lastEventAt:{$exists:false}},{lastEventAt:{$lte:record.eventAt}}]},{$set:{activeTicket:ticket._id,lastEventAt:record.eventAt}});
 return {ticketId:ticket._id,created};
 });
}
