export async function replyTicketOpened(replyToken,ticketId,fetcher=fetch){
 if(!replyToken||!process.env.LINE_CHANNEL_ACCESS_TOKEN)return false;
 try{
 const response=await fetcher('https://api.line.me/v2/bot/message/reply',{method:'POST',headers:{Authorization:'Bearer '+process.env.LINE_CHANNEL_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({replyToken,messages:[{type:'text',text:'รับเรื่องแล้วครับ เลขที่ #'+String(ticketId).slice(-8)+'\nส่งรายละเอียดหรือรูปเพิ่มเติมในแชทนี้ได้ ระบบจะเก็บในเรื่องเดียวกัน\nหากเป็นคนละปัญหา กด “แจ้งเรื่องใหม่” แล้วส่งรายละเอียดครับ',quickReply:{items:[{type:'action',action:{type:'message',label:'แจ้งเรื่องใหม่',text:'แจ้งเรื่องใหม่'}}]}}]}),signal:AbortSignal.timeout(5000),redirect:'error'});return response.ok;
 }catch{return false;}
}
