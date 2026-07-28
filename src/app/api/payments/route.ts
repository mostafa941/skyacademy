import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Payment from '@/models/Payment';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';
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
    const { studentId, month, amount, paymentType, paymentReason, remainingAmount, remainingReason, status, notes } = body;

    if (!studentId || !month) {
      return NextResponse.json({ error: 'معرف الطالب والشهر مطلوبان' }, { status: 400 });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }
    const teacherId = student.teacher;

    // Fetch existing payment to calculate difference
    const existingPayment = await Payment.findOne({ student: studentId, month });
    const previousAmount = existingPayment?.amount || 0;
    const newAmount = Number(amount) || 0;
    const amountDifference = newAmount - previousAmount;

    const payment = await Payment.findOneAndUpdate(
      { student: studentId, month },
      {
        student: studentId,
        teacher: teacherId,
        month,
        amount: newAmount,
        paymentType: paymentType || 'monthly',
        paymentReason: paymentReason?.trim() || 'اشتراك شهري',
        remainingAmount: Number(remainingAmount) || 0,
        remainingReason: remainingReason?.trim() || '',
        status: status || 'paid',
        notes: notes?.trim(),
        paidAt: status === 'paid' || status === 'partial' ? new Date() : undefined,
      },
      { upsert: true, new: true }
    );

    // Update teacher balance if there's a difference and a teacher is assigned
    if (amountDifference !== 0 && teacherId) {
      const teacher = await Teacher.findById(teacherId);
      if (teacher) {
        // Calculate the teacher's cut based on their percentage
        const teacherCut = (amountDifference * (teacher.teacherPercentage || 50)) / 100;
        await Teacher.findByIdAndUpdate(teacherId, {
          $inc: { balance: teacherCut },
        });
      }
    }

    // Removed notification

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
