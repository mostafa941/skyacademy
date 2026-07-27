import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { signToken, TOKEN_COOKIE_NAME, seedDefaultUsersIfNeeded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await seedDefaultUsersIfNeeded();
    await connectToDatabase();

    const body = await req.json();
    const { identifier, password } = body; // identifier can be email or phone

    if (!identifier || !password) {
      return NextResponse.json({ error: 'الرجاء إدخال اسم المستخدم/البريد/رقم الهاتف وكلمة المرور' }, { status: 400 });
    }

    const cleanId = identifier.trim().toLowerCase();

    // Search user by email or phone
    const user = await User.findOne({
      $or: [{ email: cleanId }, { phone: cleanId }],
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تسجيل الدخول: ' + error.message }, { status: 500 });
  }
}
