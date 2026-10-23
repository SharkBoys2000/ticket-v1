import {randomUUID} from 'node:crypto';
import {Conversation} from './models.js';
export const conversationKey=r=>[r.sourceType,r.groupId||r.roomId||'-',r.lineUserId||r.webhookEventId||String(r._id)].join(':');
export async function withConversation(key,action){
 try{await Conversation.updateOne({_id:key},{$setOnInsert:{lockUntil:new Date(0)}},{upsert:true});}catch(e){if(e.code!==11000)throw e;}
 const owner=randomUUID();let acquired=false;
 for(let i=0;i<30;i++){
 const doc=await Conversation.findOneAndUpdate({_id:key,lockUntil:{$lte:new Date()}},{$set:{lockOwner:owner,lockUntil:new Date(Date.now()+45000)}},{new:true}).lean();
 if(doc){acquired=true;break;}await new Promise(r=>setTimeout(r,100));}
 if(!acquired)throw new Error('Conversation busy; retry');
 try{return await action();}finally{await Conversation.updateOne({_id:key,lockOwner:owner},{$set:{lockUntil:new Date(0)},$unset:{lockOwner:1}});}
}
