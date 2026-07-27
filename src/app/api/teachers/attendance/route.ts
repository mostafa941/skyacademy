import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import TeacherAttendance from '@/models/TeacherAttendance';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const date = searchParams.get('date');

    let query: any = {};
    if (teacherId) query.teacher = teacherId;
    if (date) query.date = date;

    const attendance = await TeacherAttendance.find(query)
      .populate('teacher', 'name phone type subjectName')
      .sort({ date: -1 });

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

    if (!teacherId || !date || !status) {
      return NextResponse.json({ error: 'بيانات الحضور ناقصة' }, { status: 400 });
    }

    const record = await TeacherAttendance.findOneAndUpdate(
      { teacher: teacherId, date },
      { teacher: teacherId, date, status, notes: notes?.trim() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
