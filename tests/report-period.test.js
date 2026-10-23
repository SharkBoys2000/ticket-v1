import test from 'node:test';import assert from 'node:assert/strict';import {reportPeriod,reportBuckets} from '../lib/report-period.js';
test('daily report follows Bangkok midnight and leap years',()=>{const p=reportPeriod('daily',2024,2);assert.equal(p.keys.length,29);assert.equal(p.start.toISOString(),'2024-01-31T17:00:00.000Z');assert.equal(p.end.toISOString(),'2024-02-29T17:00:00.000Z');assert.equal(p.keys[28],'2024-02-29');});
test('monthly report covers all 12 months with next year exclusive',()=>{const p=reportPeriod('monthly',2026,10);assert.equal(p.keys.length,12);assert.equal(p.start.toISOString(),'2025-12-31T17:00:00.000Z');assert.equal(p.end.toISOString(),'2026-12-31T17:00:00.000Z');});
test('invalid periods rejected',()=>{for(const args of [['bad',2026,1],['daily',2026,13],['daily',NaN,1],['daily',2026,0]])assert.throws(()=>reportPeriod(...args));});

test('weekly ranges clip Monday-Sunday weeks to selected month without gaps',()=>{
 const p=reportPeriod('weekly',2026,10);
 assert.deepEqual(p.ranges.map(r=>r.label),['1–4','5–11','12–18','19–25','26–31']);
 assert.equal(reportPeriod('weekly',2026,2).ranges.length,5);
 assert.equal(reportPeriod('weekly',2024,2).ranges.at(-1).endKey,'2024-02-29');
});
test('weekly requester counts are distinct across days, merged records already excluded by query',()=>{
 const ranges=reportPeriod('weekly',2026,10).ranges;
 const b=reportBuckets(ranges,[{_id:'2026-10-19',tickets:2,people:['A','B']},{_id:'2026-10-23',tickets:2,people:['A',null]}]);
 assert.equal(b[3].tickets,4);assert.equal(b[3].people,2);assert.equal(b[0].tickets,0);
});
