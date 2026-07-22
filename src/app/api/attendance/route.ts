import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');
    const date = searchParams.get('date');

    let query: any = {};
    if (currentUser.role === 'student') {
      query.student = currentUser._id;
    } else if (studentId) {
      query.student = studentId;
    }
    if (subjectId) query.subject = subjectId;
    if (date) query.date = date;

    const attendance = await Attendance.find(query)
      .populate('student', 'name phone grade')
      .populate('subject', 'name')
      .sort({ date: -1 });

    return NextResponse.json({ attendance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || (currentUser.role !== 'secretary' && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();
    const body = await req.json();
    const { studentId, subjectId, date, status, notes } = body;

    if (!studentId || !date || !status) {
      return NextResponse.json({ error: 'بيانات الحضور ناقصة' }, { status: 400 });
    }

    const record = await Attendance.findOneAndUpdate(
      { student: studentId, date, subject: subjectId || undefined },
      { student: studentId, subject: subjectId || undefined, date, status, notes },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
