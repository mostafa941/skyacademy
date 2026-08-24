import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Payment from '@/models/Payment';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/late
 * Returns payments that were registered AFTER the month they belong to ended.
 * A payment is "late" if paidAt (or createdAt) is in a month AFTER the payment's `month` field.
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

    // Fetch all non-unpaid payments that have a paidAt or createdAt date
    const query: Record<string, unknown> = {
      status: { $in: ['paid', 'partial'] },
    };
    if (teacherId) query.teacher = teacherId;

    const payments = await Payment.find(query)
      .populate('student', 'name phone parentPhone grade subjectName teacherId type')
      .populate('teacher', 'name subjectName type')
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    // Filter: payment is "late" if the actual payment date is AFTER the month it belongs to
    const latePayments = payments.filter((p: any) => {
      const paymentMonth = p.month; // e.g. "2026-08"
      const actualPayDate = p.paidAt || p.createdAt;
      if (!paymentMonth || !actualPayDate) return false;

      // Convert payment month to the last day of that month
      const [year, month] = paymentMonth.split('-').map(Number);
      const lastDayOfMonth = new Date(year, month, 0); // day 0 of next month = last day of this month
      lastDayOfMonth.setHours(23, 59, 59, 999);

      const payDate = new Date(actualPayDate);
      return payDate > lastDayOfMonth;
    });

    // Shape the response
    const result = latePayments.map((p: any) => {
      const st = p.student || {};
      const teacher = p.teacher || {};
      const payDate = new Date(p.paidAt || p.createdAt);

      // How many days late?
      const [year, month] = p.month.split('-').map(Number);
      const lastDayOfMonth = new Date(year, month, 0);
      const daysLate = Math.ceil((payDate.getTime() - lastDayOfMonth.getTime()) / (1000 * 60 * 60 * 24));

      return {
        paymentId: p._id.toString(),
        forMonth: p.month, // the month the payment belongs to
        paidOnDate: payDate.toISOString().substring(0, 10), // actual date paid
        paidOnMonth: payDate.toISOString().substring(0, 7), // month it was actually paid in
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
    });

    return NextResponse.json({ success: true, latePayments: result, total: result.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
