import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Income from '@/models/Income';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeString, isValidObjectId, sanitizeNumber, isValidDate } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    const query: Record<string, unknown> = {};
    if (date && isValidDate(date)) {
      query.date = date;
    } else if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      query.date = { $regex: `^${month}` };
    }

    const incomes = await Income.find(query)
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Stats
    const today = new Date().toISOString().substring(0, 10);
    const currentMonth = new Date().toISOString().substring(0, 7);

    const [totalAllTime, totalThisMonth, totalToday] = await Promise.all([
      Income.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Income.aggregate([
        { $match: { date: { $regex: `^${currentMonth}` } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Income.aggregate([
        { $match: { date: today } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return NextResponse.json({
      incomes,
      stats: {
        totalAllTime: totalAllTime[0]?.total || 0,
        countAllTime: totalAllTime[0]?.count || 0,
        totalThisMonth: totalThisMonth[0]?.total || 0,
        countThisMonth: totalThisMonth[0]?.count || 0,
        totalToday: totalToday[0]?.total || 0,
        countToday: totalToday[0]?.count || 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { amount, date, reason, subscriberName, staffType, teacherId } = body;

    const cleanAmount = sanitizeNumber(amount, 0, 10_000_000);
    const cleanReason = sanitizeString(reason, 500);
    const cleanSubscriberName = sanitizeString(subscriberName, 200);
    const cleanStaffType = staffType === 'trainer' || staffType === 'teacher' ? staffType : undefined;
    const cleanTeacherId = teacherId && isValidObjectId(teacherId) ? teacherId : undefined;

    if (cleanAmount <= 0) {
      return NextResponse.json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }, { status: 400 });
    }
    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: 'التاريخ مطلوب ويجب أن يكون بصيغة YYYY-MM-DD' }, { status: 400 });
    }
    if (!cleanReason) {
      return NextResponse.json({ error: 'السبب مطلوب' }, { status: 400 });
    }

    const income = await Income.create({
      amount: cleanAmount,
      date,
      reason: cleanReason,
      subscriberName: cleanSubscriberName || undefined,
      staffType: cleanStaffType,
      teacher: cleanTeacherId,
      createdBy: currentUser._id,
    });

    // Update teacher balance if applicable
    if (cleanTeacherId) {
      const Teacher = (await import('@/models/Teacher')).default;
      const teacher = await Teacher.findById(cleanTeacherId).lean();
      if (teacher) {
        const teacherCut = (cleanAmount * ((teacher as any).teacherPercentage || 50)) / 100;
        await Teacher.findByIdAndUpdate(cleanTeacherId, { $inc: { balance: teacherCut } });
      }
    }

    return NextResponse.json({ success: true, income });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'حذف الدخل متاح للأدمن فقط' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: 'معرف الدخل غير صحيح' }, { status: 400 });
    }

    const income = await Income.findById(id).lean();
    if (!income) {
      return NextResponse.json({ error: 'الدخل غير موجود' }, { status: 404 });
    }

    const inc = income as any;
    // Revert teacher balance if applicable
    if (inc.teacher) {
      const Teacher = (await import('@/models/Teacher')).default;
      const teacher = await Teacher.findById(inc.teacher).lean();
      if (teacher) {
        const teacherCut = (inc.amount * ((teacher as any).teacherPercentage || 50)) / 100;
        await Teacher.findByIdAndUpdate(inc.teacher, { $inc: { balance: -teacherCut } });
      }
    }

    await Income.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
