import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Payment from '@/models/Payment';
import Teacher from '@/models/Teacher';
import Attendance from '@/models/Attendance';
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
    const today = new Date().toISOString().substring(0, 10);
    const notifications: AppNotification[] = [];
    const now = new Date().toISOString();

    const formatPhone = (p: string) => p && p.startsWith('0') ? `+2${p}` : (p || '');

    // 1. Teachers with Loans (balance < 0) — admin only
    if (currentUser.role === 'admin') {
      const teachersWithLoans = await Teacher.find({ balance: { $lt: 0 } });
      teachersWithLoans.forEach((teacher: any) => {
        notifications.push({
          id: `loan-${teacher._id}`,
          type: 'warning',
          title: 'سلفة غير مسددة',
          message: `المدرس/المدرب ${teacher.name} عليه سلفة متبقية بقيمة ${Math.abs(teacher.balance)} ج.م`,
          timestamp: now,
        });
      });
    }

    // 2. Today's Absent / Excused students — auto attendance notifications
    const todayAbsentRecords = await Attendance.find({
      date: today,
      status: { $in: ['absent', 'excused'] },
    }).populate('student', 'name phone parentPhone');

    todayAbsentRecords.forEach((record: any) => {
      const st = record.student;
      if (!st) return;
      const waPhone = formatPhone(st.parentPhone || st.phone || '');
      const statusAr = record.status === 'absent' ? 'غائب' : 'مستأذن';
      const statusEmoji = record.status === 'absent' ? '❌' : '⚠️';
      const absMsg = encodeURIComponent(
        `السلام عليكم، نود إعلامكم بأن ${st.name} كان ${record.status === 'absent' ? 'غائباً' : 'مستأذناً'} اليوم بتاريخ ${today}. نرجو التواصل معنا. شكراً - أكاديمية سكاي`
      );
      notifications.push({
        id: `att-${record._id}`,
        type: record.status === 'absent' ? 'error' : 'warning',
        title: `${statusEmoji} ${statusAr} اليوم — ${st.name}`,
        message: `الطالب ${st.name} ${record.status === 'absent' ? 'غائب' : 'مستأذن'} بتاريخ ${today}${record.notes ? ` — ملاحظة: ${record.notes}` : ''}`,
        actionLink: waPhone ? `https://wa.me/${waPhone}?text=${absMsg}` : undefined,
        actionLabel: waPhone ? '📱 إرسال إشعار واتساب' : undefined,
        timestamp: (record.updatedAt as Date)?.toISOString() || now,
      });
    });

    // 3. Students who haven't paid or partially paid this month
    const activeStudents = await Student.find({ isActive: true }).select('name phone parentPhone monthlyFee type');
    
    // Get all payments for current month
    const currentPayments = await Payment.find({ month: currentMonth });
    const paymentMap = new Map(currentPayments.map((p: any) => [p.student.toString(), p]));

    let unpaidCount = 0;
    
    activeStudents.forEach((st: any) => {
      const payment = paymentMap.get(st._id.toString());

      if (!payment) {
        unpaidCount++;
        // Only generate detailed notifications for the first 20 unpaid
        if (unpaidCount <= 20) {
          notifications.push({
            id: `unpaid-${st._id}`,
            type: 'error',
            title: 'طالب لم يسدد الشهر',
            message: `${st.name} لم يقم بسداد اشتراك شهر ${currentMonth}`,
            actionLink: `https://wa.me/${formatPhone(st.parentPhone || st.phone)}`,
            actionLabel: '📱 مراسلة واتساب',
            timestamp: now,
          });
        }
      } else if ((payment as any).status === 'partial') {
        notifications.push({
          id: `partial-${st._id}`,
          type: 'warning',
          title: 'دفعة غير مكتملة',
          message: `${st.name} عليه مبلغ متبقي ${(payment as any).remainingAmount} ج.م (${(payment as any).remainingReason || 'بدون سبب'})`,
          actionLink: `https://wa.me/${formatPhone(st.parentPhone || st.phone)}`,
          actionLabel: '📱 مراسلة واتساب',
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
