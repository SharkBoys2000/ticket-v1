import {createHash,createHmac,timingSafeEqual,randomBytes} from 'node:crypto';
export const SESSION_COOKIE='ticket_session';
export const SESSION_SECONDS=8*60*60;
const digest=value=>createHash('sha256').update(value).digest();
export const authConfigured=()=>Boolean(process.env.DASHBOARD_USER&&process.env.DASHBOARD_PASSWORD);
const key=()=>process.env.AUTH_SECRET||createHash('sha256').update('ticket-session-v1\0'+process.env.DASHBOARD_USER+'\0'+process.env.DASHBOARD_PASSWORD).digest();
const sign=value=>createHmac('sha256',key()).update(value).digest('base64url');
export function validCredentials(user,password){
 return authConfigured()&&typeof user==='string'&&typeof password==='string'&&
 timingSafeEqual(digest(user),digest(process.env.DASHBOARD_USER))&&timingSafeEqual(digest(password),digest(process.env.DASHBOARD_PASSWORD));
}
export function createSession(now=Date.now()){
 const payload=Buffer.from(JSON.stringify({user:process.env.DASHBOARD_USER,expires:Math.floor(now/1000)+SESSION_SECONDS,nonce:randomBytes(16).toString('hex'),credential:digest(process.env.DASHBOARD_USER+'\0'+process.env.DASHBOARD_PASSWORD).toString('hex')})).toString('base64url');
 return payload+'.'+sign(payload);
}
export function validSession(token,now=Date.now()){
 if(!authConfigured()||!token||token.length>2048)return false;
 try{const [payload,signature,...rest]=token.split('.');if(rest.length||!signature||!timingSafeEqual(digest(signature),digest(sign(payload))))return false;
 const value=JSON.parse(Buffer.from(payload,'base64url').toString());
 return value.user===process.env.DASHBOARD_USER&&Number.isSafeInteger(value.expires)&&value.expires>Math.floor(now/1000)&&value.credential===digest(process.env.DASHBOARD_USER+'\0'+process.env.DASHBOARD_PASSWORD).toString('hex');
 }catch{return false;}
}
export function authorize(request){
 if(!authConfigured())return Response.json({error:'ยังไม่ได้ตั้งค่าบัญชีผู้ดูแล กรุณาติดต่อผู้ดูแลระบบ'},{status:503,headers:{'Cache-Control':'no-store'}});
 const token=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1);
 if(validSession(token))return null;
 return Response.json({error:'กรุณาเข้าสู่ระบบอีกครั้ง'},{status:401,headers:{'Cache-Control':'no-store'}});
}
export function sameOrigin(request){
 try{const origin=request.headers.get('origin');return !!origin&&origin===new URL(request.url).origin;}catch{return false;}
}
export function sessionCookie(request,token='',clear=false){
 const secure=new URL(request.url).protocol==='https:';
 return SESSION_COOKIE+'='+token+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+(clear?0:SESSION_SECONDS)+(secure?'; Secure':'');
}
