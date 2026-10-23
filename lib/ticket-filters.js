export const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function parseFilters(q){
 const f=Object.fromEntries(['q','status','assignee','from','to'].map(k=>[k,(q.get(k)||'').trim()]));
 if(f.q.length>100||f.assignee.length>80||!['','Pending','InProgress','Resolved'].includes(f.status))throw new Error('ตัวกรองไม่ถูกต้อง');
 for(const k of ['from','to'])if(f[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(f[k])||!Number.isFinite(Date.parse(f[k]))||new Date(f[k]).toISOString().slice(0,10)!==f[k]))throw new Error('วันที่ไม่ถูกต้อง');
 if(f.from&&f.to&&f.from>f.to)throw new Error('วันเริ่มต้องไม่เกินวันสิ้นสุด');
 return f;
}
export function baseMatch(f={}){
 const m={mergedInto:null};
 if(f.status)m.status=f.status;
 if(f.assignee)m.assignee=f.assignee==='__unassigned'?{$in:[null,'']}:f.assignee;
 if(f.from||f.to){m.eventAt={};if(f.from)m.eventAt.$gte=new Date(f.from+'T00:00:00+07:00');if(f.to)m.eventAt.$lt=new Date(Date.parse(f.to+'T00:00:00+07:00')+86400000);}
 return m;
}
