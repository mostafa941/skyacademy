import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';
import Room from '@/models/Room';
import TeacherAttendance from '@/models/TeacherAttendance';
import Payment from '@/models/Payment';
import Expense from '@/models/Expense';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeString, isValidObjectId, sanitizePercentage, sanitizeNumber } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    // Validate type param
    const validType = type === 'teacher' || type === 'trainer' ? type : undefined;
    const query: Record<string, unknown> = {};
    if (validType) query.type = validType;

    const teachers = await Teacher.find(query).populate('room').sort({ createdAt: -1 }).lean();

    const teacherList = await Promise.all(
      teachers.map(async (t) => {
        const teacherId = (t._id as any).toString();
        const [studentCount, attendanceRecords, payments, loans] = await Promise.all([
          Student.countDocuments({ teacher: t._id }),
          TeacherAttendance.find({ teacher: t._id }).select('status').lean(),
          Payment.find({ teacher: t._id, status: { $in: ['paid', 'partial'] } }).select('amount').lean(),
          Expense.find({ teacher: t._id, type: 'teacher_loan' }).select('amount').lean(),
        ]);

        const presentCount = attendanceRecords.filter((a: any) => a.status === 'present').length;
        const absentCount = attendanceRecords.filter((a: any) => a.status === 'absent').length;
        const totalCollected = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const totalLoans = loans.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        const rawTeacherShare = payments.reduce((sum: number, p: any) => sum + ((p.amount || 0) * ((t.teacherPercentage || 50) / 100)), 0);
        const calculatedBalance = rawTeacherShare - totalLoans;

        return {
          id: teacherId,
          name: t.name,
          phone: t.phone,
          type: t.type,
          subjectName: t.subjectName,
          grades: t.grades || [],
          roomId: (t.room as any)?._id?.toString() || '',
          roomName: (t.room as any)?.name || 'غير محددة',
          teacherPercentage: t.teacherPercentage,
          academyPercentage: t.academyPercentage,
          balance: calculatedBalance,
          totalCollected,
          studentCount,
          totalAttendance: attendanceRecords.length,
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
    const { name, phone, type, subjectName, grades, roomId, teacherPercentage, academyPercentage } = body;

    const cleanName = sanitizeString(name, 200);
    const cleanPhone = sanitizeString(phone, 20);
    const cleanSubject = sanitizeString(subjectName, 200);

    if (!cleanName || !cleanPhone || !cleanSubject) {
      return NextResponse.json({ error: 'الاسم ورقم الهاتف والمادة مطلوبة' }, { status: 400 });
    }
    if (cleanName.length < 2) {
      return NextResponse.json({ error: 'الاسم يجب أن يكون حرفين على الأقل' }, { status: 400 });
    }

    const validType = type === 'trainer' ? 'trainer' : 'teacher';
    const validRoomId = roomId && isValidObjectId(roomId) ? roomId : undefined;
    const tPct = sanitizePercentage(teacherPercentage, 50);
    const aPct = 100 - tPct;
    const cleanGrades = Array.isArray(grades)
      ? grades.map((g: unknown) => sanitizeString(g, 100)).filter(Boolean).slice(0, 20)
      : [];

    const teacher = await Teacher.create({
      name: cleanName,
      phone: cleanPhone,
      type: validType,
      subjectName: cleanSubject,
      grades: cleanGrades,
      room: validRoomId,
      teacherPercentage: tPct,
      academyPercentage: aPct,
      balance: 0,
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
    const { id, name, phone, type, subjectName, grades, roomId, teacherPercentage, academyPercentage } = body;

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: 'معرف المدرس/المدرب غير صحيح' }, { status: 400 });
    }

    const cleanName = sanitizeString(name, 200);
    const cleanPhone = sanitizeString(phone, 20);
    const cleanSubject = sanitizeString(subjectName, 200);

    if (!cleanName || !cleanPhone || !cleanSubject) {
      return NextResponse.json({ error: 'الاسم والهاتف والمادة مطلوبة' }, { status: 400 });
    }

    const validType = type === 'trainer' ? 'trainer' : 'teacher';
    const validRoomId = roomId && isValidObjectId(roomId) ? roomId : undefined;
    const tPct = sanitizePercentage(teacherPercentage, 50);
    const aPct = 100 - tPct;
    const cleanGrades = Array.isArray(grades)
      ? grades.map((g: unknown) => sanitizeString(g, 100)).filter(Boolean).slice(0, 20)
      : [];

    const updated = await Teacher.findByIdAndUpdate(
      id,
      {
        name: cleanName,
        phone: cleanPhone,
        type: validType,
        subjectName: cleanSubject,
        grades: cleanGrades,
        room: validRoomId,
        teacherPercentage: tPct,
        academyPercentage: aPct,
        // NOTE: balance is NOT updated here. Changes via /api/payments or /api/expenses only.
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'المدرس/المدرب غير موجود' }, { status: 404 });
    }

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

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: 'معرف المدرس غير صحيح' }, { status: 400 });
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return NextResponse.json({ error: 'المدرس/المدرب غير موجود' }, { status: 404 });
    }

    await Teacher.findByIdAndDelete(id);
    await TeacherAttendance.deleteMany({ teacher: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
