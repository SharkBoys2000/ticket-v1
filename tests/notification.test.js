import test from 'node:test';
import assert from 'node:assert/strict';
import { pushStatus, statusMessage } from '../lib/notification.js';
import { saveAndNotify } from '../lib/status-update.js';
import { Ticket } from '../lib/models.js';
test('push includes stable retry key and Thai details', async () => {
  let sent;
  await pushStatus({key:'retry-key',to:'Utest',text:statusMessage('12345678','Resolved','แก้ไขแล้ว')},async(url, options)=>{sent={url,options};return new Response('{}',{status:200});});
  assert.equal(sent.options.headers['X-Line-Retry-Key'],'retry-key');
  assert.equal(JSON.parse(sent.options.body).to,'Utest');
  assert.match(JSON.parse(sent.options.body).messages[0].text,/เสร็จสิ้น/);
});
test('only LINE duplicate acknowledgement counts as accepted', async () => {
  const notice={key:'key',to:'Utest',text:'test'};
  await pushStatus(notice,async()=>new Response('{}',{status:409,headers:{'x-line-accepted-request-id':'accepted'}}));
  await assert.rejects(pushStatus(notice,async()=>new Response('{}',{status:409})));
  await assert.rejects(pushStatus(notice,async()=>new Response('{}',{status:429})));
  await assert.rejects(pushStatus(notice,async()=>{throw new Error('timeout');}));
});
test('save failure, retry and duplicate clicks preserve one notification', async () => {
  const find=Ticket.findById,update=Ticket.updateOne;
  let state={_id:'507f1f77bcf86cd799439011',status:'Pending',lineUserId:'Utest',sourceType:'user'};
  let attempts=[];
  Ticket.findById=()=>({lean:async()=>structuredClone(state)});
  Ticket.updateOne=async(filter,operation)=>{
    if (filter['notification.key']?.$exists === false && state.notification) return {modifiedCount:0};
    if (typeof filter['notification.key']==='string' && state.notification?.key!==filter['notification.key']) return {modifiedCount:0};
    if (filter['notification.state'] && filter['notification.state'].$ne===state.notification?.state) return {modifiedCount:0};
    for(const [key,value] of Object.entries(operation.$set)) {
      if(key.startsWith('notification.')) state.notification[key.split('.')[1]]=value;
      else state[key]=structuredClone(value);
    }
    return {modifiedCount:1};
  };
  try {
    const first=await saveAndNotify(state._id,'InProgress','กำลังตรวจสอบ','Pending',async n=>{attempts.push(structuredClone(n));throw new Error('timeout');});
    assert.equal(first.statusSaved,true);assert.equal(first.accepted,false);assert.equal(state.status,'InProgress');
    await assert.rejects(saveAndNotify(state._id,'Resolved','ใหม่','InProgress',async()=>{}),/ข้อความเดิม/);
    const retried=await saveAndNotify(state._id,'InProgress','กำลังตรวจสอบ','InProgress',async n=>{attempts.push(structuredClone(n));});
    assert.equal(retried.accepted,true);assert.equal(attempts[0].key,attempts[1].key);assert.equal(attempts[0].text,attempts[1].text);
    const repeated=await saveAndNotify(state._id,'InProgress','กำลังตรวจสอบ','InProgress',async()=>assert.fail('must not send twice'));
    assert.equal(repeated.alreadySent,true);
    await assert.rejects(saveAndNotify(state._id,'Resolved','จบ','Pending',async()=>{}),/สถานะถูกแก้ไข/);
    state.notification.state='failed';state.notification.createdAt=new Date(Date.now()-24*3600000);
    await assert.rejects(saveAndNotify(state._id,'InProgress','กำลังตรวจสอบ','InProgress',async()=>assert.fail('expired')),/23 ชั่วโมง/);
    state.sourceType='group';
    await assert.rejects(saveAndNotify(state._id,'Resolved','','InProgress',async()=>{}),/แชทส่วนตัว/);
  } finally { Ticket.findById=find;Ticket.updateOne=update; }
});
