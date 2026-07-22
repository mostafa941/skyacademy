import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import Subject from '@/models/Subject';
import { signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, email, phone, role, subjectName } = body;

    if (!name || !phone || !role) {
      return NextResponse.json({ error: 'الرجاء ملء الأسم ورقم الهاتف وتحديد الصفة' }, { status: 400 });
    }

    if (role !== 'teacher' && role !== 'secretary') {
      return NextResponse.json({ error: 'إنشاء الحساب متاح للمدرسين والسكرتارية فقط' }, { status: 400 });
    }

    if (role === 'teacher' && !subjectName) {
      return NextResponse.json({ error: 'الرجاء إدخال اسم المادة التي تقوم بتدريسها' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email?.trim().toLowerCase();

    // Check if phone number already exists
    const existingUser = await User.findOne({ phone: cleanPhone });
    if (existingUser) {
      return NextResponse.json(
        { error: 'رقم الهاتف هذا مسجل بالفعل. يمكنك تسجيل الدخول باسمك ورقم هاتفك.' },
        { status: 400 }
      );
    }

    // Create User
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail || undefined,
      phone: cleanPhone,
      role,
      subjectName: role === 'teacher' ? subjectName.trim() : undefined,
    });

    // If Teacher, ensure Subject model record exists
    if (role === 'teacher' && subjectName) {
      const existingSub = await Subject.findOne({
        name: { $regex: new RegExp(`^${subjectName.trim()}$`, 'i') },
      });

      if (existingSub) {
        existingSub.teacher = newUser._id;
        existingSub.teacherName = newUser.name;
        await existingSub.save();
      } else {
        await Subject.create({
          name: subjectName.trim(),
          grade: 'جميع المراحل',
          teacher: newUser._id,
          teacherName: newUser.name,
        });
      }
    }

    const token = signToken({
      userId: newUser._id.toString(),
      name: newUser.name,
      role: newUser.role,
      phone: newUser.phone,
      email: newUser.email,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        subjectName: newUser.subjectName,
      },
    });

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الحساب: ' + error.message }, { status: 500 });
  }
}
