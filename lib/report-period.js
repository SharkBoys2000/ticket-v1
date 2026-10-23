export function reportPeriod(mode,year,month){
 if(!['daily','weekly','monthly'].includes(mode)||!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(month)||month<1||month>12)throw new Error('Invalid period');
 const byMonth=mode!=='monthly';
 const start=new Date(Date.UTC(year,byMonth?month-1:0,1,-7));
 const end=new Date(Date.UTC(year,byMonth?month:12,1,-7));
 const count=byMonth?new Date(Date.UTC(year,month,0)).getUTCDate():12;
 const key=d=>year+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0');
 let ranges=[];
 if(mode==='weekly'){
  for(let d=1;d<=count;){
   const weekday=new Date(Date.UTC(year,month-1,d)).getUTCDay();
   const last=Math.min(count,d+(7-weekday)%7);
   ranges.push({key:key(d),endKey:key(last),label:d+'–'+last});d=last+1;
  }
 }else ranges=Array.from({length:count},(_,i)=>({key:byMonth?key(i+1):year+'-'+String(i+1).padStart(2,'0')}));
 return {start,end,keys:ranges.map(r=>r.key),ranges};
}
export function reportBuckets(ranges,rows){
 return ranges.map(range=>{
 const entries=rows.filter(r=>r._id>=range.key&&r._id<=(range.endKey||range.key));
 return {...range,tickets:entries.reduce((n,r)=>n+r.tickets,0),people:new Set(entries.flatMap(r=>r.people||[]).filter(Boolean)).size};
 });
}
