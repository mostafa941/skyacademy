import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Payment from '@/models/Payment';
import Expense from '@/models/Expense';
import Income from '@/models/Income';
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

  const paidMatch = { status: { $in: ['paid', 'partial'] } };

  const [
    allTime, thisMonth, todayStats, dailyBreakdown, expenseAllTime, expenseMonth,
    manualAllTime, manualThisMonth, manualToday
  ] =
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
      Income.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Income.aggregate([
        { $match: { date: { $regex: `^${currentMonth}` } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Income.aggregate([
        { $match: { date: today } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

  const totalIncome = (allTime[0]?.total || 0) + (manualAllTime[0]?.total || 0);
  const totalExpenses = expenseAllTime[0]?.total || 0;
  const monthIncome = (thisMonth[0]?.total || 0) + (manualThisMonth[0]?.total || 0);
  const monthExpenses = expenseMonth[0]?.total || 0;
  
  // Notice we used `arguments` index in the manual replacement.
  // Actually, to make it clean, let's extract the array elements explicitly below.

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
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    let start: Date, end: Date;
    let queryDateStr = '';

    if (month) {
      const [year, m] = month.split('-').map(Number);
      start = new Date(Date.UTC(year, m - 1, 1));
      end = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
      queryDateStr = month;
    } else {
      const d = date || new Date().toISOString().substring(0, 10);
      const bounds = dayBounds(d);
      start = bounds.start;
      end = bounds.end;
      queryDateStr = d;
    }

    const [stats, invoices, manualIncomes] = await Promise.all([
      getIncomeStats(),
      Payment.find({
        status: { $in: ['paid', 'partial'] },
        paidAt: { $gte: start, $lte: end },
      })
        .populate('student', 'name phone parentPhone grade subjectName')
        .sort({ paidAt: -1 }),
      Income.find(month ? { date: { $regex: `^${month}` } } : { date: queryDateStr })
        .populate('createdBy', 'name')
        .populate('teacher', 'name subjectName')
        .sort({ createdAt: -1 }),
    ]);
    
    // Map manual incomes to match invoice shape roughly, or handle them in the frontend
    const combinedInvoices = [
      ...invoices.map(p => ({
        _id: p._id,
        type: 'student_payment',
        student: p.student,
        month: p.month,
        amount: p.amount,
        remainingAmount: p.remainingAmount || 0,
        paymentType: p.paymentType || 'monthly',
        paymentReason: p.paymentReason,
        paidAt: p.paidAt,
      })),
      ...manualIncomes.map(i => ({
        _id: i._id,
        type: 'manual_income',
        amount: i.amount,
        paymentReason: i.reason,
        subscriberName: i.subscriberName,
        staffType: i.staffType,
        teacher: i.teacher,
        paidAt: i.createdAt,
        createdBy: i.createdBy,
      }))
    ].sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    return NextResponse.json({
      stats,
      invoices: combinedInvoices,
      selectedDate: queryDateStr,
      dayTotal: combinedInvoices.reduce((sum, p) => sum + p.amount, 0),
      dayCount: combinedInvoices.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
