process.loadEnvFile('.env.local');
const headers={Authorization:'Basic '+Buffer.from(process.env.DASHBOARD_USER+':'+process.env.DASHBOARD_PASSWORD).toString('base64')};
for(const path of ['/api/tickets?page=1','/api/tickets/6adb35ec4c8dd4efea66793f/messages?page=1','/dashboard']){
const r=await fetch('http://127.0.0.1:3000'+path,{headers,signal:AbortSignal.timeout(30000)});
const text=await r.text();
if(path==='/dashboard')console.log(path,r.status,'historyControl:',text.includes('ดูบทสนทนา'));
else {try {const d=JSON.parse(text);console.log(path,r.status,'total:',d.total,'items:',(d.tickets||d.messages||[]).length);} catch {console.log(path,r.status,'not json');}}
}