import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import Subject from '@/models/Subject';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import Attendance from '@/models/Attendance';
import Evaluation from '@/models/Evaluation';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    await connectToDatabase();

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    if (currentUser.role === 'student') {
      // Return student's detailed info
      const enrollments = await Enrollment.find({ student: currentUser._id }).populate('subject');
      const payments = await Payment.find({ student: currentUser._id }).sort({ month: -1 });
      const attendance = await Attendance.find({ student: currentUser._id }).sort({ date: -1 });
      const evaluations = await Evaluation.find({ student: currentUser._id }).populate('teacher', 'name subjectName');

      return NextResponse.json({
        student: {
          id: currentUser._id.toString(),
          name: currentUser.name,
          phone: currentUser.phone,
          grade: currentUser.grade,
        },
        enrollments,
        payments,
        attendance,
        evaluations,
      });
    }

    let studentQuery: any = { role: 'student' };

    // If teacher, find students enrolled in teacher's subjects
    if (currentUser.role === 'teacher') {
      const teacherSubjects = await Subject.find({
        $or: [{ teacher: currentUser._id }, { name: currentUser.subjectName }],
      });
      const subjectIds = teacherSubjects.map((s) => s._id);

      const enrollments = await Enrollment.find({ subject: { $in: subjectIds } });
      const studentIds = enrollments.map((e) => e.student);

      studentQuery = { _id: { $in: studentIds }, role: 'student' };
    }

    const students = await User.find(studentQuery).sort({ createdAt: -1 });

    // Fetch related statistics for each student
    const studentListWithDetails = await Promise.all(
      students.map(async (st) => {
        const enrollments = await Enrollment.find({ student: st._id }).populate('subject');
        const currentPayment = await Payment.findOne({ student: st._id, month: currentMonth });
        const attendanceRecords = await Attendance.find({ student: st._id });
        const evaluations = await Evaluation.find({ student: st._id }).populate('teacher', 'name subjectName');

        const totalAtt = attendanceRecords.length;
        const presentAtt = attendanceRecords.filter((a) => a.status === 'present').length;
        const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

        return {
          id: st._id.toString(),
          name: st.name,
          phone: st.phone,
          grade: st.grade || 'غير محدد',
          createdAt: st.createdAt,
          subjects: enrollments.map((e: any) => ({
            id: e.subject?._id?.toString(),
            name: e.subject?.name || 'مادة متخصصة',
            score: e.score,
            maxScore: e.maxScore,
            teacherName: e.subject?.teacherName || 'مدرس المادة',
          })),
          paymentStatus: currentPayment ? currentPayment.status : 'unpaid',
          paymentAmount: currentPayment ? currentPayment.amount : 0,
          attendanceRate,
          totalAttendance: totalAtt,
          absentCount: totalAtt - presentAtt,
          evaluations: evaluations.map((ev: any) => ({
            id: ev._id.toString(),
            teacherName: ev.teacher?.name || 'مدرس الأكاديمية',
            rating: ev.rating,
            notes: ev.notes,
            date: ev.createdAt,
          })),
        };
      })
    );

    return NextResponse.json({ students: studentListWithDetails });
  } catch (error: any) {
    console.error('Fetch students error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || (currentUser.role !== 'secretary' && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'إضافة الطلاب مسموحة للسكرتيرة والأدمن فقط' }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { name, phone, grade, subjectIds, monthlyFee } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'اسم الطالب ورقم الهاتف مطلوبان' }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Check existing
    let student = await User.findOne({ phone: cleanPhone });
    if (student) {
      if (student.role !== 'student') {
        return NextResponse.json({ error: 'رقم الهاتف مسجل لحساب نوع آخر' }, { status: 400 });
      }
      student.name = name.trim();
      student.grade = grade?.trim() || student.grade;
      await student.save();
    } else {
      student = await User.create({
        name: name.trim(),
        phone: cleanPhone,
        grade: grade?.trim() || 'الصف الأول الثانوي',
        role: 'student',
      });
    }

    // Assign subjects
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      for (const subId of subjectIds) {
        await Enrollment.findOneAndUpdate(
          { student: student._id, subject: subId },
          { student: student._id, subject: subId },
          { upsert: true }
        );
      }
    }

    // Initialize current month payment record
    const currentMonth = new Date().toISOString().substring(0, 7);
    await Payment.findOneAndUpdate(
      { student: student._id, month: currentMonth },
      {
        student: student._id,
        month: currentMonth,
        amount: monthlyFee || 300,
        status: 'unpaid',
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'تم إضافة الطالب وتخصيص المواد بنجاح',
      student: {
        id: student._id.toString(),
        name: student.name,
        phone: student.phone,
        grade: student.grade,
      },
    });
  } catch (error: any) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
