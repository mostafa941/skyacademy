import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';
import TeacherAttendance from '@/models/TeacherAttendance';
import Expense from '@/models/Expense';
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
    const teacher = await Teacher.findById(id).populate('room');
    if (!teacher) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    }

    const [students, attendance, loans] = await Promise.all([
      Student.find({ teacher: id }).sort({ name: 1 }),
      TeacherAttendance.find({ teacher: id }).sort({ date: -1 }),
      Expense.find({ teacher: id, type: 'teacher_loan' }).sort({ date: -1 }),
    ]);

    return NextResponse.json({
      teacher: {
        id: teacher._id.toString(),
        name: teacher.name,
        phone: teacher.phone,
        type: teacher.type,
        subjectName: teacher.subjectName,
        roomName: (teacher.room as any)?.name || 'غير محددة',
        teacherPercentage: teacher.teacherPercentage,
        academyPercentage: teacher.academyPercentage,
        balance: teacher.balance,
        createdAt: teacher.createdAt,
      },
      students,
      attendance,
      loans,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
