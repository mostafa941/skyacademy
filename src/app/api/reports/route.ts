import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Payment from '@/models/Payment';
import Expense from '@/models/Expense';
import Income from '@/models/Income';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const GRADE_STAGES: Record<string, string[]> = {
  'المرحلة الابتدائية': [
    'الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي',
    'أولى ابتدائي', 'تانية ابتدائي', 'تالتة ابتدائي', 'رابعة ابتدائي', 'خامسة ابتدائي', 'سادسة ابتدائي',
  ],
  'المرحلة الإعدادية': [
    'الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي',
    'أولى إعدادي', 'تانية إعدادي', 'تالتة إعدادي',
    'الصف الاول الاعدادي', 'الصف الثاني الاعدادي', 'الصف الثالث الاعدادي',
  ],
  'المرحلة الثانوية': [
    'الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي',
    'أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي',
    'الصف الاول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي',
  ],
};

function getStageForGrade(grade: string): string {
  const lowerGrade = grade.toLowerCase();
  for (const [stage, grades] of Object.entries(GRADE_STAGES)) {
    if (grades.some((g) => lowerGrade.includes(g.toLowerCase()) || g.toLowerCase().includes(lowerGrade))) {
      return stage;
    }
  }
  // Fuzzy matching
  if (lowerGrade.includes('ابتدائ') || lowerGrade.includes('ابتدائي')) return 'المرحلة الابتدائية';
  if (lowerGrade.includes('اعدادي') || lowerGrade.includes('إعدادي')) return 'المرحلة الإعدادية';
  if (lowerGrade.includes('ثانوي') || lowerGrade.includes('ثانوى')) return 'المرحلة الثانوية';
  return 'أخرى';
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'التقرير الشامل متاح للأدمن فقط' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');

    // Get all students with their teachers
    const students = await Student.find().populate('teacher', 'name phone subjectName type').sort({ grade: 1, name: 1 });

    // Group students by stage
    const stageGroups: Record<string, any[]> = {
      'المرحلة الابتدائية': [],
      'المرحلة الإعدادية': [],
      'المرحلة الثانوية': [],
      'أخرى': [],
    };

    const currentMonth = new Date().toISOString().substring(0, 7);

    for (const st of students) {
      const stageName = getStageForGrade(st.grade);
      const payment = await Payment.findOne({ student: st._id, month: currentMonth });

      stageGroups[stageName]?.push({
        id: st._id.toString(),
        name: st.name,
        phone: st.phone,
        grade: st.grade,
        subjectName: st.subjectName,
        teacherName: (st.teacher as any)?.name || 'غير محدد',
        teacherSubject: (st.teacher as any)?.subjectName || '',
        monthlyFee: st.monthlyFee,
        paymentStatus: payment?.status || 'unpaid',
        paymentAmount: payment?.amount || 0,
      });
    }

    // If a specific stage is requested, return its students
    if (stage && stageGroups[stage]) {
      return NextResponse.json({
        stage,
        students: stageGroups[stage],
        count: stageGroups[stage].length,
      });
    }

    // Financial summary
    const [
      totalIncomePayments,
      totalManualIncome,
      totalExpenses,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: { $in: ['paid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Income.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalIncome = (totalIncomePayments[0]?.total || 0) + (totalManualIncome[0]?.total || 0);
    const totalExp = totalExpenses[0]?.total || 0;

    // Teachers and trainers count
    const [teacherCount, trainerCount] = await Promise.all([
      Teacher.countDocuments({ type: 'teacher' }),
      Teacher.countDocuments({ type: 'trainer' }),
    ]);

    return NextResponse.json({
      stages: Object.entries(stageGroups).map(([name, students]) => ({
        name,
        count: students.length,
      })),
      finance: {
        totalIncome,
        totalExpenses: totalExp,
        netProfit: totalIncome - totalExp,
      },
      counts: {
        totalStudents: students.length,
        totalTeachers: teacherCount,
        totalTrainers: trainerCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
