import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import Subject from '@/models/Subject';
import Enrollment from '@/models/Enrollment';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const teachers = await User.find({ role: 'teacher' }).sort({ createdAt: -1 });

    const teachersList = await Promise.all(
      teachers.map(async (t) => {
        // Find subject taught by teacher
        const subject = await Subject.findOne({
          $or: [{ teacher: t._id }, { name: t.subjectName }],
        });

        let studentCount = 0;
        if (subject) {
          studentCount = await Enrollment.countDocuments({ subject: subject._id });
        }

        return {
          id: t._id.toString(),
          name: t.name,
          email: t.email || '-',
          phone: t.phone,
          subjectName: t.subjectName || subject?.name || 'مادة متخصصة',
          subjectId: subject?._id?.toString(),
          studentCount,
          createdAt: t.createdAt,
        };
      })
    );

    return NextResponse.json({ teachers: teachersList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
