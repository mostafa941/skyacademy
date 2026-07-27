import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Room from '@/models/Room';
import Teacher from '@/models/Teacher';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const rooms = await Room.find().sort({ name: 1 });
    return NextResponse.json({ rooms });
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
    const { name, capacity, notes, schedule } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'اسم القاعة مطلوب' }, { status: 400 });
    }

    const room = await Room.create({
      name: name.trim(),
      capacity: Number(capacity) || 30,
      notes: notes?.trim() || '',
      schedule: schedule || [],
    });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const body = await req.json();
    const { id, name, capacity, notes, schedule } = body;

    if (!id) return NextResponse.json({ error: 'معرف القاعة مطلوب' }, { status: 400 });

    const room = await Room.findByIdAndUpdate(
      id,
      {
        name: name?.trim(),
        capacity: Number(capacity) || 30,
        notes: notes?.trim() || '',
        schedule: schedule || [],
      },
      { new: true }
    );

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'حذف القاعات متاح للأدمن فقط' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'معرف القاعة مطلوب' }, { status: 400 });

    await Room.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
