import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Expense from '@/models/Expense';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getExpenseStats() {
  const today = new Date().toISOString().substring(0, 10);
  const currentMonth = new Date().toISOString().substring(0, 7);

  const [allTime, thisMonth, todayStats, dailyBreakdown] = await Promise.all([
    Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $regex: `^${currentMonth}` } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { date: today } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $group: { _id: '$date', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 30 },
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
    dailyBreakdown: dailyBreakdown.map((d: { _id: string; total: number; count: number }) => ({
      date: d._id,
      total: d.total,
      count: d.count,
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
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
      Expense.find(query).populate('createdBy', 'name').sort({ date: -1, createdAt: -1 }),
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
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { amount, date, reason } = body;

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
      amount,
      date,
      reason: reason.trim(),
      createdBy: currentUser._id,
    });

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
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get('id');
    if (!expenseId) {
      return NextResponse.json({ error: 'معرف المصروف مطلوب' }, { status: 400 });
    }

    await Expense.findByIdAndDelete(expenseId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
