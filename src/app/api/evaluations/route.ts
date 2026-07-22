import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Evaluation from '@/models/Evaluation';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    let query: any = {};
    if (currentUser.role === 'student') {
      query.student = currentUser._id;
    } else if (currentUser.role === 'teacher') {
      query.teacher = currentUser._id;
      if (studentId) query.student = studentId;
    } else if (studentId) {
      query.student = studentId;
    }

    const evaluations = await Evaluation.find(query)
      .populate('student', 'name phone grade')
      .populate('teacher', 'name subjectName')
      .populate('subject', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ evaluations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'teacher') {
      return NextResponse.json({ error: 'التقييمات للمدرسين فقط' }, { status: 403 });
    }
    await connectToDatabase();
    const body = await req.json();
    const { studentId, subjectId, rating, notes } = body;

    if (!studentId || !rating || !notes) {
      return NextResponse.json({ error: 'بيانات التقييم ناقصة' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'التقييم يجب أن يكون بين 1 و 5' }, { status: 400 });
    }

    const evaluation = await Evaluation.create({
      student: studentId,
      teacher: currentUser._id,
      subject: subjectId || undefined,
      rating,
      notes: notes.trim(),
    });

    return NextResponse.json({ success: true, evaluation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
