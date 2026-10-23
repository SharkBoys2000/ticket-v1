import assert from 'node:assert/strict';
process.loadEnvFile('.env.local');
const headers={Authorization:'Basic '+Buffer.from(process.env.DASHBOARD_USER+':'+process.env.DASHBOARD_PASSWORD).toString('base64')};
for(const mode of ['daily','monthly']){
const r=await fetch('http://127.0.0.1:3000/api/reports?mode='+mode+'&year=2026&month=10',{headers,signal:AbortSignal.timeout(30000)});
assert.equal(r.status,200);const d=await r.json();assert.equal(d.buckets.reduce((a,b)=>a+b.tickets,0),d.total);assert.equal(d.total,d.pending+d.inProgress+d.resolved);assert.equal(d.buckets.length,mode==='daily'?31:12);
console.log(mode,JSON.stringify({total:d.total,people:d.people,pending:d.pending,inProgress:d.inProgress,resolved:d.resolved,nonzero:d.buckets.filter(b=>b.tickets)}));
}
for(const [query,status,auth] of [['mode=daily&year=2026&month=13',400,true],['mode=daily&year=2026&month=10',401,false]]){
const r=await fetch('http://127.0.0.1:3000/api/reports?'+query,{headers:auth?headers:{}});assert.equal(r.status,status);}
const r=await fetch('http://127.0.0.1:3000/dashboard',{headers,signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);const html=await r.text();assert(html.includes('ศูนย์ดูแลคำร้อง'));assert(html.includes('ภาพรวมการรับเรื่อง'));assert(!html.includes('Invalid Date'));console.log('PASS dashboard render, report authorization and validation.');
