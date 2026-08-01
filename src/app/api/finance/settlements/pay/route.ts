import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import TeacherPayout from '@/models/TeacherPayout';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { teacherId, month } = body;

    if (!teacherId || !month) {
      return NextResponse.json({ error: 'الرجاء تحديد المدرس والشهر' }, { status: 400 });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return NextResponse.json({ error: 'المدرس غير موجود' }, { status: 404 });
    }

    if (teacher.balance <= 0) {
      return NextResponse.json({ error: 'لا يوجد رصيد مستحق لتصفيته' }, { status: 400 });
    }

    const amountToPayout = teacher.balance;

    // Create a Payout record
    const payout = await TeacherPayout.create({
      teacher: teacherId,
      amount: amountToPayout,
      month: month,
      date: new Date().toISOString().substring(0, 10),
      notes: `تصفية حساب شهر ${month}`,
      createdBy: currentUser._id,
    });

    // Reset teacher balance
    teacher.balance = 0;
    await teacher.save();

    return NextResponse.json({ success: true, payout, message: 'تمت تصفية الحساب بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
