import mongoose from 'mongoose';
import {authorize} from '../../../../../lib/auth.js';
import {connectDB} from '../../../../../lib/db.js';
import {Ticket,Message} from '../../../../../lib/models.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request,{params}){
 const denied=authorize(request);if(denied)return denied;
 const {id}=await params;if(!mongoose.isObjectIdOrHexString(id))return Response.json({error:'Invalid ID'},{status:400});
 const page=Number(new URL(request.url).searchParams.get('page')||'1');if(!Number.isSafeInteger(page)||page<1||page>100000)return Response.json({error:'Invalid page'},{status:400});
 try{await connectDB();const ticket=await Ticket.findById(id).lean();if(!ticket)return Response.json({error:'Not found'},{status:404});
 const target=ticket.mergedInto||ticket._id;
 const [messages,total]=await Promise.all([Message.find({ticket:target}).sort({eventAt:1,_id:1}).skip((page-1)*50).limit(50).lean(),Message.countDocuments({ticket:target})]);
 return Response.json({messages,total,page,pageSize:50},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'โหลดบทสนทนาไม่สำเร็จ'},{status:503});}
}
