import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Expense from '@/models/Expense';
import Teacher from '@/models/Teacher';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeString, isValidObjectId, sanitizeNumber, isValidDate, isValidEnum } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const VALID_EXPENSE_TYPES = ['teacher_loan', 'general'] as const;

async function getExpenseStats() {
  const today = new Date().toISOString().substring(0, 10);
  const currentMonth = new Date().toISOString().substring(0, 7);

  const [allTime, thisMonth, todayStats] = await Promise.all([
    Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Expense.aggregate([
      { $match: { date: { $regex: `^${currentMonth}` } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { date: today } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalAllTime: allTime[0]?.total || 0,
    countAllTime: allTime[0]?.count || 0,
    totalThisMonth: thisMonth[0]?.total || 0,
    countThisMonth: thisMonth[0]?.count || 0,
    totalToday: todayStats[0]?.total || 0,
    countToday: todayStats[0]?.count || 0,
    month: currentMonth,
    today,
  };
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    const query: Record<string, unknown> = {};
    if (date && isValidDate(date)) {
      query.date = date;
    } else if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      query.date = { $regex: `^${month}` };
    }

    const [expenses, stats] = await Promise.all([
      Expense.find(query)
        .populate('createdBy', 'name')
        .populate('teacher', 'name type subjectName')
        .sort({ date: -1, createdAt: -1 })
        .lean(),
      getExpenseStats(),
    ]);

    return NextResponse.json({ expenses, stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { amount, date, reason, type, teacherId } = body;

    const cleanAmount = sanitizeNumber(amount, 0, 10_000_000);
    const cleanReason = sanitizeString(reason, 500);
    const cleanType = isValidEnum(type, VALID_EXPENSE_TYPES) ? type : 'general';
    const cleanTeacherId = teacherId && isValidObjectId(teacherId) ? teacherId : undefined;

    if (cleanAmount <= 0) {
      return NextResponse.json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }, { status: 400 });
    }
    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: 'التاريخ مطلوب بصيغة YYYY-MM-DD' }, { status: 400 });
    }
    if (!cleanReason) {
      return NextResponse.json({ error: 'السبب مطلوب' }, { status: 400 });
    }
    // Teacher loan requires a teacherId
    if (cleanType === 'teacher_loan' && !cleanTeacherId) {
      return NextResponse.json({ error: 'يجب تحديد المدرس/المدرب عند تسجيل سلفة' }, { status: 400 });
    }

    const expense = await Expense.create({
      amount: cleanAmount,
      date,
      reason: cleanReason,
      type: cleanType,
      teacher: cleanTeacherId,
      createdBy: currentUser._id,
    });

    // If teacher loan, subtract from teacher balance (they borrowed money)
    if (cleanType === 'teacher_loan' && cleanTeacherId) {
      await Teacher.findByIdAndUpdate(cleanTeacherId, {
        $inc: { balance: -cleanAmount },
      });
    }

    return NextResponse.json({ success: true, expense });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'حذف المصروفات متاح للأدمن فقط' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get('id');

    if (!expenseId || !isValidObjectId(expenseId)) {
      return NextResponse.json({ error: 'معرف المصروف غير صحيح' }, { status: 400 });
    }

    const expense = await Expense.findById(expenseId).lean();
    if (!expense) {
      return NextResponse.json({ error: 'المصروف غير موجود' }, { status: 404 });
    }

    const e = expense as any;
    // Reverse teacher balance if this was a loan
    if (e.type === 'teacher_loan' && e.teacher) {
      await Teacher.findByIdAndUpdate(e.teacher, {
        $inc: { balance: e.amount },
      });
    }

    await Expense.findByIdAndDelete(expenseId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
