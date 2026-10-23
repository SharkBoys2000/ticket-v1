import {listTickets} from '../../../lib/tickets.js';
import {authorize} from '../../../lib/auth.js';
import {parseFilters} from '../../../lib/ticket-filters.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request){
 const denied=authorize(request);if(denied)return denied;
 const q=new URL(request.url).searchParams,page=Number(q.get('page')??'1');let filters;
 if(!Number.isSafeInteger(page)||page<1||page>100000)return Response.json({error:'Invalid page'},{status:400});
 try{filters=parseFilters(q);}catch(e){return Response.json({error:e.message},{status:400});}
 try{return Response.json(await listTickets(page,filters),{headers:{'Cache-Control':'private, no-store'}});}
 catch{return Response.json({error:'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่'},{status:503});}
}
