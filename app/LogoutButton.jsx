'use client';
import {useState} from 'react';
export default function LogoutButton(){const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <div className="logout-control"><button disabled={busy} onClick={async()=>{setBusy(true);try{const r=await fetch('/api/auth/logout',{method:'POST',signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error();window.location.assign('/login');}catch{setError('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง');setBusy(false);}}}>{busy?'กำลังออก…':'ออกจากระบบ'}</button>{error&&<small role="alert">{error}</small>}</div>;}
