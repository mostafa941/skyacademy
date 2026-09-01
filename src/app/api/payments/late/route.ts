import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Payment from '@/models/Payment';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/late
 * Returns two types of "late" payments:
 * 1. Payments that were paid AFTER the month they belong to ended (paid late)
 * 2. Payments that are still UNPAID for past months (overdue — shown after month close)
 *
 * Optional query param: teacherId — filter by a specific teacher
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');

    const currentMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-09"

    // === TYPE 1: Paid-late payments (paid after the month ended) ===
    const paidQuery: Record<string, unknown> = {
      status: { $in: ['paid', 'partial'] },
    };
    if (teacherId) paidQuery.teacher = teacherId;

    const paidPayments = await Payment.find(paidQuery)
      .populate('student', 'name phone parentPhone grade subjectName teacherId type monthlyFee')
      .populate('teacher', 'name subjectName type')
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    // Filter: payment is "late" if actual pay date is AFTER the month it belongs to
    const paidLatePayments = paidPayments.filter((p: any) => {
      const paymentMonth = p.month;
      const actualPayDate = p.paidAt || p.createdAt;
      if (!paymentMonth || !actualPayDate) return false;

      const [year, month] = paymentMonth.split('-').map(Number);
      const lastDayOfMonth = new Date(year, month, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      return new Date(actualPayDate) > lastDayOfMonth;
    });

    // === TYPE 2: Overdue unpaid payments (still unpaid from past months) ===
    const unpaidQuery: Record<string, unknown> = {
      status: 'unpaid',
      month: { $lt: currentMonth },
    };
    if (teacherId) unpaidQuery.teacher = teacherId;

    const overduePayments = await Payment.find(unpaidQuery)
      .populate('student', 'name phone parentPhone grade subjectName teacherId type monthlyFee')
      .populate('teacher', 'name subjectName type')
      .sort({ month: -1 })
      .lean();

    // Shape helpers
    const shapePaidLate = (p: any) => {
      const st = p.student || {};
      const teacher = p.teacher || {};
      const payDate = new Date(p.paidAt || p.createdAt);

      const [year, month] = p.month.split('-').map(Number);
      const lastDayOfMonth = new Date(year, month, 0);
      const daysLate = Math.ceil((payDate.getTime() - lastDayOfMonth.getTime()) / (1000 * 60 * 60 * 24));

      return {
        paymentId: p._id.toString(),
        lateType: 'paid_late',
        forMonth: p.month,
        paidOnDate: payDate.toISOString().substring(0, 10),
        paidOnMonth: payDate.toISOString().substring(0, 7),
        daysLate,
        amount: p.amount,
        status: p.status,
        paymentReason: p.paymentReason,
        student: {
          id: st._id?.toString() || '',
          name: st.name || 'غير معروف',
          phone: st.phone || '',
          parentPhone: st.parentPhone || '',
          grade: st.grade || '',
          subjectName: st.subjectName || '',
          type: st.type || 'student',
        },
        teacher: {
          id: teacher._id?.toString() || '',
          name: teacher.name || 'غير معروف',
          subjectName: teacher.subjectName || '',
          type: teacher.type || 'teacher',
        },
      };
    };

    const shapeOverdue = (p: any) => {
      const st = p.student || {};
      const teacher = p.teacher || {};

      const [year, month] = p.month.split('-').map(Number);
      const lastDayOfMonth = new Date(year, month, 0);
      const today = new Date();
      const daysLate = Math.max(0, Math.ceil((today.getTime() - lastDayOfMonth.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        paymentId: p._id.toString(),
        lateType: 'overdue_unpaid',
        forMonth: p.month,
        paidOnDate: null,
        paidOnMonth: null,
        daysLate,
        amount: st.monthlyFee || p.remainingAmount || 0,
        status: 'unpaid',
        paymentReason: 'لم يتم السداد بعد',
        student: {
          id: st._id?.toString() || '',
          name: st.name || 'غير معروف',
          phone: st.phone || '',
          parentPhone: st.parentPhone || '',
          grade: st.grade || '',
          subjectName: st.subjectName || '',
          type: st.type || 'student',
        },
        teacher: {
          id: teacher._id?.toString() || '',
          name: teacher.name || 'غير معروف',
          subjectName: teacher.subjectName || '',
          type: teacher.type || 'teacher',
        },
      };
    };

    const result = [
      ...paidLatePayments.map(shapePaidLate),
      ...overduePayments.map(shapeOverdue),
    ];

    // Sort: by forMonth desc, then daysLate desc
    result.sort((a, b) => {
      if (b.forMonth !== a.forMonth) return b.forMonth.localeCompare(a.forMonth);
      return b.daysLate - a.daysLate;
    });

    return NextResponse.json({ success: true, latePayments: result, total: result.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
