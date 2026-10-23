import ExcelJS from 'exceljs';
import {statusLabels} from './status-message.js';
export async function exportWorkbook(rows,filters){
 const wb=new ExcelJS.Workbook();wb.creator='Ticket V1';wb.created=new Date();
 const sheet=wb.addWorksheet('คำร้อง',{views:[{state:'frozen',ySplit:1}]});
 sheet.columns=[['เลขคำร้อง',28],['วันที่เปิดเรื่อง (ประเทศไทย)',25],['ลูกค้า LINE',28],['ข้อความแรก',60],['สถานะ',20],['ผู้รับผิดชอบ',25],['จำนวนข้อความ',18],['อัปเดตข้อความล่าสุด',25]].map(([header,width])=>({header,width}));
 for(const t of rows)sheet.addRow([String(t._id),new Date(t.eventAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}),t.customer?.displayName||'ลูกค้า LINE',String(t.text||'['+t.messageType+']').slice(0,32000),statusLabels[t.status]||t.status,t.assignee||'ยังไม่มอบหมาย',t.messageCount||1,new Date(t.lastMessageAt||t.eventAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})]);
 sheet.autoFilter={from:'A1',to:'H'+Math.max(1,sheet.rowCount)};
 sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF143E33'}};
 sheet.eachRow((row,i)=>{row.alignment={vertical:'top',wrapText:true};if(i>1)row.height=45;});
 const info=wb.addWorksheet('สรุปรายงาน');info.columns=[{width:32},{width:65}];
 info.addRows([['รายงานคำร้อง Ticket V1',''],['จำนวนคำร้อง',rows.length],['ค้นหา',filters.q||'ทั้งหมด'],['สถานะ',statusLabels[filters.status]||'ทั้งหมด'],['ผู้รับผิดชอบ',filters.assignee==='__unassigned'?'ยังไม่มอบหมาย':filters.assignee||'ทั้งหมด'],['ตั้งแต่วันที่',filters.from||'ไม่จำกัด'],['ถึงวันที่',filters.to||'ไม่จำกัด'],['เวลาส่งออก',new Date().toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})],['หมายเหตุ','นับตามวันที่เปิดเรื่อง ไม่รวมรายการที่ถูกรวมแล้ว; ข้อความเป็นข้อความแรกของคำร้อง']]);
 return wb.xlsx.writeBuffer();
}
