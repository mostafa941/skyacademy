import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { signToken, TOKEN_COOKIE_NAME, seedAdminUserIfNeeded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await seedAdminUserIfNeeded();
    await connectToDatabase();

    const body = await req.json();
    const { role, email, password, phone, name } = body;

    if (!role) {
      return NextResponse.json({ error: 'الرجاء تحديد نوع المستخدم' }, { status: 400 });
    }

    let user = null;

    if (role === 'admin') {
      const cleanEmail = email?.trim().toLowerCase();
      if (!cleanEmail || !password) {
        return NextResponse.json({ error: 'الرجاء أدخال البريد الإلكتروني وكلمة المرور' }, { status: 400 });
      }

      user = await User.findOne({ email: cleanEmail, role: 'admin' });
      if (!user || user.password !== password) {
        return NextResponse.json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }, { status: 401 });
      }
    } else if (role === 'student') {
      const cleanPhone = phone?.trim();
      if (!cleanPhone) {
        return NextResponse.json({ error: 'الرجاء إدخال رقم الهاتف' }, { status: 400 });
      }

      user = await User.findOne({ phone: cleanPhone, role: 'student' });
      if (!user) {
        return NextResponse.json(
          { error: 'رقم الهاتف غير مسجل لدى الأكاديمية. يرجى التواصل مع السكرتيرة لإضافتك كطالب.' },
          { status: 404 }
        );
      }
    } else if (role === 'teacher' || role === 'secretary') {
      const cleanPhone = phone?.trim();
      const cleanName = name?.trim();

      if (!cleanPhone) {
        return NextResponse.json({ error: 'الرجاء إدخال رقم الهاتف' }, { status: 400 });
      }

      // Search by phone and role first
      user = await User.findOne({ phone: cleanPhone, role });

      // If name is also provided, try finding by name and phone
      if (!user && cleanName) {
        user = await User.findOne({
          name: { $regex: new RegExp(cleanName, 'i') },
          phone: cleanPhone,
          role,
        });
      }

      if (!user) {
        const roleLabel = role === 'teacher' ? 'مدرس' : 'سكرتيرة';
        return NextResponse.json(
          { error: `لم يتم العثور على حساب ${roleLabel} بهذة البيانات. يرجى إنشاء حساب جديد.` },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json({ error: 'نوع الدور غير صالح' }, { status: 400 });
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
        subjectName: user.subjectName,
        grade: user.grade,
      },
    });

    // Set cookie
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
