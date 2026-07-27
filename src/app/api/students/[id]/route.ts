import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Payment from '@/models/Payment';
import Attendance from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { id } = await params;
    const student = await Student.findById(id).populate('teacher');
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const [payments, attendance] = await Promise.all([
      Payment.find({ student: id }).sort({ month: -1 }),
      Attendance.find({ student: id }).sort({ date: -1 }),
    ]);

    return NextResponse.json({
      student: {
        id: student._id.toString(),
        name: student.name,
        phone: student.phone,
        parentPhone: student.parentPhone,
        subjectName: student.subjectName,
        teacherName: (student.teacher as any)?.name || 'غير محدد',
        grade: student.grade,
        monthlyFee: student.monthlyFee,
        notes: student.notes,
        grades: student.grades || [],
        createdAt: student.createdAt,
      },
      payments,
      attendance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
