import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import {connectDB} from '../lib/db.js';
import {Ticket,Customer,Message} from '../lib/models.js';
import {Guide} from '../lib/guide-model.js';
import {escapeRegex,parseFilters,baseMatch} from '../lib/ticket-filters.js';
process.loadEnvFile('.env.local');
const marker='TEST_FEATURE_'+crypto.randomUUID(),base='http://127.0.0.1:3000';
const headers={Authorization:'Basic '+Buffer.from(process.env.DASHBOARD_USER+':'+process.env.DASHBOARD_PASSWORD).toString('base64'),'Content-Type':'application/json',Origin:process.env.APP_ORIGIN};
let ticket,guideId,customer;
async function req(path,method='GET',body,expected=200){
 const r=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 const text=await r.text();assert.equal(r.status,expected,path+' '+text.slice(0,150));return text?JSON.parse(text):null;
}
try{
 assert.equal(escapeRegex('a.*[x]'),'a\\.\\*\\[x\\]');
 assert.throws(()=>parseFilters(new URLSearchParams('from=2026-02-30')));
 assert.equal(baseMatch({to:'2026-10-23'}).eventAt.$lt.toISOString(),'2026-10-23T17:00:00.000Z');
 await connectDB();customer=await Customer.create({lineUserId:marker,displayName:marker,firstSeenAt:new Date(),lastSeenAt:new Date()});
 ticket=await Ticket.create({webhookEventId:marker,customer:customer._id,lineUserId:marker,sourceType:'user',messageId:marker,messageType:'text',text:'=SUM(1,2)',eventAt:new Date('2026-10-23T01:00:00Z'),status:'Pending'});
 await Message.create({_id:marker,ticket:ticket._id,conversationKey:marker,text:marker+' followup',messageType:'text',eventAt:new Date()});
 const query=new URLSearchParams({q:marker,from:'2026-10-23',to:'2026-10-23',status:'Pending'}).toString();
 assert.equal((await req('/api/tickets?'+query)).total,1);
 assert.equal((await req('/api/tickets?q='+encodeURIComponent(marker+' followup'))).total,1);
 assert.equal((await req('/api/tickets?q='+String(ticket._id).slice(-8))).total,1);
 await req('/api/tickets/'+ticket._id+'/assignee','PATCH',{assignee:marker,expected:''});
 await req('/api/tickets/'+ticket._id+'/assignee','PATCH',{assignee:'wrong',expected:''},409);
 assert.equal((await req('/api/tickets?assignee='+marker)).total,1);
 const response=await fetch(base+'/api/tickets/export?'+query+'&assignee='+marker,{headers});assert.equal(response.status,200);
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(await response.arrayBuffer()));
 assert.equal(wb.getWorksheet('คำร้อง').rowCount,2);assert.equal(wb.getWorksheet('คำร้อง').getCell('D2').value,'=SUM(1,2)');assert.equal(wb.getWorksheet('คำร้อง').getCell('F2').value,marker);
 const input={title:marker,category:'ทดสอบ',symptom:'อาการ',steps:'1. ตรวจสอบ\n2. แก้ไข',verification:'ตรวจผล'};
 const created=await req('/api/guides','POST',input,201);guideId=created.guide._id;
 assert.equal((await req('/api/guides?q='+marker)).total,1);
 await req('/api/guides/'+guideId,'PATCH',{...input,steps:'แก้ไขขั้นตอนแล้ว',revision:1});
 await req('/api/guides/'+guideId,'PATCH',{...input,revision:1},409);
 assert.equal((await req('/api/guides?q='+marker)).guides[0].revision,2);
 for(const path of ['/api/guides','/api/tickets/export','/guides'])assert.equal((await fetch(base+path)).status,401);
 assert.equal((await fetch(base+'/api/guides',{method:'POST',headers:{...headers,Origin:'https://wrong.example'},body:JSON.stringify(input)})).status,403);
 for(const path of ['/dashboard','/guides'])assert.equal((await fetch(base+path,{headers})).status,200);
 console.log('PASS: name/ID/history/date/status search; assignee save/conflict; XLSX readback including literal formula text; guide create/search/edit/conflict; auth/origin; pages render. No LINE messages sent.');
}finally{
 if(ticket)await Ticket.deleteOne({_id:ticket._id});
 if(customer)await Customer.deleteOne({_id:customer._id});
 await Message.deleteOne({_id:marker});
 if(guideId)await Guide.deleteOne({_id:guideId});
 await mongoose.disconnect();
}
