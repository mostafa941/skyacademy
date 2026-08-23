import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Payment from '@/models/Payment';
import Attendance from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';

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

    if (!isValidObjectId(teacherId)) {
      return NextResponse.json({ error: 'معرف المدرس غير صحيح' }, { status: 400 });
    }

    const currentMonth = new Date().toISOString().substring(0, 7);

    const [teacher, students] = await Promise.all([
      Teacher.findById(teacherId).lean(),
      Student.find({ teacher: teacherId }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!teacher) {
      return NextResponse.json({ error: 'المدرس/المدرب غير موجود' }, { status: 404 });
    }

    const teacherName = (teacher as any).name || 'غير محدد';

    const studentList = await Promise.all(
      students.map(async (st) => {
        const [payments, attendances] = await Promise.all([
          Payment.find({ student: st._id }).sort({ createdAt: -1 }).lean(),
          Attendance.find({ student: st._id }).sort({ date: -1 }).lean(),
        ]);

        const currentPayment = payments.find((p: any) => p.month === currentMonth);
        const totalPaid = payments
          .filter((p: any) => p.status === 'paid' || p.status === 'partial')
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const totalRemaining = payments.reduce((sum: number, p: any) => sum + (p.remainingAmount || 0), 0);

        const presentCount = attendances.filter((a: any) => a.status === 'present').length;
        const absentCount = attendances.filter((a: any) => a.status === 'absent').length;
        const excusedCount = attendances.filter((a: any) => a.status === 'excused').length;

        const attendanceHistory = attendances.map((a: any) => ({
          id: a._id.toString(),
          date: a.date,
          status: a.status,
          subjectName: a.subjectName,
          notes: a.notes,
        }));

        return {
          id: (st._id as any).toString(),
          name: st.name,
          phone: st.phone,
          parentPhone: st.parentPhone,
          subjectName: st.subjectName,
          teacherId: teacherId,
          teacherName: teacherName,
          grade: st.grade,
          monthlyFee: st.monthlyFee,
          notes: st.notes || '',
          grades: st.grades || [],
          type: st.type || 'student',
          paymentStatus: (currentPayment as any)?.status || 'unpaid',
          paymentAmount: (currentPayment as any)?.amount || 0,
          paymentType: (currentPayment as any)?.paymentType || 'monthly',
          paymentReason: (currentPayment as any)?.paymentReason || '',
          remainingAmount: (currentPayment as any)?.remainingAmount || 0,
          remainingReason: (currentPayment as any)?.remainingReason || '',
          totalPaid,
          totalRemaining,
          totalAttendance: attendances.length,
          presentCount,
          absentCount,
          excusedCount,
          attendanceHistory,
          paidAt: (currentPayment as any)?.paidAt || null,
          payments: payments.map((p: any) => ({
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
