import {NextResponse} from 'next/server';
import {authorize} from './lib/auth.js';
export function proxy(request){
 const denied=authorize(request);if(!denied)return NextResponse.next();
 if(!request.nextUrl.pathname.startsWith('/api/')){
 const url=new URL('/login',request.url);url.searchParams.set('next',request.nextUrl.pathname+request.nextUrl.search);
 const response=NextResponse.redirect(url);response.headers.set('Cache-Control','no-store');return response;
 }return denied;
}
export const config={matcher:['/dashboard/:path*','/api/tickets/:path*','/guides/:path*','/api/guides/:path*','/api/reports/:path*']};
