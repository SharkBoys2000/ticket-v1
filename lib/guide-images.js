import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
export function publicGuide(g){const result=g.toObject?g.toObject():g;return {...result,images:(result.images||[]).map(({id,name,caption})=>({id,name,caption}))};}
export async function prepareImages(input,existing=[]){
 if(input===undefined)return existing;
 if(!Array.isArray(input)||input.length>6)throw new Error('เพิ่มได้สูงสุด 6 รูปต่อคู่มือ');
 const result=[];let total=0;const seen=new Set();
 for(const image of input){
 if(!image||typeof image.caption!=='string'||image.caption.length>300)throw new Error('คำอธิบายภาพยาวไม่เกิน 300 ตัวอักษร');
 let item;
 if(image.dataUrl!==undefined){
 if(typeof image.dataUrl!=='string'||image.dataUrl.length>2800000)throw new Error('รูปมีขนาดใหญ่เกิน 2 MB');
 const match=image.dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!match)throw new Error('รองรับเฉพาะ JPG, PNG และ WebP');
 const raw=Buffer.from(match[2],'base64');if(raw.length>2*1024*1024)throw new Error('รูปมีขนาดใหญ่เกิน 2 MB');
 let data;try{data=await sharp(raw,{limitInputPixels:25000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();}catch{throw new Error('เปิดรูปไม่สำเร็จ กรุณาเลือกไฟล์ภาพที่สมบูรณ์');}
 item={id:randomUUID(),name:typeof image.name==='string'?image.name.slice(0,150):'รูปประกอบ',caption:image.caption.trim(),data,mime:'image/webp'};
 }else{
 const old=existing.find(i=>i.id===image.id);if(!old||seen.has(image.id))throw new Error('รูปเดิมไม่ถูกต้อง กรุณาเปิดคู่มือใหม่');
 item={id:old.id,name:old.name,caption:image.caption.trim(),data:old.data,mime:old.mime};seen.add(image.id);
 }
 total+=item.data.length;if(total>5*1024*1024)throw new Error('รูปทั้งหมดต้องไม่เกิน 5 MB');result.push(item);
 }return result;
}
