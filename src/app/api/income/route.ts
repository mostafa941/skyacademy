import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Income from '@/models/Income';
import { getCurrentUser } from '@/lib/auth';

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

    let query: Record<string, unknown> = {};
    if (date) {
      query.date = date;
    } else if (month) {
      query.date = { $regex: `^${month}` };
    }

    const incomes = await Income.find(query)
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 });

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

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'التاريخ مطلوب' }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'السبب مطلوب' }, { status: 400 });
    }

    const income = await Income.create({
      amount: Number(amount),
      date,
      reason: reason.trim(),
      subscriberName: subscriberName?.trim(),
      staffType,
      teacher: teacherId || undefined,
      createdBy: currentUser._id,
    });

    // Update teacher balance if applicable
    if (teacherId) {
      const Teacher = (await import('@/models/Teacher')).default;
      const teacher = await Teacher.findById(teacherId);
      if (teacher) {
        const teacherCut = (Number(amount) * (teacher.teacherPercentage || 50)) / 100;
        await Teacher.findByIdAndUpdate(teacherId, {
          $inc: { balance: teacherCut },
        });
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
    if (!id) {
      return NextResponse.json({ error: 'معرف الدخل مطلوب' }, { status: 400 });
    }

    const income = await Income.findById(id);
    if (!income) {
      return NextResponse.json({ error: 'الدخل غير موجود' }, { status: 404 });
    }

    // Revert teacher balance if applicable
    if (income.teacher) {
      const Teacher = (await import('@/models/Teacher')).default;
      const teacher = await Teacher.findById(income.teacher);
      if (teacher) {
        const teacherCut = (income.amount * (teacher.teacherPercentage || 50)) / 100;
        await Teacher.findByIdAndUpdate(income.teacher, {
          $inc: { balance: -teacherCut },
        });
      }
    }

    await Income.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
