import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { id } = await params;
    const teacher = await Teacher.findById(id);
    
    if (!teacher) {
      return NextResponse.json({ error: 'المدرس/المدرب غير موجود' }, { status: 404 });
    }

    if (teacher.balance >= 0) {
      return NextResponse.json({ error: 'لا يوجد سلفة على هذا المدرس/المدرب لكي يتم حذفها' }, { status: 400 });
    }

    // Reset balance to 0
    teacher.balance = 0;
    await teacher.save();

    return NextResponse.json({ success: true, message: 'تم إزالة السلفة بنجاح وتصفير الرصيد السالب' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
