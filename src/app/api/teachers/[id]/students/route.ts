import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Payment from '@/models/Payment';
import Attendance from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { id: teacherId } = await params;
    const currentMonth = new Date().toISOString().substring(0, 7);

    const students = await Student.find({ teacher: teacherId }).sort({ createdAt: -1 });

    const studentList = await Promise.all(
      students.map(async (st) => {
        const [payments, attendances] = await Promise.all([
          Payment.find({ student: st._id }).sort({ createdAt: -1 }),
          Attendance.find({ student: st._id }),
        ]);

        const currentPayment = payments.find((p) => p.month === currentMonth);
        const totalPaid = payments
          .filter((p) => p.status === 'paid' || p.status === 'partial')
          .reduce((sum, p) => sum + p.amount, 0);
        const totalRemaining = payments.reduce((sum, p) => sum + (p.remainingAmount || 0), 0);

        const presentCount = attendances.filter((a) => a.status === 'present').length;
        const absentCount = attendances.filter((a) => a.status === 'absent').length;

        return {
          id: st._id.toString(),
          name: st.name,
          phone: st.phone,
          parentPhone: st.parentPhone,
          subjectName: st.subjectName,
          grade: st.grade,
          monthlyFee: st.monthlyFee,
          paymentStatus: currentPayment?.status || 'unpaid',
          paymentAmount: currentPayment?.amount || 0,
          paymentType: currentPayment?.paymentType || 'monthly',
          paymentReason: currentPayment?.paymentReason || '',
          remainingAmount: currentPayment?.remainingAmount || 0,
          remainingReason: currentPayment?.remainingReason || '',
          totalPaid,
          totalRemaining,
          presentCount,
          absentCount,
          paidAt: currentPayment?.paidAt || null,
          payments: payments.map((p) => ({
            id: p._id.toString(),
            month: p.month,
            amount: p.amount,
            paymentType: p.paymentType || 'monthly',
            paymentReason: p.paymentReason || '',
            remainingAmount: p.remainingAmount || 0,
            remainingReason: p.remainingReason || '',
            status: p.status,
            paidAt: p.paidAt,
          })),
        };
      })
    );

    return NextResponse.json({ students: studentList });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
