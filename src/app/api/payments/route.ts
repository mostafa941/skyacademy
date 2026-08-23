import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Payment from '@/models/Payment';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';
import { getCurrentUser } from '@/lib/auth';
import {
  sanitizeString,
  isValidObjectId,
  sanitizeNumber,
  isValidMonth,
  isValidEnum,
} from '@/lib/validate';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['paid', 'unpaid', 'partial'] as const;
const VALID_PAYMENT_TYPES = ['session', 'monthly'] as const;

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const rawMonth = searchParams.get('month');
    const studentId = searchParams.get('studentId');

    const month = isValidMonth(rawMonth) ? rawMonth! : new Date().toISOString().substring(0, 7);

    const query: Record<string, unknown> = { month };
    if (studentId && isValidObjectId(studentId)) query.student = studentId;

    const payments = await Payment.find(query)
      .populate('student', 'name phone parentPhone grade subjectName')
      .sort({ createdAt: -1 })
      .lean();

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

    if (!studentId || !isValidObjectId(studentId)) {
      return NextResponse.json({ error: 'معرف الطالب غير صحيح' }, { status: 400 });
    }
    if (!isValidMonth(month)) {
      return NextResponse.json({ error: 'الشهر غير صحيح (YYYY-MM)' }, { status: 400 });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const teacherId = (student as any).teacher;
    const newAmount = sanitizeNumber(amount, 0, 100000);
    const remAmount = sanitizeNumber(remainingAmount, 0, 100000);
    const cleanReason = sanitizeString(paymentReason, 500) || 'اشتراك شهري';
    const cleanRemReason = sanitizeString(remainingReason, 500);
    const cleanNotes = sanitizeString(notes, 1000);
    const payStatus = isValidEnum(status, VALID_STATUS) ? status : 'paid';
    const pType = isValidEnum(paymentType, VALID_PAYMENT_TYPES) ? paymentType : 'monthly';

    // Get previous payment to compute balance difference
    const existingPayment = await Payment.findOne({ student: studentId, month }).lean();
    const previousAmount = (existingPayment as any)?.amount || 0;
    const amountDifference = newAmount - previousAmount;

    const payment = await Payment.findOneAndUpdate(
      { student: studentId, month },
      {
        $set: {
          student: studentId,
          teacher: teacherId || undefined,
          month,
          amount: newAmount,
          paymentType: pType,
          paymentReason: cleanReason,
          remainingAmount: remAmount,
          remainingReason: cleanRemReason,
          status: payStatus,
          notes: cleanNotes,
          ...(payStatus === 'paid' || payStatus === 'partial'
            ? { paidAt: (existingPayment as any)?.paidAt || new Date() }
            : {}),
        },
      },
      { upsert: true, new: true }
    );

    // Update teacher balance by the DIFFERENCE (teacher's percentage cut)
    if (amountDifference !== 0 && teacherId && isValidObjectId(teacherId.toString())) {
      const teacher = await Teacher.findById(teacherId).lean();
      if (teacher) {
        const teacherCut = (amountDifference * ((teacher as any).teacherPercentage || 50)) / 100;
        await Teacher.findByIdAndUpdate(teacherId, { $inc: { balance: teacherCut } });
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

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: 'معرف الدفع غير صحيح' }, { status: 400 });
    }

    const payment = await Payment.findById(id).lean();
    if (!payment) {
      return NextResponse.json({ error: 'عملية الدفع غير موجودة' }, { status: 404 });
    }

    const p = payment as any;
    if (p.teacher && p.amount > 0) {
      const teacher = await Teacher.findById(p.teacher).lean();
      if (teacher) {
        const teacherCut = (p.amount * ((teacher as any).teacherPercentage || 50)) / 100;
        await Teacher.findByIdAndUpdate(p.teacher, { $inc: { balance: -teacherCut } });
      }
    }

    await Payment.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
