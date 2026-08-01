import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';
import Payment from '@/models/Payment';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const month = searchParams.get('month');

    if (!teacherId || !month) {
      return NextResponse.json({ error: 'الرجاء تحديد المدرس والشهر' }, { status: 400 });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return NextResponse.json({ error: 'المدرس غير موجود' }, { status: 404 });
    }

    // Get all active students assigned to this teacher
    const activeStudents = await Student.find({ teacher: teacherId, isActive: true });

    // Get all payments from this teacher's students for the selected month
    const studentIds = activeStudents.map(s => s._id);
    const payments = await Payment.find({
      student: { $in: studentIds },
      month: month,
    });

    // Map payments by studentId for fast lookup
    const paymentMap = new Map(payments.map(p => [p.student.toString(), p]));

    // Build per-student breakdown
    let expectedIncome = 0;
    let collectedIncome = 0;

    const studentBreakdown = activeStudents.map(st => {
      const payment = paymentMap.get(st._id.toString());
      const fee = st.monthlyFee || 0;
      const paid = payment?.amount || 0;
      const remaining = payment?.remainingAmount || 0;
      const status = payment?.status || 'unpaid';
      const paymentReason = payment?.paymentReason || '-';

      expectedIncome += fee;
      collectedIncome += paid;

      return {
        studentId: st._id.toString(),
        studentName: st.name,
        studentPhone: st.phone,
        grade: st.grade || '',
        type: st.type,
        monthlyFee: fee,
        paidAmount: paid,
        remainingAmount: remaining,
        paymentStatus: status,
        paymentReason,
        teacherCutFromThisStudent: (paid * teacher.teacherPercentage) / 100,
      };
    });

    // Teacher's total percentage cut from collected income
    const teacherShare = (collectedIncome * teacher.teacherPercentage) / 100;

    // Current balance (accumulated since last settlement)
    const balance = teacher.balance || 0;

    // Net payout = current balance (includes all accumulated teacherCuts minus any loans)
    const netPayout = balance;

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher._id.toString(),
          name: teacher.name,
          type: teacher.type,
          percentage: teacher.teacherPercentage,
          balance: balance,
        },
        month,
        expectedIncome,
        collectedIncome,
        teacherShare,
        netPayout,
        studentsCount: activeStudents.length,
        paidCount: studentBreakdown.filter(s => s.paymentStatus === 'paid').length,
        partialCount: studentBreakdown.filter(s => s.paymentStatus === 'partial').length,
        unpaidCount: studentBreakdown.filter(s => s.paymentStatus === 'unpaid').length,
        studentBreakdown,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
