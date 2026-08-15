import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Teacher from '@/models/Teacher';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';
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
    const dateQuery = searchParams.get('date');
    
    // Current time in Egypt (UTC+3)
    const nowUtc = new Date();
    const offset = 3 * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + offset);
    
    // Default to today in local timezone (Egypt) if not provided
    let dateStr = dateQuery;
    if (!dateStr) {
      dateStr = nowLocal.toISOString().substring(0, 10);
    }

    // Current day of week in Arabic
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const currentDayArabic = arabicDays[nowLocal.getUTCDay()];
    // Current time as HH:MM
    const currentHH = String(nowLocal.getUTCHours()).padStart(2, '0');
    const currentMM = String(nowLocal.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHH}:${currentMM}`;

    // Ensure Room is registered
    Room.schema;

    // Fetch all rooms with schedules for online status check
    const allRooms = await Room.find({});

    // Fetch active teachers and trainers
    const teachers = await Teacher.find({ isActive: { $ne: false } })
      .populate('room')
      .sort({ createdAt: -1 });

    const activeSessions = await Promise.all(
      teachers.map(async (t) => {
        // Find all students for this teacher (include inactive too for attendance lookup)
        const students = await Student.find({ teacher: t._id }).select('_id');
        const studentIds = students.map(s => s._id);

        // Check if there is any attendance record for these students today
        let hasTakenAttendance = false;
        if (studentIds.length > 0) {
          const attendanceRecord = await Attendance.findOne({
            student: { $in: studentIds },
            date: dateStr
          });
          hasTakenAttendance = !!attendanceRecord;
        }

        // Check if teacher is currently in session based on room schedule
        let isOnline = false;
        let currentSession: { startTime: string; endTime: string } | null = null;

        for (const room of allRooms) {
          for (const slot of room.schedule) {
            // Match by teacher ObjectId OR by teacherName as fallback
            const matchById = slot.teacher && slot.teacher.toString() === t._id.toString();
            const matchByName = !slot.teacher && slot.teacherName === t.name;
            if (matchById || matchByName) {
              if (slot.dayOfWeek === currentDayArabic) {
                if (currentTimeStr >= slot.startTime && currentTimeStr <= slot.endTime) {
                  isOnline = true;
                  currentSession = { startTime: slot.startTime, endTime: slot.endTime };
                  break;
                }
              }
            }
          }
          if (isOnline) break;
        }

        return {
          id: t._id.toString(),
          name: t.name,
          type: t.type,
          subjectName: t.subjectName,
          roomId: (t.room as any)?._id?.toString() || '',
          roomName: (t.room as any)?.name || 'غير محددة',
          hasTakenAttendance,
          isOnline,
          currentSession,
          studentCount: students.length,
          date: dateStr,
        };
      })
    );

    return NextResponse.json({ sessions: activeSessions, date: dateStr });
  } catch (error: any) {
    console.error('Error fetching daily monitor data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
