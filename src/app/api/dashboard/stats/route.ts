import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Room from '@/models/Room';
import Note from '@/models/Note';
import Payment from '@/models/Payment';
import Expense from '@/models/Expense';
import Income from '@/models/Income';
import Attendance from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
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
      totalTrainers,
      totalRooms,
      uncompletedNotes,
      paidPayments,
      unpaidPayments,
      presentCount,
      absentCount,
      incomeAllTime,
      incomeMonth,
      incomeToday,
      manualIncomeAllTime,
      manualIncomeMonth,
      manualIncomeToday,
      expenseAllTime,
      expenseMonth,
      expenseToday,
    ] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments({ type: 'teacher' }),
      Teacher.countDocuments({ type: 'trainer' }),
      Room.countDocuments(),
      Note.countDocuments({ isCompleted: false }),
      Payment.countDocuments({ month: currentMonth, status: 'paid' }),
      Payment.countDocuments({ month: currentMonth, status: 'unpaid' }),
      Attendance.countDocuments({ status: 'present', date: today }),
      Attendance.countDocuments({ status: 'absent', date: today }),
      Payment.aggregate([
        { $match: { status: { $in: ['paid', 'partial'] } } },
        {
          $lookup: {
            from: 'teachers',
            localField: 'teacher',
            foreignField: '_id',
            as: 'teacherDoc'
          }
        },
        { $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            academyShare: {
              $sum: {
                $cond: [
                  { $ifNull: ['$teacherDoc', false] },
                  { $multiply: ['$amount', { $divide: [{ $ifNull: ['$teacherDoc.academyPercentage', 100] }, 100] }] },
                  '$amount'
                ]
              }
            }
          }
        }
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ['paid', 'partial'] }, paidAt: { $gte: monthStart, $lte: monthEnd } } },
        {
          $lookup: {
            from: 'teachers',
            localField: 'teacher',
            foreignField: '_id',
            as: 'teacherDoc'
          }
        },
        { $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            academyShare: {
              $sum: {
                $cond: [
                  { $ifNull: ['$teacherDoc', false] },
                  { $multiply: ['$amount', { $divide: [{ $ifNull: ['$teacherDoc.academyPercentage', 100] }, 100] }] },
                  '$amount'
                ]
              }
            }
          }
        }
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ['paid', 'partial'] }, paidAt: { $gte: todayStart, $lte: todayEnd } } },
        {
          $lookup: {
            from: 'teachers',
            localField: 'teacher',
            foreignField: '_id',
            as: 'teacherDoc'
          }
        },
        { $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            academyShare: {
              $sum: {
                $cond: [
                  { $ifNull: ['$teacherDoc', false] },
                  { $multiply: ['$amount', { $divide: [{ $ifNull: ['$teacherDoc.academyPercentage', 100] }, 100] }] },
                  '$amount'
                ]
              }
            }
          }
        }
      ]),
      Income.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Income.aggregate([
        { $match: { date: { $regex: `^${currentMonth}` } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Income.aggregate([
        { $match: { date: today } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([
        { $match: { date: { $regex: `^${currentMonth}` } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { date: today } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalIncome = (incomeAllTime[0]?.total || 0) + (manualIncomeAllTime[0]?.total || 0);
    const totalAcademyShare = (incomeAllTime[0]?.academyShare || 0) + (manualIncomeAllTime[0]?.total || 0);
    const totalExpenses = expenseAllTime[0]?.total || 0;
    
    const monthIncome = (incomeMonth[0]?.total || 0) + (manualIncomeMonth[0]?.total || 0);
    const monthAcademyShare = (incomeMonth[0]?.academyShare || 0) + (manualIncomeMonth[0]?.total || 0);
    const monthExpenses = expenseMonth[0]?.total || 0;
    
    const todayIncome = (incomeToday[0]?.total || 0) + (manualIncomeToday[0]?.total || 0);
    const todayAcademyShare = (incomeToday[0]?.academyShare || 0) + (manualIncomeToday[0]?.total || 0);
    const todayExpenses = expenseToday[0]?.total || 0;

    return NextResponse.json({
      stats: {
        totalStudents,
        totalTeachers,
        totalTrainers,
        totalRooms,
        uncompletedNotes,
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
          totalAcademyShare,
          totalExpenses,
          netProfit: totalAcademyShare - totalExpenses,
          monthIncome,
          monthAcademyShare,
          monthExpenses,
          netMonth: monthAcademyShare - monthExpenses,
          todayIncome,
          todayAcademyShare,
          todayExpenses,
          netToday: todayAcademyShare - todayExpenses,
          month: currentMonth,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
