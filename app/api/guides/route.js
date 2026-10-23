import {prepareImages,publicGuide} from '../../../lib/guide-images.js';
import {authorize} from '../../../lib/auth.js';
import {authorizeWrite} from '../../../lib/internal-auth.js';
import {connectDB} from '../../../lib/db.js';
import {Guide,guideInput} from '../../../lib/guide-model.js';
import {escapeRegex} from '../../../lib/ticket-filters.js';
export const dynamic='force-dynamic';
export async function GET(request){
 const denied=authorize(request);if(denied)return denied;
 const q=new URL(request.url).searchParams,term=(q.get('q')||'').trim(),page=Number(q.get('page')||1);
 if(term.length>100||!Number.isSafeInteger(page)||page<1||page>10000)return Response.json({error:'Invalid query'},{status:400});
 const filter=term?{$or:['title','category','symptom','steps'].map(k=>({[k]:{$regex:escapeRegex(term),$options:'i'}}))}:{};
 try{await connectDB();const [guides,total]=await Promise.all([Guide.find(filter).select('-images.data').sort({updatedAt:-1,_id:-1}).skip((page-1)*20).limit(20).maxTimeMS(8000).lean(),Guide.countDocuments(filter).maxTimeMS(8000)]);return Response.json({guides,total,page},{headers:{'Cache-Control':'private, no-store'}});}
 catch{return Response.json({error:'โหลดคู่มือไม่สำเร็จ'},{status:503});}
}
export async function POST(request){
 const denied=authorizeWrite(request);if(denied)return denied;
 let body;try{const raw=await request.json();body=guideInput(raw);body.images=await prepareImages(raw.images);}catch(e){return Response.json({error:e.message},{status:400});}
 try{await connectDB();const guide=await Guide.create(body);return Response.json({guide:publicGuide(guide)},{status:201});}
 catch{return Response.json({error:'บันทึกไม่สำเร็จ'},{status:503});}
}
