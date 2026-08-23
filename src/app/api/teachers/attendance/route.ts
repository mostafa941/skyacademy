import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import TeacherAttendance from '@/models/TeacherAttendance';
import { getCurrentUser } from '@/lib/auth';
import { isValidObjectId, sanitizeString, isValidDate, isValidEnum } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['present', 'absent'] as const;

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const date = searchParams.get('date');

    const query: Record<string, unknown> = {};
    if (teacherId && isValidObjectId(teacherId)) query.teacher = teacherId;
    if (date && isValidDate(date)) query.date = date;

    const attendance = await TeacherAttendance.find(query)
      .populate('teacher', 'name phone type subjectName')
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
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const body = await req.json();
    const { teacherId, date, status, notes } = body;

    if (!teacherId || !isValidObjectId(teacherId)) {
      return NextResponse.json({ error: 'معرف المدرس غير صحيح' }, { status: 400 });
    }
    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: 'التاريخ غير صحيح (YYYY-MM-DD)' }, { status: 400 });
    }
    if (!isValidEnum(status, VALID_STATUS)) {
      return NextResponse.json({ error: 'حالة الحضور غير صحيحة' }, { status: 400 });
    }

    const cleanNotes = sanitizeString(notes, 500);

    const record = await TeacherAttendance.findOneAndUpdate(
      { teacher: teacherId, date },
      { teacher: teacherId, date, status, notes: cleanNotes },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
