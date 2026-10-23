import {authorize} from '../../../../lib/auth.js';
import {parseFilters} from '../../../../lib/ticket-filters.js';
import {exportTickets} from '../../../../lib/tickets.js';
import {exportWorkbook} from '../../../../lib/export-workbook.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request){
 const denied=authorize(request);if(denied)return denied;
 let filters;try{filters=parseFilters(new URL(request.url).searchParams);}catch(e){return Response.json({error:e.message},{status:400});}
 try{const rows=await exportTickets(filters);const bytes=await exportWorkbook(rows,filters);
 return new Response(bytes,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="tickets-'+new Date().toISOString().slice(0,10)+'.xlsx"','Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:e.message.startsWith('เกิน')?e.message:'ส่งออกไม่สำเร็จ กรุณาลองใหม่'},{status:503});}
}
