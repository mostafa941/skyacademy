import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import Subject from '@/models/Subject';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
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
    ]);

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
      },
      recentEvaluations,
      recentStudents,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
