import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Expense from '@/models/Expense';
import Teacher from '@/models/Teacher';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    let query: Record<string, unknown> = {};
    if (date) {
      query.date = date;
    } else if (month) {
      query.date = { $regex: `^${month}` };
    }

    const [expenses, stats] = await Promise.all([
      Expense.find(query).populate('createdBy', 'name').populate('teacher', 'name type subjectName').sort({ date: -1, createdAt: -1 }),
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

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'التاريخ مطلوب' }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'السبب مطلوب' }, { status: 400 });
    }

    const expense = await Expense.create({
      amount: Number(amount),
      date,
      reason: reason.trim(),
      type: type === 'teacher_loan' ? 'teacher_loan' : 'general',
      teacher: teacherId || undefined,
      createdBy: currentUser._id,
    });

    // If teacher loan, update teacher balance (subtract from teacher balance since they borrowed)
    if (type === 'teacher_loan' && teacherId) {
      await Teacher.findByIdAndUpdate(teacherId, {
        $inc: { balance: -Number(amount) },
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
    if (!expenseId) {
      return NextResponse.json({ error: 'معرف المصروف مطلوب' }, { status: 400 });
    }

    const expense = await Expense.findById(expenseId);
    if (expense && expense.type === 'teacher_loan' && expense.teacher) {
      // Reverse balance change if deleted
      await Teacher.findByIdAndUpdate(expense.teacher, {
        $inc: { balance: Number(expense.amount) },
      });
    }

    await Expense.findByIdAndDelete(expenseId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
