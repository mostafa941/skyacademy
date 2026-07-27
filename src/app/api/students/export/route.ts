import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Payment from '@/models/Payment';
import Attendance from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const students = await Student.find().populate('teacher').sort({ createdAt: -1 });
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Build CSV with BOM for Arabic UTF-8 support
    let csv = '\uFEFFم,اسم الطالب,رقم هاتف الطالب,رقم هاتف الوالد (واتس),المادة,المدرس,الصف,المصروف الشهري,حالة دفع الشهر,المبلغ المتبقي,سبب الفلوس المتبقية,عدد الحضور,عدد الغياب,ملاحظات\n';

    let index = 1;
    for (const st of students) {
      const payment = await Payment.findOne({ student: st._id, month: currentMonth });
      const attendances = await Attendance.find({ student: st._id });

      const present = attendances.filter((a) => a.status === 'present').length;
      const absent = attendances.filter((a) => a.status === 'absent').length;

      const payStatus = payment ? (payment.status === 'paid' ? 'تم الدفع' : payment.status === 'partial' ? 'دفع جزئي' : 'لم يدفع') : 'لم يدفع';
      const remAmount = payment?.remainingAmount || 0;
      const remReason = payment?.remainingReason || '-';

      const row = [
        index++,
        `"${st.name.replace(/"/g, '""')}"`,
        `"${st.phone}"`,
        `"${st.parentPhone}"`,
        `"${st.subjectName.replace(/"/g, '""')}"`,
        `"${((st.teacher as any)?.name || 'غير محدد').replace(/"/g, '""')}"`,
        `"${st.grade.replace(/"/g, '""')}"`,
        st.monthlyFee || 0,
        `"${payStatus}"`,
        remAmount,
        `"${remReason.replace(/"/g, '""')}"`,
        present,
        absent,
        `"${(st.notes || '').replace(/"/g, '""')}"`,
      ].join(',');

      csv += row + '\n';
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=students_sky_academy_${currentMonth}.csv`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
