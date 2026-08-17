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
    const date = searchParams.get('date');

    let query: any = {};
    if (studentId) {
      query.student = studentId;
    }
    if (date) query.date = date;

    const attendance = await Attendance.find(query)
      .populate({
        path: 'student',
        select: 'name phone parentPhone grade subjectName teacher type',
        populate: {
          path: 'teacher',
          select: 'name'
        }
      })
      .sort({ date: -1 });

    return NextResponse.json({ attendance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();
    const body = await req.json();
    const { studentId, subjectName, date, status, notes } = body;

    if (!studentId || !date || !status) {
      return NextResponse.json({ error: 'بيانات الحضور ناقصة' }, { status: 400 });
    }

    const record = await Attendance.findOneAndUpdate(
      { student: studentId, date },
      { student: studentId, subjectName: subjectName || undefined, date, status, notes: notes?.trim() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
