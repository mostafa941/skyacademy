import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Payment from '@/models/Payment';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);
    const studentId = searchParams.get('studentId');

    let query: any = {};
    if (studentId) query.student = studentId;
    if (month) query.month = month;

    const payments = await Payment.find(query)
      .populate('student', 'name phone parentPhone grade subjectName')
      .sort({ createdAt: -1 });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();
    const body = await req.json();
    const { studentId, month, amount, paymentReason, remainingAmount, remainingReason, status, notes } = body;

    if (!studentId || !month) {
      return NextResponse.json({ error: 'معرف الطالب والشهر مطلوبان' }, { status: 400 });
    }

    const payment = await Payment.findOneAndUpdate(
      { student: studentId, month },
      {
        student: studentId,
        month,
        amount: Number(amount) || 0,
        paymentReason: paymentReason?.trim() || 'اشتراك شهري',
        remainingAmount: Number(remainingAmount) || 0,
        remainingReason: remainingReason?.trim() || '',
        status: status || 'paid',
        notes: notes?.trim(),
        paidAt: status === 'paid' || status === 'partial' ? new Date() : undefined,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
