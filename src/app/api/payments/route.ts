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

    // Get teacher linked to this student
    const teacherId = student.teacher;

    // Calculate how much was previously paid this month (to compute the difference)
    const existingPayment = await Payment.findOne({ student: studentId, month });
    const previousAmount = existingPayment ? (existingPayment.amount || 0) : 0;
    const newAmount = Number(amount) || 0;
    const amountDifference = newAmount - previousAmount;

    // Upsert the payment record
    const paymentStatus = status || 'paid';
    const payment = await Payment.findOneAndUpdate(
      { student: studentId, month },
      {
        $set: {
          student: studentId,
          teacher: teacherId || undefined,
          month,
          amount: newAmount,
          paymentType: paymentType || 'monthly',
          paymentReason: paymentReason?.trim() || 'اشتراك شهري',
          remainingAmount: Number(remainingAmount) || 0,
          remainingReason: remainingReason?.trim() || '',
          status: paymentStatus,
          notes: notes?.trim(),
          ...(paymentStatus === 'paid' || paymentStatus === 'partial'
            ? { paidAt: existingPayment?.paidAt || new Date() }
            : {}),
        },
      },
      { upsert: true, new: true }
    );

    // Update teacher balance by the DIFFERENCE in amount (teacher's percentage cut)
    if (amountDifference !== 0 && teacherId) {
      const teacher = await Teacher.findById(teacherId);
      if (teacher) {
        const teacherCut = (amountDifference * (teacher.teacherPercentage || 50)) / 100;
        await Teacher.findByIdAndUpdate(teacherId, {
          $inc: { balance: teacherCut },
        });
      }
    }

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح أو ليس لديك صلاحية أدمن' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرف الدفع مطلوب' }, { status: 400 });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return NextResponse.json({ error: 'عملية الدفع غير موجودة' }, { status: 404 });
    }

    if (payment.teacher && payment.amount > 0) {
      const teacher = await Teacher.findById(payment.teacher);
      if (teacher) {
        const teacherCut = (payment.amount * (teacher.teacherPercentage || 50)) / 100;
        await Teacher.findByIdAndUpdate(payment.teacher, {
          $inc: { balance: -teacherCut },
        });
      }
    }

    await Payment.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
