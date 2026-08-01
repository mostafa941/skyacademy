import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { name, phone, email, password } = body;

    if (!name || !phone || !email || !password) {
      return NextResponse.json({ error: 'الرجاء إدخال جميع الحقول (الاسم، الهاتف، الإيميل، وكلمة المرور)' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    });

    if (existingUser) {
      return NextResponse.json({ error: 'رقم الهاتف أو الإيميل مسجل مسبقاً' }, { status: 400 });
    }

    // Create the secretary
    const user = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      password: password,
      role: 'secretary',
    });

    const token = signToken({
      userId: user._id.toString(),
      name: user.name,
      role: user.role,
      phone: user.phone,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الحساب: ' + error.message }, { status: 500 });
  }
}
