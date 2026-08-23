import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Payment from '@/models/Payment';
import Attendance from '@/models/Attendance';
import Teacher from '@/models/Teacher';
import { getCurrentUser } from '@/lib/auth';
import {
  sanitizeString,
  isValidObjectId,
  sanitizeNumber,
  isValidEnum,
} from '@/lib/validate';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['student', 'trainee'] as const;

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const month = searchParams.get('month');
    const grade = searchParams.get('grade');
    const teacherId = searchParams.get('teacherId');

    const query: Record<string, unknown> = {};
    if (type && isValidEnum(type, VALID_TYPES)) query.type = type;
    if (grade) query.grade = sanitizeString(grade, 100);
    if (teacherId && isValidObjectId(teacherId)) query.teacher = teacherId;
    if (search) {
      const safeSearch = sanitizeString(search, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
        { parentPhone: { $regex: safeSearch, $options: 'i' } },
        { subjectName: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const students = await Student.find(query).populate('teacher', 'name').sort({ createdAt: -1 }).lean();
    const targetMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')
      ? month!
      : new Date().toISOString().substring(0, 7);

    const studentList = await Promise.all(
      students.map(async (st) => {
        const [payment, attendances] = await Promise.all([
          Payment.findOne({ student: st._id, month: targetMonth }).lean(),
          Attendance.find({ student: st._id }).sort({ date: -1 }).lean(),
        ]);

        const totalAtt = attendances.length;
        const presentAtt = attendances.filter((a: any) => a.status === 'present').length;
        const absentAtt = attendances.filter((a: any) => a.status === 'absent').length;
        const excusedAtt = attendances.filter((a: any) => a.status === 'excused').length;

        const attendanceHistory = attendances.map((a: any) => ({
          id: a._id.toString(),
          date: a.date,
          status: a.status,
          subjectName: a.subjectName,
          notes: a.notes,
        }));

        const p = payment as any;
        return {
          id: (st._id as any).toString(),
          name: st.name,
          phone: st.phone,
          parentPhone: st.parentPhone,
          subjectName: st.subjectName,
          teacherId: (st.teacher as any)?._id?.toString() || '',
          teacherName: (st.teacher as any)?.name || 'غير محدد',
          grade: st.grade,
          monthlyFee: st.monthlyFee,
          notes: st.notes || '',
          grades: st.grades || [],
          paymentStatus: p ? p.status : 'unpaid',
          paymentAmount: p ? p.amount : 0,
          paymentType: p ? (p.paymentType || 'monthly') : 'monthly',
          paymentReason: p ? p.paymentReason : '',
          remainingAmount: p ? (p.remainingAmount || 0) : 0,
          remainingReason: p ? p.remainingReason : '',
          totalAttendance: totalAtt,
          presentCount: presentAtt,
          absentCount: absentAtt,
          excusedCount: excusedAtt,
          attendanceHistory,
          type: st.type || 'student',
          createdAt: st.createdAt,
        };
      })
    );

    return NextResponse.json({ students: studentList });
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
    const { name, phone, parentPhone, subjectName, teacherId, grade, monthlyFee, notes, type } = body;

    const cleanName = sanitizeString(name, 200);
    const cleanPhone = sanitizeString(phone, 20);
    const cleanParentPhone = sanitizeString(parentPhone, 20);
    const cleanSubject = sanitizeString(subjectName, 200);
    const cleanNotes = sanitizeString(notes, 1000);
    const cleanType = isValidEnum(type, VALID_TYPES) ? type : 'student';
    const isTrainee = cleanType === 'trainee';
    const cleanGrade = isTrainee ? 'متدرب' : sanitizeString(grade, 100);
    const cleanTeacherId = teacherId && isValidObjectId(teacherId) ? teacherId : undefined;
    const fee = sanitizeNumber(monthlyFee, 0, 100000);

    if (!cleanName || !cleanPhone || !cleanParentPhone || !cleanSubject || (!isTrainee && !cleanGrade)) {
      return NextResponse.json({ error: 'يرجى إدخال اسم الطالب، رقم الفون، رقم فون الوالد، المادة، والصف' }, { status: 400 });
    }
    if (cleanName.length < 2) {
      return NextResponse.json({ error: 'الاسم يجب أن يكون حرفين على الأقل' }, { status: 400 });
    }

    const student = await Student.create({
      name: cleanName,
      phone: cleanPhone,
      parentPhone: cleanParentPhone,
      subjectName: cleanSubject,
      teacher: cleanTeacherId,
      grade: cleanGrade,
      monthlyFee: fee,
      notes: cleanNotes,
      type: cleanType,
    });

    // Create current month payment placeholder
    const currentMonth = new Date().toISOString().substring(0, 7);
    await Payment.create({
      student: student._id,
      month: currentMonth,
      amount: fee,
      status: 'unpaid',
      paymentReason: 'مصاريف الدرس',
    });

    return NextResponse.json({ success: true, student });
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
    const { id, name, phone, parentPhone, subjectName, teacherId, grade, monthlyFee, notes, grades, type } = body;

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: 'معرف الطالب غير صحيح' }, { status: 400 });
    }

    const cleanName = sanitizeString(name, 200);
    const cleanPhone = sanitizeString(phone, 20);
    const cleanParentPhone = sanitizeString(parentPhone, 20);
    const cleanSubject = sanitizeString(subjectName, 200);
    const cleanNotes = sanitizeString(notes, 1000);
    const cleanType = isValidEnum(type, VALID_TYPES) ? type : undefined;
    const cleanTeacherId = teacherId && isValidObjectId(teacherId) ? teacherId : undefined;
    const fee = sanitizeNumber(monthlyFee, 0, 100000);

    const updateData: Record<string, unknown> = {
      name: cleanName,
      phone: cleanPhone,
      parentPhone: cleanParentPhone,
      subjectName: cleanSubject,
      teacher: cleanTeacherId,
      monthlyFee: fee,
      notes: cleanNotes,
    };

    if (Array.isArray(grades)) {
      updateData.grades = grades.slice(0, 50);
    }
    if (cleanType) {
      updateData.type = cleanType;
      if (cleanType === 'trainee') {
        updateData.grade = 'متدرب';
      }
    }
    if (cleanType !== 'trainee' && grade) {
      updateData.grade = sanitizeString(grade, 100);
    }

    const updatedStudent = await Student.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedStudent) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: 'معرف الطالب غير صحيح' }, { status: 400 });
    }

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    await Promise.all([
      Student.findByIdAndDelete(id),
      Payment.deleteMany({ student: id }),
      Attendance.deleteMany({ student: id }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
