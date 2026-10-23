import mongoose from 'mongoose';
import {authorizeWrite} from '../../../../../lib/internal-auth.js';
import {connectDB} from '../../../../../lib/db.js';
import {Ticket} from '../../../../../lib/models.js';
export async function PATCH(request,{params}){
 const denied=authorizeWrite(request);if(denied)return denied;const {id}=await params;
 if(!mongoose.isObjectIdOrHexString(id))return Response.json({error:'Invalid ID'},{status:400});
 let body;try{body=await request.json();}catch{return Response.json({error:'Invalid JSON'},{status:400});}
 if(typeof body?.assignee!=='string'||body.assignee.trim().length>80||typeof body.expected!=='string')return Response.json({error:'ชื่อผู้รับผิดชอบยาวไม่เกิน 80 ตัวอักษร'},{status:400});
 try{
 await connectDB();const filter={_id:id,mergedInto:null,assignee:body.expected||{$in:[null,'']}};
 const r=await Ticket.updateOne(filter,{$set:{assignee:body.assignee.trim()}});
 if(!r.matchedCount)return Response.json({error:'รายการถูกเปลี่ยนแล้ว กรุณารีเฟรชก่อนแก้ไข'},{status:409});
 return Response.json({ok:true});
 }catch{return Response.json({error:'บันทึกไม่สำเร็จ'},{status:503});}
}
