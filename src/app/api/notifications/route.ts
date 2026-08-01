import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Payment from '@/models/Payment';
import Teacher from '@/models/Teacher';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export interface AppNotification {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLink?: string;
  actionLabel?: string;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const currentMonth = new Date().toISOString().substring(0, 7);
    const notifications: AppNotification[] = [];
    const now = new Date().toISOString();

    // 1. Teachers with Loans (balance < 0)
    if (currentUser.role === 'admin') {
      const teachersWithLoans = await Teacher.find({ balance: { $lt: 0 } });
      teachersWithLoans.forEach(teacher => {
        notifications.push({
          id: `loan-${teacher._id}`,
          type: 'warning',
          title: 'سلفة غير مسددة',
          message: `المدرس/المدرب ${teacher.name} عليه سلفة متبقية بقيمة ${Math.abs(teacher.balance)} ج.م`,
          timestamp: now,
        });
      });
    }

    // 2. Students who haven't paid or partially paid this month
    // We only fetch active students
    const activeStudents = await Student.find({ isActive: true }).select('name phone parentPhone monthlyFee type');
    
    // Get all payments for current month
    const currentPayments = await Payment.find({ month: currentMonth });
    const paymentMap = new Map(currentPayments.map(p => [p.student.toString(), p]));

    let unpaidCount = 0;
    
    activeStudents.forEach(st => {
      const payment = paymentMap.get(st._id.toString());
      const formatPhone = (p: string) => p.startsWith('0') ? `+2${p}` : p; // Assuming Egypt numbers for wa.me

      if (!payment) {
        // Unpaid
        unpaidCount++;
        // To avoid overloading the UI, let's only generate detailed notifications for the first 20 unpaid
        if (unpaidCount <= 20) {
          notifications.push({
            id: `unpaid-${st._id}`,
            type: 'error',
            title: 'طالب لم يسدد الشهر',
            message: `${st.name} لم يقم بسداد اشتراك شهر ${currentMonth}`,
            actionLink: `https://wa.me/${formatPhone(st.parentPhone || st.phone)}`,
            actionLabel: 'مراسلة واتساب',
            timestamp: now,
          });
        }
      } else if (payment.status === 'partial') {
        // Partial
        notifications.push({
          id: `partial-${st._id}`,
          type: 'warning',
          title: 'دفعة غير مكتملة',
          message: `${st.name} عليه مبلغ متبقي ${payment.remainingAmount} ج.م (${payment.remainingReason || 'بدون سبب'})`,
          actionLink: `https://wa.me/${formatPhone(st.parentPhone || st.phone)}`,
          actionLabel: 'مراسلة واتساب',
          timestamp: now,
        });
      }
    });

    if (unpaidCount > 20) {
      notifications.push({
        id: 'unpaid-overflow',
        type: 'error',
        title: 'تنبيه جماعي',
        message: `يوجد ${unpaidCount - 20} طلاب آخرين لم يسددوا اشتراك هذا الشهر. يرجى مراجعة سجل المتأخرين.`,
        timestamp: now,
      });
    }

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
