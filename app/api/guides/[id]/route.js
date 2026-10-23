import {prepareImages,publicGuide} from '../../../../lib/guide-images.js';
import mongoose from 'mongoose';
import {authorizeWrite} from '../../../../lib/internal-auth.js';
import {connectDB} from '../../../../lib/db.js';
import {Guide,guideInput} from '../../../../lib/guide-model.js';
export async function PATCH(request,{params}){
 const denied=authorizeWrite(request);if(denied)return denied;const {id}=await params;
 if(!mongoose.isObjectIdOrHexString(id))return Response.json({error:'Invalid ID'},{status:400});
 let body,fields;try{body=await request.json();fields=guideInput(body);if(!Number.isSafeInteger(body.revision)||body.revision<1)throw new Error('Invalid revision');}catch(e){return Response.json({error:e.message},{status:400});}
 try{await connectDB();const existing=await Guide.findById(id);if(!existing)return Response.json({error:'ไม่พบคู่มือ'},{status:404});
 try{fields.images=await prepareImages(body.images,existing.images||[]);}catch(e){return Response.json({error:e.message},{status:400});}
 const guide=await Guide.findOneAndUpdate({_id:id,revision:body.revision},{$set:fields,$inc:{revision:1}},{returnDocument:'after'});
 if(!guide)return Response.json({error:'คู่มือถูกแก้ไขแล้ว กรุณาเปิดรายการล่าสุดก่อนบันทึกใหม่'},{status:409});
 return Response.json({guide:publicGuide(guide)});}catch{return Response.json({error:'บันทึกไม่สำเร็จ'},{status:503});}
}
