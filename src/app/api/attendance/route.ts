import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';
import { isValidObjectId, sanitizeString, isValidDate, isValidEnum } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['present', 'absent', 'excused'] as const;

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');

    const query: Record<string, unknown> = {};
    if (studentId && isValidObjectId(studentId)) query.student = studentId;
    if (date && isValidDate(date)) query.date = date;

    const attendance = await Attendance.find(query)
      .populate({
        path: 'student',
        select: 'name phone parentPhone grade subjectName teacher type',
        populate: {
          path: 'teacher',
          select: 'name',
        },
      })
      .sort({ date: -1 })
      .lean();

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

    if (!studentId || !isValidObjectId(studentId)) {
      return NextResponse.json({ error: 'معرف الطالب غير صحيح' }, { status: 400 });
    }
    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: 'التاريخ غير صحيح (YYYY-MM-DD)' }, { status: 400 });
    }
    if (!isValidEnum(status, VALID_STATUS)) {
      return NextResponse.json({ error: 'حالة الحضور غير صحيحة' }, { status: 400 });
    }

    const cleanSubject = sanitizeString(subjectName, 200);
    const cleanNotes = sanitizeString(notes, 500);

    const record = await Attendance.findOneAndUpdate(
      { student: studentId, date },
      {
        student: studentId,
        subjectName: cleanSubject || undefined,
        date,
        status,
        notes: cleanNotes,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
