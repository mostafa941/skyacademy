import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Subject from '@/models/Subject';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const subjects = await Subject.find({}).populate('teacher', 'name phone').sort({ name: 1 });
    return NextResponse.json({ subjects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'secretary')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();
    const body = await req.json();
    const { name, grade, teacherId, description } = body;
    if (!name || !grade) {
      return NextResponse.json({ error: 'اسم المادة والصف مطلوبان' }, { status: 400 });
    }
    let teacherData = null;
    if (teacherId) {
      teacherData = await User.findById(teacherId);
    }
    const subject = await Subject.create({
      name: name.trim(),
      grade: grade.trim(),
      teacher: teacherData?._id || undefined,
      teacherName: teacherData?.name || undefined,
      description: description?.trim(),
    });
    return NextResponse.json({ success: true, subject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
