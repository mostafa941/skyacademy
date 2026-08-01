import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Payment from '@/models/Payment';
import Attendance from '@/models/Attendance';
import Teacher from '@/models/Teacher';
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
    const search = searchParams.get('search');
    const type = searchParams.get('type'); // 'student' | 'trainee'
    const month = searchParams.get('month');

    let query: any = {};
    if (type) {
      query.type = type;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { parentPhone: { $regex: search, $options: 'i' } },
        { subjectName: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await Student.find(query).populate('teacher').sort({ createdAt: -1 });
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    // Populate payment status & attendance for each student
    const studentList = await Promise.all(
      students.map(async (st) => {
        const [payment, attendances] = await Promise.all([
          Payment.findOne({ student: st._id, month: targetMonth }),
          Attendance.find({ student: st._id }),
        ]);

        const totalAtt = attendances.length;
        const presentAtt = attendances.filter((a) => a.status === 'present').length;
        const absentAtt = attendances.filter((a) => a.status === 'absent').length;

        return {
          id: st._id.toString(),
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
          paymentStatus: payment ? payment.status : 'unpaid',
          paymentAmount: payment ? payment.amount : 0,
          paymentReason: payment ? payment.paymentReason : '',
          remainingAmount: payment ? payment.remainingAmount : 0,
          remainingReason: payment ? payment.remainingReason : '',
          totalAttendance: totalAtt,
          presentCount: presentAtt,
          absentCount: absentAtt,
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

    const isTrainee = type === 'trainee';
    if (!name || !phone || !parentPhone || !subjectName || (!isTrainee && !grade)) {
      return NextResponse.json({ error: 'يرجى إدخال اسم الطالب، رقم الفون، رقم فون الوالد، المادة، والصف' }, { status: 400 });
    }

    const student = await Student.create({
      name: name.trim(),
      phone: phone.trim(),
      parentPhone: parentPhone.trim(),
      subjectName: subjectName.trim(),
      teacher: teacherId || undefined,
      grade: isTrainee ? 'متدرب' : grade.trim(),
      monthlyFee: Number(monthlyFee) || 0,
      notes: notes?.trim() || '',
      type: type || 'student',
    });

    // Create current month payment placeholder
    const currentMonth = new Date().toISOString().substring(0, 7);
    await Payment.create({
      student: student._id,
      month: currentMonth,
      amount: Number(monthlyFee) || 0,
      status: 'unpaid',
      paymentReason: 'مصاريف الدرس',
    });

    // Removed notification

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

    if (!id) {
      return NextResponse.json({ error: 'معرف الطالب مطلوب' }, { status: 400 });
    }

    const updateData: any = {
      name: name?.trim(),
      phone: phone?.trim(),
      parentPhone: parentPhone?.trim(),
      subjectName: subjectName?.trim(),
      teacher: teacherId || undefined,
      monthlyFee: Number(monthlyFee) || 0,
      notes: notes?.trim() || '',
      grades: grades || [],
    };
    
    if (type) {
      updateData.type = type;
      if (type === 'trainee') {
        updateData.grade = 'متدرب';
      }
    }
    if (type !== 'trainee' && grade) {
      updateData.grade = grade.trim();
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

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

    if (!id) {
      return NextResponse.json({ error: 'معرف الطالب مطلوب' }, { status: 400 });
    }

    await Student.findByIdAndDelete(id);
    await Payment.deleteMany({ student: id });
    await Attendance.deleteMany({ student: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
