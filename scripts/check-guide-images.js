import assert from 'node:assert/strict';import sharp from 'sharp';import mongoose from 'mongoose';import {Guide} from '../lib/guide-model.js';import {connectDB} from '../lib/db.js';
process.loadEnvFile('.env.local');const base='http://127.0.0.1:3000',marker='TEST_IMAGE_'+crypto.randomUUID(),headers={Authorization:'Basic '+Buffer.from(process.env.DASHBOARD_USER+':'+process.env.DASHBOARD_PASSWORD).toString('base64'),Origin:process.env.APP_ORIGIN,'Content-Type':'application/json'};
let id;const body={title:marker,category:'test',symptom:'test',steps:'test',verification:''};
async function request(path,method,body,status=200){const r=await fetch(base+path,{method,headers,body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d;}
try{
 const png=await sharp({create:{width:20,height:20,channels:3,background:'#13755b'}}).png().toBuffer();
 const image={dataUrl:'data:image/png;base64,'+png.toString('base64'),caption:'ขั้นตอนที่ 1',name:'test.png'};
 const created=await request('/api/guides','POST',{...body,images:[image]},201);id=created.guide._id;let meta=created.guide.images[0];assert(!meta.data);
 const url=base+'/api/guides/'+id+'/images/'+meta.id;let r=await fetch(url,{headers});assert.equal(r.status,200);const info=await sharp(Buffer.from(await r.arrayBuffer())).metadata();assert.equal(info.format,'webp');assert.equal(info.width,20);
 assert.equal((await fetch(url)).status,401);
 const list=await (await fetch(base+'/api/guides?q='+marker,{headers})).json();assert.equal(list.guides[0].images.length,1);assert(!list.guides[0].images[0].data);
 const edited=await request('/api/guides/'+id,'PATCH',{...body,revision:1,images:[{...meta,caption:'เปลี่ยนคำอธิบาย'}]});assert.equal(edited.guide.images[0].caption,'เปลี่ยนคำอธิบาย');
 await request('/api/guides/'+id,'PATCH',{...body,revision:2,images:[{id:'not-owned',caption:''}]},400);
 await request('/api/guides','POST',{...body,images:[{...image,dataUrl:'data:image/png;base64,YWJj'}]},400);
 await request('/api/guides','POST',{...body,images:Array(7).fill(image)},400);
 await request('/api/guides/'+id,'PATCH',{...body,revision:2,images:[]});assert.equal((await fetch(url,{headers})).status,404);
 assert.equal((await fetch(base+'/guides',{headers})).status,200);
 console.log('PASS: image create/read/decode; private access; metadata listing; caption edit; invalid/reference/count rejection; image removal; guide page compiles.');
}finally{await connectDB();await Guide.deleteMany({title:marker});await mongoose.disconnect();}
