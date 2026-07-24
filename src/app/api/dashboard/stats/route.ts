import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import Subject from '@/models/Subject';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import Expense from '@/models/Expense';
import Attendance from '@/models/Attendance';
import Evaluation from '@/models/Evaluation';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();

    const currentMonth = new Date().toISOString().substring(0, 7);
    const today = new Date().toISOString().substring(0, 10);
    const [year, monthNum] = currentMonth.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
    const todayStart = new Date(`${today}T00:00:00.000Z`);
    const todayEnd = new Date(`${today}T23:59:59.999Z`);

    const [
      totalStudents,
      totalTeachers,
      totalSecretaries,
      totalSubjects,
      paidPayments,
      unpaidPayments,
      presentCount,
      absentCount,
      recentEvaluations,
      recentStudents,
      incomeAllTime,
      incomeMonth,
      incomeToday,
      expenseAllTime,
      expenseMonth,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'secretary' }),
      Subject.countDocuments(),
      Payment.countDocuments({ month: currentMonth, status: 'paid' }),
      Payment.countDocuments({ month: currentMonth, status: 'unpaid' }),
      Attendance.countDocuments({ status: 'present' }),
      Attendance.countDocuments({ status: 'absent' }),
      Evaluation.find({})
        .populate('student', 'name')
        .populate('teacher', 'name subjectName')
        .sort({ createdAt: -1 })
        .limit(5),
      User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(5),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([
        { $match: { date: { $regex: `^${currentMonth}` } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalIncome = incomeAllTime[0]?.total || 0;
    const totalExpenses = expenseAllTime[0]?.total || 0;
    const monthIncome = incomeMonth[0]?.total || 0;
    const monthExpenses = expenseMonth[0]?.total || 0;

    return NextResponse.json({
      stats: {
        totalStudents,
        totalTeachers,
        totalSecretaries,
        totalSubjects,
        payments: {
          paid: paidPayments,
          unpaid: unpaidPayments,
          month: currentMonth,
        },
        attendance: {
          present: presentCount,
          absent: absentCount,
          rate: presentCount + absentCount > 0
            ? Math.round((presentCount / (presentCount + absentCount)) * 100)
            : 100,
        },
        finance: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          monthIncome,
          monthExpenses,
          netMonth: monthIncome - monthExpenses,
          todayIncome: incomeToday[0]?.total || 0,
          month: currentMonth,
        },
      },
      recentEvaluations,
      recentStudents,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
