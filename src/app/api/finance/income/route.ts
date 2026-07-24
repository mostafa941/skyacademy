import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Payment from '@/models/Payment';
import Expense from '@/models/Expense';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function dayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

async function getIncomeStats() {
  const today = new Date().toISOString().substring(0, 10);
  const currentMonth = new Date().toISOString().substring(0, 7);
  const { start: monthStart, end: monthEnd } = (() => {
    const [year, month] = currentMonth.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    };
  })();
  const { start: todayStart, end: todayEnd } = dayBounds(today);

  const paidMatch = { status: 'paid' as const };

  const [allTime, thisMonth, todayStats, dailyBreakdown, expenseAllTime, expenseMonth] =
    await Promise.all([
      Payment.aggregate([
        { $match: paidMatch },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { ...paidMatch, paidAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { ...paidMatch, paidAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { ...paidMatch, paidAt: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]),
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $regex: `^${currentMonth}` } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

  const totalIncome = allTime[0]?.total || 0;
  const totalExpenses = expenseAllTime[0]?.total || 0;
  const monthIncome = thisMonth[0]?.total || 0;
  const monthExpenses = expenseMonth[0]?.total || 0;

  return {
    totalAllTime: totalIncome,
    countAllTime: allTime[0]?.count || 0,
    totalThisMonth: monthIncome,
    countThisMonth: thisMonth[0]?.count || 0,
    totalToday: todayStats[0]?.total || 0,
    countToday: todayStats[0]?.count || 0,
    netAllTime: totalIncome - totalExpenses,
    netThisMonth: monthIncome - monthExpenses,
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
    const date = searchParams.get('date') || new Date().toISOString().substring(0, 10);

    const { start, end } = dayBounds(date);

    const [stats, invoices] = await Promise.all([
      getIncomeStats(),
      Payment.find({
        status: 'paid',
        paidAt: { $gte: start, $lte: end },
      })
        .populate('student', 'name phone grade')
        .sort({ paidAt: -1 }),
    ]);

    return NextResponse.json({
      stats,
      invoices,
      selectedDate: date,
      dayTotal: invoices.reduce((sum, p) => sum + p.amount, 0),
      dayCount: invoices.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
