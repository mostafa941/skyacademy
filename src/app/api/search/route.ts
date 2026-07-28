import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Room from '@/models/Room';
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
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const regex = { $regex: q, $options: 'i' };

    const [students, teachers, rooms] = await Promise.all([
      Student.find({
        $or: [
          { name: regex },
          { phone: regex },
          { parentPhone: regex },
          { subjectName: regex },
          { grade: regex },
        ],
      })
        .populate('teacher', 'name')
        .limit(10)
        .select('name phone grade subjectName teacher'),
      Teacher.find({
        $or: [
          { name: regex },
          { phone: regex },
          { subjectName: regex },
        ],
      })
        .limit(10)
        .select('name phone subjectName type'),
      Room.find({
        $or: [
          { name: regex },
          { notes: regex },
        ],
      })
        .limit(5)
        .select('name capacity'),
    ]);

    const results = [
      ...students.map((s) => ({
        type: 'student' as const,
        id: s._id.toString(),
        name: s.name,
        details: `${s.grade} — ${s.subjectName}`,
        phone: s.phone,
        teacherName: (s.teacher as any)?.name || '',
      })),
      ...teachers.map((t) => ({
        type: t.type === 'trainer' ? 'trainer' as const : 'teacher' as const,
        id: t._id.toString(),
        name: t.name,
        details: t.subjectName,
        phone: t.phone,
      })),
      ...rooms.map((r) => ({
        type: 'room' as const,
        id: r._id.toString(),
        name: r.name,
        details: `سعة ${r.capacity} طالب`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
