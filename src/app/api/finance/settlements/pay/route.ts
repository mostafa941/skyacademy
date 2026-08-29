import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import TeacherPayout from '@/models/TeacherPayout';
import Income from '@/models/Income';
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

    // Allow settlement regardless of balance to close the month

    const amountToPayout = teacher.balance;

    // Handle financial records based on balance
    if (amountToPayout > 0) {
      // Create a Payout record (Center pays Teacher)
      await TeacherPayout.create({
        teacher: teacherId,
        amount: amountToPayout,
        month: month,
        date: new Date().toISOString().substring(0, 10),
        notes: `تصفية حساب شهر ${month}`,
        createdBy: currentUser._id,
      });
    } else if (amountToPayout < 0) {
      // Teacher pays the Center to clear their debt
      await Income.create({
        amount: Math.abs(amountToPayout),
        date: new Date().toISOString().substring(0, 10),
        reason: `تسوية وتصفية عجز حساب شهر ${month} (استرداد من المدرس)`,
        staffType: teacher.type,
        teacher: teacherId,
        createdBy: currentUser._id,
      });
    }
    // If amountToPayout === 0, no financial record needed, just reset balance.

    // Reset teacher balance
    teacher.balance = 0;
    await teacher.save();

    return NextResponse.json({ success: true, message: 'تمت تصفية الحساب بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
