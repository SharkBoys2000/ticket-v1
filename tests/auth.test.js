import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,validSession,authorize,sessionCookie,SESSION_SECONDS} from '../lib/auth.js';
import {POST as login} from '../app/api/auth/login/route.js';
import {POST as logout} from '../app/api/auth/logout/route.js';
process.env.DASHBOARD_USER='test-staff';process.env.DASHBOARD_PASSWORD='test-only-password';
const origin='https://test.example';
const request=(path,body,site=origin)=>new Request(origin+path,{method:'POST',headers:{origin:site,'content-type':'application/json'},body:JSON.stringify(body)});
test('sessions reject tampering, expiration, and rotated credentials',()=>{
 const now=Date.now(),token=createSession(now);assert(validSession(token,now));assert(!validSession(token+'a',now));assert(!validSession(token,now+SESSION_SECONDS*1000));process.env.DASHBOARD_PASSWORD='changed';assert(!validSession(token,now));process.env.DASHBOARD_PASSWORD='test-only-password';
});
test('cookie login replaces Basic challenges and protects existing APIs',async()=>{
 const r=await login(request('/api/auth/login',{username:'test-staff',password:'test-only-password'}));assert.equal(r.status,200);
 const cookie=r.headers.get('set-cookie');assert(cookie.includes('HttpOnly'));assert(cookie.includes('Secure'));assert(cookie.includes('SameSite=Lax'));
 assert.equal(authorize({headers:new Headers({cookie:cookie.split(';')[0]})}),null);
 const denied=authorize({headers:new Headers({authorization:'Basic '+Buffer.from('test-staff:test-only-password').toString('base64')})});assert.equal(denied.status,401);assert(!denied.headers.has('www-authenticate'));
});
test('login and logout reject cross-site posts; wrong password rejected',async()=>{
 assert.equal((await login(request('/api/auth/login',{username:'test-staff',password:'wrong'}))).status,401);
 assert.equal((await login(request('/api/auth/login',{},'https://other.example'))).status,403);
 assert.equal((await logout(request('/api/auth/logout',{},'https://other.example'))).status,403);
 const r=await logout(request('/api/auth/logout',{}));assert(r.headers.get('set-cookie').includes('Max-Age=0'));
 assert(!sessionCookie(new Request('http://localhost:3000'),'token').includes('; Secure'));
});
