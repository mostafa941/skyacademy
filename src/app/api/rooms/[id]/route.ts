import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Room from '@/models/Room';
import Teacher from '@/models/Teacher';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const { id } = await params;
    const room = await Room.findById(id);
    if (!room) {
      return NextResponse.json({ error: 'القاعة غير موجودة' }, { status: 404 });
    }

    const assignedTeachers = await Teacher.find({ room: id });

    return NextResponse.json({
      room,
      assignedTeachers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
