import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Payment from '@/models/Payment';
import User from '@/models/User';
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
    if (currentUser.role === 'student') {
      query.student = currentUser._id;
    } else if (studentId) {
      query.student = studentId;
    }
    if (month) query.month = month;

    const payments = await Payment.find(query)
      .populate('student', 'name phone grade')
      .sort({ month: -1 });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || (currentUser.role !== 'secretary' && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();
    const body = await req.json();
    const { studentId, month, amount, status, notes } = body;

    if (!studentId || !month) {
      return NextResponse.json({ error: 'معرف الطالب والشهر مطلوبان' }, { status: 400 });
    }

    const payment = await Payment.findOneAndUpdate(
      { student: studentId, month },
      {
        student: studentId,
        month,
        amount: amount || 300,
        status: status || 'unpaid',
        notes: notes?.trim(),
        paidAt: status === 'paid' ? new Date() : undefined,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || (currentUser.role !== 'secretary' && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();
    const body = await req.json();
    const { paymentId, status, amount, notes } = body;

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status,
        amount,
        notes,
        paidAt: status === 'paid' ? new Date() : undefined,
      },
      { new: true }
    );

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
