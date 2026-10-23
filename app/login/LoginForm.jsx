'use client';
import {useState} from 'react';
export default function LoginForm(){
 const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event){event.preventDefault();setBusy(true);setError('');const form=new FormData(event.currentTarget);
 try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'),password:form.get('password')}),signal:AbortSignal.timeout(15000)});
 const d=await r.json();if(!r.ok)throw new Error(d.error||'เข้าสู่ระบบไม่สำเร็จ');
 const next=new URLSearchParams(window.location.search).get('next')||'/dashboard';
 const target=new URL(next,window.location.origin);
 window.location.assign(target.origin===window.location.origin&&/^\/(dashboard|guides)(\/|\?|$)/.test(target.pathname+target.search)?target.pathname+target.search:'/dashboard');
 }catch(e){setError(e.name==='TimeoutError'?'เชื่อมต่อนานเกินไป กรุณาลองอีกครั้ง':e.message);setBusy(false);}
 }
 return <form className="login-form" onSubmit={submit}><label htmlFor="username">ชื่อผู้ใช้</label><input id="username" name="username" autoComplete="username" placeholder="กรอกชื่อผู้ใช้" maxLength={150} required disabled={busy}/><label htmlFor="password">รหัสผ่าน</label><div className="password-field"><input id="password" name="password" type={show?'text':'password'} autoComplete="current-password" placeholder="กรอกรหัสผ่าน" maxLength={1000} required disabled={busy}/><button type="button" onClick={()=>setShow(!show)} aria-pressed={show} aria-label={show?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'}>{show?'ซ่อน':'แสดง'}</button></div>{error&&<p role="alert" className="error">{error}</p>}<button className="login-submit" type="submit" disabled={busy}>{busy?'กำลังเข้าสู่ระบบ…':'เข้าสู่ระบบ →'}</button></form>;
}
