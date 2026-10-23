import mongoose from 'mongoose';
import {authorize} from '../../../../../../lib/auth.js';
import {connectDB} from '../../../../../../lib/db.js';
import {Guide} from '../../../../../../lib/guide-model.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request,{params}){
 const denied=authorize(request);if(denied)return denied;
 const {id,imageId}=await params;if(!mongoose.isObjectIdOrHexString(id))return new Response('Not found',{status:404});
 try{await connectDB();const g=await Guide.findOne({_id:id,'images.id':imageId},{images:{$elemMatch:{id:imageId}}});
 const img=g?.images?.[0];if(!img)return new Response('Not found',{status:404});
 return new Response(new Uint8Array(img.data),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Image unavailable',{status:503});}
}
