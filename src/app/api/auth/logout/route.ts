import { NextResponse } from 'next/server';
import { TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
