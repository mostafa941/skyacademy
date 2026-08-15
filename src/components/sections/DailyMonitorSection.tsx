'use client';

import { useState, useEffect, useCallback } from 'react';

interface MonitorSession {
  id: string;
  name: string;
  type: 'teacher' | 'trainer';
  subjectName: string;
  roomId: string;
  roomName: string;
  hasTakenAttendance: boolean;
  isOnline: boolean;
  currentSession: { startTime: string; endTime: string } | null;
  studentCount: number;
  date: string;
}

interface MonitorStudent {
  id: string;
  name: string;
  phone: string;
  parentPhone: string;
  grade: string;
  status: 'present' | 'absent' | 'excused' | 'none';
  notes: string;
}

export default function DailyMonitorSection() {
  const [sessions, setSessions] = useState<MonitorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today in local time
    const offset = 3 * 60 * 60 * 1000;
    const localDate = new Date(new Date().getTime() + offset);
    return localDate.toISOString().substring(0, 10);
  });

  const [selectedSession, setSelectedSession] = useState<MonitorSession | null>(null);
  const [students, setStudents] = useState<MonitorStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch] = useState('');

  const loadSessions = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/monitor/daily?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions(selectedDate);
  }, [selectedDate, loadSessions]);

  const loadSessionDetails = async (teacherId: string, date: string) => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/monitor/daily/${teacherId}?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.name.includes(search) || 
    s.subjectName.includes(search) || 
    s.roomName.includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!selectedSession ? (
        <>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
                📋 متابعة الجلسات اليومية
              </h1>
              <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                متابعة المدرسين والمدربين وحالة أخذ الغياب لليوم الحالي
              </p>
            </div>
            <div className="input-group" style={{ marginBottom: 0, width: 'auto' }}>
              <input 
                className="input" 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                style={{ padding: '8px 12px', fontSize: 14 }}
              />
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <input
              className="input"
              placeholder="🔍 ابحث باسم المدرس، المادة، أو القاعة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">لا توجد جلسات أو مدرسين نشطين</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filteredSessions.map((session) => (
                <div 
                  key={session.id} 
                  className="card card-hover" 
                  style={{ 
                    padding: 20, 
                    cursor: 'pointer',
                    borderLeft: session.hasTakenAttendance ? '4px solid var(--success)' : '4px solid var(--error)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onClick={() => {
                    setSelectedSession(session);
                    loadSessionDetails(session.id, selectedDate);
                  }}
                >
                  {/* Online pulsing indicator */}
                  {session.isOnline && (
                    <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        display: 'inline-block',
                        width: 10, height: 10,
                        borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 0 0 rgba(34,197,94,0.7)',
                        animation: 'pulse-green 1.4s infinite',
                      }} />
                      <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>يدرّس الآن</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, marginTop: session.isOnline ? 20 : 0 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {session.type === 'teacher' ? '👨‍🏫' : '🏋️'} {session.name}
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        المادة: {session.subjectName}
                      </p>
                    </div>
                    {session.hasTakenAttendance ? (
                      <span className="badge badge-success" title="تم تسجيل الغياب">✅ تم الغياب</span>
                    ) : (
                      <span className="badge badge-danger" title="لم يتم تسجيل الغياب">❌ لم يٌسجل</span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>🏫</span> {session.roomName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>👥</span> {session.studentCount} طالب/متدرب
                    </div>
                    {session.isOnline && session.currentSession && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e', fontWeight: 600 }}>
                        <span>🕐</span> {session.currentSession.startTime} - {session.currentSession.endTime}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--accent-orange)', fontSize: 13, fontWeight: 700 }}>
                    {session.hasTakenAttendance ? 'عرض تفاصيل الحضور والغياب ←' : 'عرض الطلاب ←'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-icon" onClick={() => { setSelectedSession(null); setStudents([]); }}>
              ←
            </button>
            <div style={{ flex: 1 }}>
              <h1 className="page-title" style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 800 }}>
                {selectedSession.hasTakenAttendance ? 'تفاصيل الغياب: ' : 'قائمة الطلاب: '}{selectedSession.name}
              </h1>
              <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                تاريخ: {selectedDate} — المادة: {selectedSession.subjectName} — القاعة: {selectedSession.roomName}
              </p>
            </div>
            {/* Summary badges */}
            {!loadingStudents && students.length > 0 && selectedSession.hasTakenAttendance && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-success">✅ حاضر: {students.filter(s => s.status === 'present').length}</span>
                <span className="badge badge-danger">❌ غائب: {students.filter(s => s.status === 'absent').length}</span>
                {students.filter(s => s.status === 'excused').length > 0 && (
                  <span className="badge badge-orange">⚠️ مستأذن: {students.filter(s => s.status === 'excused').length}</span>
                )}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loadingStudents ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner" style={{ width: 30, height: 30, margin: '0 auto' }} />
              </div>
            ) : students.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد طلاب مسجلين لهذا المدرس</div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>اسم الطالب</th>
                      <th>حالة الحضور</th>
                      <th>ملاحظات السكرتارية</th>
                      <th>التواصل (واتساب)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(st => {
                      const waPhone = (st.parentPhone || st.phone || '').startsWith('0') ? `+2${st.parentPhone || st.phone}` : (st.parentPhone || st.phone || '');
                      const isAbsent = st.status === 'absent';
                      const isExcused = st.status === 'excused';
                      
                      // Message formatted for absence
                      const absMsg = encodeURIComponent(
                        `السلام عليكم، نود إعلامكم بأن الطالب ${st.name} كان غائباً اليوم بتاريخ ${selectedDate} في حصة ${selectedSession.subjectName}. نرجو التواصل معنا. شكراً - أكاديمية سكاي`
                      );
                      const excMsg = encodeURIComponent(
                        `السلام عليكم، نود إعلامكم بأنه تم تسجيل استئذان للطالب ${st.name} اليوم بتاريخ ${selectedDate} في حصة ${selectedSession.subjectName}. شكراً - أكاديمية سكاي`
                      );

                      const msg = isAbsent ? absMsg : isExcused ? excMsg : '';

                      return (
                      <tr key={st.id} style={{ 
                        background: isAbsent ? 'rgba(239,68,68,0.05)' : isExcused ? 'rgba(255,107,0,0.05)' : 'transparent',
                      }}>
                        <td style={{ fontWeight: 700 }}>
                          <div>{st.name}</div>
                          {st.grade && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{st.grade}</div>}
                        </td>
                        <td>
                          {st.status === 'present' ? (
                            <span className="badge badge-success">حاضر ✅</span>
                          ) : isAbsent ? (
                            <span className="badge badge-danger">غائب ❌</span>
                          ) : isExcused ? (
                            <span className="badge badge-orange">مستأذن ⚠️</span>
                          ) : (
                            <span className="badge badge-secondary">لم يُسجل</span>
                          )}
                        </td>
                        <td>
                          {st.notes ? (
                            <span style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 4 }}>
                              {st.notes}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          {waPhone ? (
                            <a
                              href={msg ? `https://wa.me/${waPhone}?text=${msg}` : `https://wa.me/${waPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={isAbsent ? `إرسال إشعار غياب لولي أمر ${st.name}` : `مراسلة ولي أمر ${st.name}`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '5px 10px', borderRadius: 20,
                                background: isAbsent ? '#25D366' : '#e8f5e9',
                                color: isAbsent ? 'white' : '#25D366',
                                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                                border: '1px solid #25D366',
                                boxShadow: isAbsent ? '0 2px 8px rgba(37,211,102,0.4)' : 'none',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.05)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'; }}
                            >
                              <span style={{ fontSize: 16 }}>📱</span>
                              {isAbsent ? 'إرسال إشعار غياب' : 'مراسلة'}
                            </a>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>لا يوجد رقم</span>}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
