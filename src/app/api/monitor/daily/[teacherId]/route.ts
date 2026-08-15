import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ teacherId: string }> }) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { teacherId } = await params;
    const { searchParams } = new URL(req.url);
    const dateQuery = searchParams.get('date');
    
    // Default to today in local timezone (Egypt) if not provided
    let dateStr = dateQuery;
    if (!dateStr) {
      const now = new Date();
      const offset = 3 * 60 * 60 * 1000;
      const localDate = new Date(now.getTime() + offset);
      dateStr = localDate.toISOString().substring(0, 10);
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return NextResponse.json({ error: 'المدرس غير موجود' }, { status: 404 });
    }

    // Get all students for this teacher
    const students = await Student.find({ teacher: teacherId })
      .sort({ name: 1 });

    const studentIds = students.map(s => s._id);

    // Get attendance records for these students on this date
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: dateStr
    });

    // Map records by student ID for quick lookup
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      attendanceMap.set(record.student.toString(), record);
    });

    const studentsData = students.map(s => {
      const record = attendanceMap.get(s._id.toString());
      return {
        id: s._id.toString(),
        name: s.name,
        phone: s.phone,
        parentPhone: s.parentPhone,
        grade: s.grade,
        status: record ? record.status : 'none', // present, absent, excused, none
        notes: record ? record.notes || '' : '',
      };
    });

    return NextResponse.json({ 
      teacher: { id: teacher._id.toString(), name: teacher.name, subjectName: teacher.subjectName },
      date: dateStr,
      students: studentsData
    });
  } catch (error: any) {
    console.error('Error fetching teacher daily attendance:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
