import {connectDB} from './db.js';
import {Ticket,Customer,Message} from './models.js';
import {baseMatch,escapeRegex} from './ticket-filters.js';
export function ticketPipeline(f={}){
 const pipeline=[{$match:baseMatch(f)},{$lookup:{from:Customer.collection.name,localField:'customer',foreignField:'_id',as:'customer'}},{$set:{customer:{$arrayElemAt:['$customer',0]}}}];
 if(f.q){
 const regex=escapeRegex(f.q.replace(/^#/,''));
 pipeline.push({$lookup:{from:Message.collection.name,let:{ticketId:'$_id'},pipeline:[{$match:{$expr:{$eq:['$ticket','$$ticketId']},text:{$regex:regex,$options:'i'}}},{$limit:1},{$project:{_id:1}}],as:'matchedMessages'}});
 pipeline.push({$match:{$or:[{text:{$regex:regex,$options:'i'}},{'customer.displayName':{$regex:regex,$options:'i'}},{lineUserId:{$regex:regex,$options:'i'}},{'matchedMessages.0':{$exists:true}},{$expr:{$regexMatch:{input:{$toString:'$_id'},regex,options:'i'}}}]}});
 pipeline.push({$unset:'matchedMessages'});
 }
 return pipeline;
}
export async function listTickets(page=1,filters={}){
 await connectDB();const [r]=await Ticket.aggregate([...ticketPipeline(filters),{$facet:{tickets:[{$sort:{lastMessageAt:-1,eventAt:-1,_id:-1}},{$skip:(page-1)*25},{$limit:25}],total:[{$count:'count'}]}}]).option({maxTimeMS:8000});
 return JSON.parse(JSON.stringify({tickets:r.tickets,total:r.total[0]?.count||0,page,pageSize:25}));
}
export async function exportTickets(filters){
 await connectDB();const rows=await Ticket.aggregate([...ticketPipeline(filters),{$sort:{eventAt:-1,_id:-1}},{$limit:10001}]).option({maxTimeMS:15000});
 if(rows.length>10000)throw new Error('เกิน 10,000 รายการ กรุณาเลือกช่วงวันที่ให้สั้นลง');
 return rows;
}
