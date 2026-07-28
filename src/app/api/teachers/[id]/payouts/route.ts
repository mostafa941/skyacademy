import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import TeacherPayout from '@/models/TeacherPayout';
import Teacher from '@/models/Teacher';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { id: teacherId } = await params;
    const payouts = await TeacherPayout.find({ teacher: teacherId })
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    const totalPaidOut = payouts.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        id: p._id.toString(),
        amount: p.amount,
        month: p.month,
        date: p.date,
        notes: p.notes || '',
        createdBy: (p.createdBy as any)?.name || '',
      })),
      totalPaidOut,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'تسجيل القبض متاح للأدمن فقط' }, { status: 403 });
    }
    await connectToDatabase();

    const { id: teacherId } = await params;
    const body = await req.json();
    const { amount, month, date, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'المبلغ مطلوب' }, { status: 400 });
    }

    const payout = await TeacherPayout.create({
      teacher: teacherId,
      amount: Number(amount),
      month: month || new Date().toISOString().substring(0, 7),
      date: date || new Date().toISOString().substring(0, 10),
      notes: notes?.trim() || '',
      createdBy: currentUser._id,
    });

    // Decrease teacher balance (teacher got paid)
    await Teacher.findByIdAndUpdate(teacherId, {
      $inc: { balance: -Number(amount) },
    });

    return NextResponse.json({ success: true, payout });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
