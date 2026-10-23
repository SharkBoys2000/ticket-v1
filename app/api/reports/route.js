import {authorize} from '../../../lib/auth.js';
import {ticketReport} from '../../../lib/report.js';
import {reportPeriod} from '../../../lib/report-period.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 const denied=authorize(request);if(denied)return denied;
 const q=new URL(request.url).searchParams,mode=q.get('mode'),year=Number(q.get('year')),month=Number(q.get('month'));
 try{reportPeriod(mode,year,month);}catch{return Response.json({error:'ช่วงวันที่ไม่ถูกต้อง'},{status:400});}
 try{return Response.json(await ticketReport(mode,year,month),{headers:{'Cache-Control':'private, no-store'}});}
 catch{return Response.json({error:'โหลดสถิติไม่สำเร็จ กรุณาลองอีกครั้ง'},{status:503});}
}
