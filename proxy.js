import { NextResponse } from 'next/server';
import { authorize } from './lib/auth.js';
export function proxy(request) { return authorize(request) ?? NextResponse.next(); }
export const config = { matcher: ['/dashboard/:path*', '/api/tickets/:path*', '/guides/:path*', '/api/guides/:path*', '/api/reports/:path*'] };
