import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';
import Room from '@/models/Room';
import TeacherAttendance from '@/models/TeacherAttendance';
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
    const type = searchParams.get('type'); // 'teacher' | 'trainer'

    let query: any = {};
    if (type) {
      query.type = type;
    }

    const teachers = await Teacher.find(query).populate('room').sort({ createdAt: -1 });

    const teacherList = await Promise.all(
      teachers.map(async (t) => {
        const [studentCount, attendanceRecords] = await Promise.all([
          Student.countDocuments({ teacher: t._id }),
          TeacherAttendance.find({ teacher: t._id }),
        ]);

        const totalAtt = attendanceRecords.length;
        const presentCount = attendanceRecords.filter((a) => a.status === 'present').length;
        const absentCount = attendanceRecords.filter((a) => a.status === 'absent').length;

        return {
          id: t._id.toString(),
          name: t.name,
          phone: t.phone,
          type: t.type,
          subjectName: t.subjectName,
          grades: t.grades || [],
          roomId: (t.room as any)?._id?.toString() || '',
          roomName: (t.room as any)?.name || 'غير محددة',
          teacherPercentage: t.teacherPercentage,
          academyPercentage: t.academyPercentage,
          balance: t.balance,
          studentCount,
          totalAttendance: totalAtt,
          presentCount,
          absentCount,
          createdAt: t.createdAt,
        };
      })
    );

    return NextResponse.json({ teachers: teacherList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { name, phone, type, subjectName, grades, roomId, teacherPercentage, academyPercentage, balance } = body;

    if (!name || !phone || !subjectName) {
      return NextResponse.json({ error: 'الاسم ورقم الهاتف والمادة مطلوبة' }, { status: 400 });
    }

    const teacher = await Teacher.create({
      name: name.trim(),
      phone: phone.trim(),
      type: type === 'trainer' ? 'trainer' : 'teacher',
      subjectName: subjectName.trim(),
      grades: grades || [],
      room: roomId || undefined,
      teacherPercentage: Number(teacherPercentage) || 50,
      academyPercentage: Number(academyPercentage) || 50,
      balance: Number(balance) || 0,
    });

    return NextResponse.json({ success: true, teacher });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { id, name, phone, type, subjectName, grades, roomId, teacherPercentage, academyPercentage, balance } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المدرس/المدرب مطلوب' }, { status: 400 });
    }

    const updated = await Teacher.findByIdAndUpdate(
      id,
      {
        name: name?.trim(),
        phone: phone?.trim(),
        type: type === 'trainer' ? 'trainer' : 'teacher',
        subjectName: subjectName?.trim(),
        grades: grades || [],
        room: roomId || undefined,
        teacherPercentage: Number(teacherPercentage) ?? 50,
        academyPercentage: Number(academyPercentage) ?? 50,
        // NOTE: balance is intentionally NOT updated here.
        // Balance only changes via /api/payments (student pays) or /api/expenses (teacher loan).
      },
      { new: true }
    );

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'حذف المدرسين متاح للأدمن فقط' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المدرس مطلوب' }, { status: 400 });
    }

    await Teacher.findByIdAndDelete(id);
    await TeacherAttendance.deleteMany({ teacher: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
