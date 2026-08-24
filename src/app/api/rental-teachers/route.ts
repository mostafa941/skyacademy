import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RentalTeacher from '@/models/RentalTeacher';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') !== 'false';

    const query: Record<string, unknown> = {};
    if (activeOnly) query.isActive = true;

    const rentalTeachers = await RentalTeacher.find(query)
      .populate('room', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, rentalTeachers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح - أدمن فقط' }, { status: 403 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { name, phone, subjectName, room, roomName, days, startTime, endTime, rentAmount, rentPeriod, isPaid, notes } = body;

    if (!name || !phone || !subjectName) {
      return NextResponse.json({ error: 'الاسم والهاتف والمادة مطلوبين' }, { status: 400 });
    }

    const rentalTeacher = await RentalTeacher.create({
      name: name.trim(),
      phone: phone.trim(),
      subjectName: subjectName.trim(),
      room: room || undefined,
      roomName: roomName?.trim() || '',
      days: Array.isArray(days) ? days : [],
      startTime: startTime?.trim() || '',
      endTime: endTime?.trim() || '',
      rentAmount: Number(rentAmount) || 0,
      rentPeriod: rentPeriod || 'monthly',
      isPaid: Boolean(isPaid),
      lastPaidDate: isPaid ? new Date() : undefined,
      notes: notes?.trim() || '',
    });

    return NextResponse.json({ success: true, rentalTeacher }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح - أدمن فقط' }, { status: 403 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { id, name, phone, subjectName, room, roomName, days, startTime, endTime, rentAmount, rentPeriod, isPaid, notes, isActive } = body;

    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const updateData: Record<string, unknown> = {
      name: name?.trim(),
      phone: phone?.trim(),
      subjectName: subjectName?.trim(),
      room: room || undefined,
      roomName: roomName?.trim() || '',
      days: Array.isArray(days) ? days : [],
      startTime: startTime?.trim() || '',
      endTime: endTime?.trim() || '',
      rentAmount: Number(rentAmount) || 0,
      rentPeriod: rentPeriod || 'monthly',
      isPaid: Boolean(isPaid),
      notes: notes?.trim() || '',
    };

    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // If marking as paid, record the date
    const existing = await RentalTeacher.findById(id).lean() as any;
    if (isPaid && !existing?.isPaid) {
      updateData.lastPaidDate = new Date();
    }

    const updated = await RentalTeacher.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!updated) return NextResponse.json({ error: 'المدرس غير موجود' }, { status: 404 });

    return NextResponse.json({ success: true, rentalTeacher: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح - أدمن فقط' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const deleted = await RentalTeacher.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'المدرس غير موجود' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
