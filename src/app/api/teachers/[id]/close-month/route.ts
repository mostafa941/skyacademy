import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';
import Payment from '@/models/Payment';
import Attendance from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';
import { isValidObjectId, isValidMonth } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    await connectToDatabase();
    const { id: teacherId } = await params;
    if (!isValidObjectId(teacherId)) {
      return NextResponse.json({ error: 'Invalid teacher ID' }, { status: 400 });
    }
    const body = await req.json();
    const { month } = body;
    if (!isValidMonth(month)) {
      return NextResponse.json({ error: 'Invalid month (YYYY-MM)' }, { status: 400 });
    }
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    const students = await Student.find({ teacher: teacherId }).lean();
    const studentIds = students.map((s: any) => s._id);
    if (studentIds.length === 0) {
      teacher.balance = 0;
      await teacher.save();
      return NextResponse.json({ success: true, paidStudents: [], unpaidStudents: [], deletedAttendance: 0 });
    }
    const inOp = { $in: studentIds };
    const payments = await Payment.find({ student: inOp, month }).lean();
    const paymentMap = new Map(payments.map((p: any) => [p.student.toString(), p]));
    const paidStudents: any[] = [];
    const unpaidStudents: any[] = [];
    for (const st of students) {
      const stId = (st._id as any).toString();
      const payment = paymentMap.get(stId) as any;
      if (payment && (payment.status === 'paid' || payment.status === 'partial')) {
        paidStudents.push({ id: stId, name: (st as any).name, amount: payment.amount, phone: (st as any).phone });
      } else {
        unpaidStudents.push({ id: stId, name: (st as any).name, phone: (st as any).phone, monthlyFee: (st as any).monthlyFee });
      }
    }
    const attendanceResult = await Attendance.deleteMany({ student: inOp, date: { $gte: month + '-01', $lte: month + '-31' } });
    teacher.balance = 0;
    await teacher.save();
    const [year, mon] = month.split('-').map(Number);
    const nextDate = new Date(year, mon, 1);
    const nextMonth = nextDate.getFullYear() + '-' + String(nextDate.getMonth() + 1).padStart(2, '0');
    const bulkOps: any[] = students.map((st: any) => ({
      updateOne: {
        filter: { student: st._id, month: nextMonth },
        update: {
          $setOnInsert: {
            student: st._id,
            teacher: teacherId,
            month: nextMonth,
            amount: 0,
            status: 'unpaid',
            paymentType: 'monthly',
            paymentReason: 'monthly fees',
            remainingAmount: st.monthlyFee || 0,
          },
        },
        upsert: true,
      },
    }));
    if (bulkOps.length > 0) await Payment.bulkWrite(bulkOps);
    return NextResponse.json({
      success: true,
      message: 'Month closed',
      paidStudents,
      unpaidStudents,
      deletedAttendance: attendanceResult.deletedCount,
      nextMonth,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}