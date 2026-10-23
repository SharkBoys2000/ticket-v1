import {authConfigured,validCredentials,createSession,sameOrigin,sessionCookie} from '../../../../lib/auth.js';
export const runtime='nodejs';
const attempts=globalThis.ticketLoginAttempts??=new Map();
export async function POST(request){
 if(!sameOrigin(request))return Response.json({error:'กรุณาเข้าสู่ระบบจากหน้าเว็บไซต์นี้'},{status:403});
 if(!authConfigured())return Response.json({error:'ยังไม่ได้ตั้งค่าบัญชีผู้ดูแลบนเซิร์ฟเวอร์'},{status:503});
 const now=Date.now();
 for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
 // Best-effort per-instance protection; Vercel Firewall can add shared rate limits.
 const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')||'unknown':'local';
 const record=attempts.get(ip);
 if(record?.count>=8)return Response.json({error:'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที'},{status:429,headers:{'Retry-After':String(Math.ceil((record.until-now)/1000))}});
 let body;try{body=await request.json();}catch{return Response.json({error:'ข้อมูลไม่ถูกต้อง'},{status:400});}
 if(typeof body?.username!=='string'||typeof body?.password!=='string'||body.username.length>150||body.password.length>1000)return Response.json({error:'ข้อมูลไม่ถูกต้อง'},{status:400});
 if(!validCredentials(body.username,body.password)){
 if(attempts.size>5000)attempts.delete(attempts.keys().next().value);
 attempts.set(ip,{count:(record?.count||0)+1,until:record?.until||now+900000});
 return Response.json({error:'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'},{status:401,headers:{'Cache-Control':'no-store'}});
 }
 attempts.delete(ip);return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie(request,createSession()),'Cache-Control':'no-store'}});
}
