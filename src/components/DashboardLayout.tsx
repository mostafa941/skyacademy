'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
  subjectName?: string;
  grade?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
}

const sidebarConfig: Record<string, SidebarItem[]> = {
  admin: [
    { id: 'overview', label: 'لوحة التحكم', icon: '📊' },
    { id: 'students', label: 'الطلاب', icon: '🎓' },
    { id: 'teachers', label: 'المدرسين', icon: '👨‍🏫' },
    { id: 'secretaries', label: 'السكرتارية', icon: '💼' },
    { id: 'payments', label: 'المصاريف', icon: '💰' },
    { id: 'attendance', label: 'الحضور والغياب', icon: '📅' },
    { id: 'evaluations', label: 'التقييمات', icon: '⭐' },
  ],
  teacher: [
    { id: 'overview', label: 'الرئيسية', icon: '🏠' },
    { id: 'students', label: 'طلابي', icon: '🎓' },
    { id: 'evaluations', label: 'إضافة تقييم', icon: '⭐' },
  ],
  secretary: [
    { id: 'overview', label: 'الرئيسية', icon: '🏠' },
    { id: 'students', label: 'إدارة الطلاب', icon: '🎓' },
    { id: 'payments', label: 'المصاريف', icon: '💰' },
    { id: 'attendance', label: 'الحضور والغياب', icon: '📅' },
  ],
  student: [
    { id: 'overview', label: 'الرئيسية', icon: '🏠' },
    { id: 'subjects', label: 'موادي ودرجاتي', icon: '📚' },
    { id: 'payments', label: 'المصاريف', icon: '💰' },
    { id: 'attendance', label: 'حضوري وغيابي', icon: '📅' },
    { id: 'evaluations', label: 'تقييمات مدرسيّ', icon: '⭐' },
  ],
};

const roleLabels: Record<string, string> = {
  admin: 'المدير',
  teacher: 'مدرس',
  secretary: 'سكرتيرة',
  student: 'طالب',
};

export default function DashboardLayout({ children, role }: { children: React.ReactNode; role: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.replace('/'); return; }
      const data = await res.json();
      if (!data.authenticated || data.user.role !== role) {
        router.replace('/');
        return;
      }
      setUser(data.user);
    };
    fetchUser();
  }, [role, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
  };

  const navItems = sidebarConfig[role] || [];

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span style={{ fontSize: 28 }}>🌤️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent-orange)' }}>Sky Academy</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>اسكاي اكاديمي</div>
          </div>
        </div>

        {/* User info */}
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', marginBottom: 20, border: '1px solid var(--border)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
            {user.name}
          </div>
          <div className="badge badge-orange" style={{ fontSize: 11 }}>
            {roleLabels[user.role]}
          </div>
          {user.subjectName && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>📖 {user.subjectName}</div>
          )}
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => { setActiveSection(item.id); setMobileOpen(false); }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button
            className="sidebar-item"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ color: 'var(--error)', width: '100%' }}
          >
            <span style={{ fontSize: 18 }}>🚪</span>
            <span>{loggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Mobile header */}
        <div style={{
          display: 'none', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, padding: '0 0 16px', borderBottom: '1px solid var(--border)',
        }} className="mobile-header">
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 18 }}
          >
            ☰
          </button>
          <span style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>Sky Academy</span>
        </div>

        {/* Content */}
        <DashboardContent role={role} section={activeSection} user={user} />
      </main>
    </div>
  );
}

// ============= DASHBOARD CONTENT ================
function DashboardContent({ role, section, user }: { role: string; section: string; user: User }) {
  if (role === 'admin') return <AdminContent section={section} />;
  if (role === 'teacher') return <TeacherContent section={section} user={user} />;
  if (role === 'secretary') return <SecretaryContent section={section} />;
  if (role === 'student') return <StudentContent section={section} user={user} />;
  return null;
}

// ============= ADMIN DASHBOARD ==================
function AdminContent({ section }: { section: string }) {
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (section === 'overview') {
          const r = await fetch('/api/dashboard/stats');
          const d = await r.json();
          setStats(d);
        } else if (section === 'students') {
          const r = await fetch('/api/students');
          const d = await r.json();
          setStudents(d.students || []);
        } else if (section === 'teachers') {
          const r = await fetch('/api/teachers');
          const d = await r.json();
          setTeachers(d.teachers || []);
        } else if (section === 'secretaries') {
          const r = await fetch('/api/users?role=secretary').catch(() => ({ json: () => ({ users: [] }) }));
          const d = await (r as any).json();
          setTeachers(d.users || []);
        } else if (section === 'payments') {
          const r = await fetch('/api/payments');
          const d = await r.json();
          setPayments(d.payments || []);
        } else if (section === 'attendance') {
          const r = await fetch('/api/attendance');
          const d = await r.json();
          setAttendance(d.attendance || []);
        } else if (section === 'evaluations') {
          const r = await fetch('/api/evaluations');
          const d = await r.json();
          setEvaluations(d.evaluations || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [section]);

  if (loading) return <LoadingState />;

  if (section === 'overview') return <AdminOverview stats={stats} />;
  if (section === 'students') return <StudentsTable students={students} showAll />;
  if (section === 'teachers') return <TeachersTable teachers={teachers} />;
  if (section === 'secretaries') return <SecretariesTable secretaries={teachers} />;
  if (section === 'payments') return <PaymentsSection payments={payments} />;
  if (section === 'attendance') return <AttendanceSection attendance={attendance} />;
  if (section === 'evaluations') return <EvaluationsSection evaluations={evaluations} />;
  return null;
}

function AdminOverview({ stats }: { stats: any }) {
  if (!stats) return <LoadingState />;
  const { stats: s, recentEvaluations = [], recentStudents = [] } = stats;
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة التحكم الرئيسية</h1>
          <p className="page-subtitle">نظرة عامة على أكاديمية اسكاي</p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard icon="🎓" label="إجمالي الطلاب" value={s.totalStudents} colorClass="stat-card-orange" />
        <StatCard icon="👨‍🏫" label="إجمالي المدرسين" value={s.totalTeachers} colorClass="stat-card-green" />
        <StatCard icon="💼" label="السكرتارية" value={s.totalSecretaries} colorClass="stat-card-blue" />
        <StatCard icon="📚" label="المواد الدراسية" value={s.totalSubjects} colorClass="stat-card-gold" />
      </div>

      <div className="grid-2" style={{ marginBottom: 32 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>💰 المصاريف — {s.payments.month}</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, background: 'var(--success-muted)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)' }}>{s.payments.paid}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>دفعوا</div>
            </div>
            <div style={{ flex: 1, background: 'var(--error-muted)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--error)' }}>{s.payments.unpaid}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>لم يدفعوا</div>
            </div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>📅 الحضور الإجمالي</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, background: 'var(--success-muted)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)' }}>{s.attendance.present}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>حاضر</div>
            </div>
            <div style={{ flex: 1, background: 'var(--error-muted)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--error)' }}>{s.attendance.absent}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>غائب</div>
            </div>
            <div style={{ flex: 1, background: 'var(--accent-orange-muted)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-orange)' }}>{s.attendance.rate}%</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>معدل الحضور</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Evaluations */}
      {recentEvaluations.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>⭐ آخر التقييمات</h3>
          {recentEvaluations.map((ev: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <Stars rating={ev.rating} />
              <div>
                <span style={{ fontWeight: 600 }}>{ev.student?.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> — {ev.teacher?.name}</span>
              </div>
              <div style={{ marginRight: 'auto', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.notes}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============= TEACHER DASHBOARD ==================
function TeacherContent({ section, user }: { section: string; user: User }) {
  const [students, setStudents] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [evalForm, setEvalForm] = useState({ rating: 5, notes: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/students');
      const d = await r.json();
      setStudents(d.students || []);
      const r2 = await fetch('/api/evaluations');
      const d2 = await r2.json();
      setEvaluations(d2.evaluations || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const submitEval = async () => {
    if (!selectedStudent || !evalForm.notes.trim()) {
      showToast('الرجاء ملء جميع الحقول');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: selectedStudent.id, rating: evalForm.rating, notes: evalForm.notes }),
    });
    setSaving(false);
    if (res.ok) {
      showToast('✅ تم إضافة التقييم بنجاح');
      setShowEvalModal(false);
      setEvalForm({ rating: 5, notes: '' });
      load();
    } else {
      const d = await res.json();
      showToast('❌ ' + d.error);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {section === 'overview' ? `مرحباً، ${user.name}` : section === 'students' ? 'طلابي' : 'إضافة تقييم'}
          </h1>
          {user.subjectName && <p className="page-subtitle">📖 مادة: {user.subjectName}</p>}
        </div>
      </div>

      {section === 'overview' && (
        <div>
          <div className="grid-3" style={{ marginBottom: 32 }}>
            <StatCard icon="🎓" label="عدد طلابي" value={students.length} colorClass="stat-card-orange" />
            <StatCard icon="⭐" label="تقييماتي" value={evaluations.length} colorClass="stat-card-gold" />
            <StatCard icon="📖" label="المادة" value={user.subjectName || '-'} colorClass="stat-card-blue" isText />
          </div>
          <StudentsTable students={students} onEvaluate={(s) => { setSelectedStudent(s); setShowEvalModal(true); }} />
        </div>
      )}

      {section === 'students' && (
        <StudentsTable students={students} onEvaluate={(s) => { setSelectedStudent(s); setShowEvalModal(true); }} />
      )}

      {section === 'evaluations' && (
        <div>
          <button className="btn btn-primary" style={{ marginBottom: 24 }} onClick={() => setShowEvalModal(true)}>
            + إضافة تقييم جديد
          </button>
          <EvaluationsSection evaluations={evaluations} />
        </div>
      )}

      {/* Eval Modal */}
      {showEvalModal && (
        <div className="modal-backdrop" onClick={() => setShowEvalModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>⭐ إضافة تقييم للطالب</h2>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label">اختر الطالب</label>
              <select className="input" value={selectedStudent?.id || ''} onChange={e => {
                const st = students.find(s => s.id === e.target.value);
                setSelectedStudent(st || null);
              }}>
                <option value="">اختر طالباً...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.grade}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label">التقييم (1–5 نجوم)</label>
              <div style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setEvalForm(f => ({ ...f, rating: n }))}
                    style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.1s', transform: n <= evalForm.rating ? 'scale(1.1)' : 'scale(1)' }}>
                    {n <= evalForm.rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label">ملاحظات</label>
              <textarea className="input" rows={3} placeholder="اكتب ملاحظاتك عن الطالب..." value={evalForm.notes}
                onChange={e => setEvalForm(f => ({ ...f, notes: e.target.value }))}
                style={{ resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={submitEval} disabled={saving} style={{ flex: 1 }}>
                {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '✅ حفظ التقييم'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowEvalModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast toast-info">{toast}</div>}
    </div>
  );
}

// ============= SECRETARY DASHBOARD ==================
function SecretaryContent({ section }: { section: string }) {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' }>({ msg: '', type: 'success' });
  const [showToastState, setShowToastState] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', phone: '', grade: '', subjectIds: [] as string[], monthlyFee: 300 });
  const [saving, setSaving] = useState(false);
  // Attendance modal
  const [showAttModal, setShowAttModal] = useState(false);
  const [attForm, setAttForm] = useState({ studentId: '', date: new Date().toISOString().split('T')[0], status: 'present', notes: '' });
  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ studentId: '', month: new Date().toISOString().substring(0, 7), amount: 300, status: 'paid', notes: '' });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setShowToastState(true);
    setTimeout(() => setShowToastState(false), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, subr, pr, ar] = await Promise.all([
        fetch('/api/students').then(r => r.json()),
        fetch('/api/subjects').then(r => r.json()),
        fetch('/api/payments').then(r => r.json()),
        fetch('/api/attendance').then(r => r.json()),
      ]);
      setStudents(sr.students || []);
      setSubjects(subr.subjects || []);
      setPayments(pr.payments || []);
      setAttendance(ar.attendance || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addStudent = async () => {
    if (!studentForm.name || !studentForm.phone) { showToast('الاسم ورقم الهاتف مطلوبان', 'error'); return; }
    setSaving(true);
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentForm),
    });
    setSaving(false);
    if (res.ok) {
      showToast('✅ تم إضافة الطالب بنجاح');
      setShowAddStudent(false);
      setStudentForm({ name: '', phone: '', grade: '', subjectIds: [], monthlyFee: 300 });
      load();
    } else {
      const d = await res.json();
      showToast('❌ ' + d.error, 'error');
    }
  };

  const markAttendance = async () => {
    if (!attForm.studentId) { showToast('اختر طالباً', 'error'); return; }
    setSaving(true);
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attForm),
    });
    setSaving(false);
    if (res.ok) {
      showToast('✅ تم تسجيل الحضور');
      setShowAttModal(false);
      load();
    } else {
      const d = await res.json();
      showToast('❌ ' + d.error, 'error');
    }
  };

  const updatePayment = async () => {
    if (!payForm.studentId) { showToast('اختر طالباً', 'error'); return; }
    setSaving(true);
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payForm),
    });
    setSaving(false);
    if (res.ok) {
      showToast('✅ تم تحديث حالة الدفع');
      setShowPayModal(false);
      load();
    } else {
      const d = await res.json();
      showToast('❌ ' + d.error, 'error');
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {section === 'overview' ? 'لوحة السكرتيرة' : section === 'students' ? 'إدارة الطلاب' : section === 'payments' ? 'المصاريف' : 'الحضور والغياب'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(section === 'overview' || section === 'students') && (
            <button className="btn btn-primary" onClick={() => setShowAddStudent(true)}>+ إضافة طالب</button>
          )}
          {(section === 'overview' || section === 'attendance') && (
            <button className="btn btn-secondary" onClick={() => setShowAttModal(true)}>📅 تسجيل حضور</button>
          )}
          {(section === 'overview' || section === 'payments') && (
            <button className="btn btn-secondary" onClick={() => setShowPayModal(true)}>💰 تحديث مصروف</button>
          )}
        </div>
      </div>

      {section === 'overview' && (
        <div>
          <div className="grid-3" style={{ marginBottom: 32 }}>
            <StatCard icon="🎓" label="إجمالي الطلاب" value={students.length} colorClass="stat-card-orange" />
            <StatCard icon="💰" label="دفعوا هذا الشهر" value={payments.filter(p => p.status === 'paid').length} colorClass="stat-card-green" />
            <StatCard icon="📅" label="سجلات الحضور" value={attendance.length} colorClass="stat-card-blue" />
          </div>
          <StudentsTable students={students} showPayment showAttendance />
        </div>
      )}

      {section === 'students' && <StudentsTable students={students} showPayment showAttendance />}
      {section === 'payments' && <PaymentsSection payments={payments} students={students} onUpdate={() => setShowPayModal(true)} />}
      {section === 'attendance' && <AttendanceSection attendance={attendance} students={students} onAdd={() => setShowAttModal(true)} />}

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="modal-backdrop" onClick={() => setShowAddStudent(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🎓 إضافة طالب جديد</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">اسم الطالب *</label>
                <input className="input" placeholder="اسم الطالب كاملاً" value={studentForm.name} onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">رقم الهاتف * (سيُستخدم لتسجيل الدخول)</label>
                <input className="input" type="tel" placeholder="01xxxxxxxxx" value={studentForm.phone} onChange={e => setStudentForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">الصف الدراسي</label>
                <input className="input" placeholder="مثال: الصف الأول الثانوي" value={studentForm.grade} onChange={e => setStudentForm(f => ({ ...f, grade: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">المصروف الشهري (جنيه)</label>
                <input className="input" type="number" value={studentForm.monthlyFee} onChange={e => setStudentForm(f => ({ ...f, monthlyFee: +e.target.value }))} />
              </div>
              {subjects.length > 0 && (
                <div className="input-group">
                  <label className="input-label">المواد الدراسية</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0' }}>
                    {subjects.map((sub: any) => (
                      <button key={sub._id} onClick={() => {
                        const id = sub._id;
                        setStudentForm(f => ({
                          ...f,
                          subjectIds: f.subjectIds.includes(id)
                            ? f.subjectIds.filter(s => s !== id)
                            : [...f.subjectIds, id],
                        }));
                      }}
                        style={{
                          padding: '6px 14px', borderRadius: 100, border: '1px solid',
                          cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo', fontWeight: 600,
                          background: studentForm.subjectIds.includes(sub._id) ? 'var(--accent-orange)' : 'var(--bg-elevated)',
                          borderColor: studentForm.subjectIds.includes(sub._id) ? 'var(--accent-orange)' : 'var(--border)',
                          color: studentForm.subjectIds.includes(sub._id) ? '#fff' : 'var(--text-secondary)',
                          transition: 'all 0.2s',
                        }}>
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={addStudent} disabled={saving} style={{ flex: 1 }}>
                  {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '✅ إضافة الطالب'}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowAddStudent(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttModal && (
        <div className="modal-backdrop" onClick={() => setShowAttModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📅 تسجيل حضور / غياب</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">الطالب</label>
                <select className="input" value={attForm.studentId} onChange={e => setAttForm(f => ({ ...f, studentId: e.target.value }))}>
                  <option value="">اختر طالباً...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">التاريخ</label>
                <input className="input" type="date" value={attForm.date} onChange={e => setAttForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">الحالة</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'present', l: '✅ حاضر' }, { v: 'absent', l: '❌ غائب' }, { v: 'excused', l: '📋 مبرر' }].map(opt => (
                    <button key={opt.v} onClick={() => setAttForm(f => ({ ...f, status: opt.v }))}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid',
                        cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 600, fontSize: 13,
                        background: attForm.status === opt.v ? 'var(--accent-orange)' : 'var(--bg-elevated)',
                        borderColor: attForm.status === opt.v ? 'var(--accent-orange)' : 'var(--border)',
                        color: attForm.status === opt.v ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                      }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">ملاحظات (اختياري)</label>
                <input className="input" placeholder="أي ملاحظات..." value={attForm.notes} onChange={e => setAttForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={markAttendance} disabled={saving} style={{ flex: 1 }}>
                  {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '✅ تسجيل'}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowAttModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>💰 تحديث حالة المصروف</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">الطالب</label>
                <select className="input" value={payForm.studentId} onChange={e => setPayForm(f => ({ ...f, studentId: e.target.value }))}>
                  <option value="">اختر طالباً...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">الشهر</label>
                  <input className="input" type="month" value={payForm.month} onChange={e => setPayForm(f => ({ ...f, month: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">المبلغ (جنيه)</label>
                  <input className="input" type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: +e.target.value }))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">حالة الدفع</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'paid', l: '✅ دفع' }, { v: 'unpaid', l: '❌ لم يدفع' }].map(opt => (
                    <button key={opt.v} onClick={() => setPayForm(f => ({ ...f, status: opt.v }))}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid',
                        cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 700, fontSize: 14,
                        background: payForm.status === opt.v ? (opt.v === 'paid' ? 'var(--success)' : 'var(--error)') : 'var(--bg-elevated)',
                        borderColor: payForm.status === opt.v ? (opt.v === 'paid' ? 'var(--success)' : 'var(--error)') : 'var(--border)',
                        color: payForm.status === opt.v ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                      }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={updatePayment} disabled={saving} style={{ flex: 1 }}>
                  {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '✅ حفظ'}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowPayModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showToastState && <div className={`toast toast-${toast.type === 'success' ? 'success' : 'error'}`}>{toast.msg}</div>}
    </div>
  );
}

// ============= STUDENT DASHBOARD ==================
function StudentContent({ section, user }: { section: string; user: User }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const r = await fetch('/api/students');
      const d = await r.json();
      setData(d);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <LoadingState />;

  const student = data?.student;
  const enrollments = data?.enrollments || [];
  const payments = data?.payments || [];
  const attendance = data?.attendance || [];
  const evaluations = data?.evaluations || [];

  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentPayment = payments.find((p: any) => p.month === currentMonth);
  const presentCount = attendance.filter((a: any) => a.status === 'present').length;
  const absentCount = attendance.filter((a: any) => a.status === 'absent').length;
  const attRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 100;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {section === 'overview' ? `أهلاً، ${user.name}` :
              section === 'subjects' ? 'موادي ودرجاتي' :
              section === 'payments' ? 'المصاريف' :
              section === 'attendance' ? 'الحضور والغياب' : 'تقييمات مدرسيّ'}
          </h1>
          {user.grade && <p className="page-subtitle">🏫 {user.grade}</p>}
        </div>
      </div>

      {section === 'overview' && (
        <div>
          <div className="grid-4" style={{ marginBottom: 32 }}>
            <StatCard icon="📚" label="موادي" value={enrollments.length} colorClass="stat-card-orange" />
            <StatCard
              icon="💰"
              label="مصروف هذا الشهر"
              value={currentPayment ? (currentPayment.status === 'paid' ? 'مدفوع ✅' : 'غير مدفوع ❌') : 'غير محدد'}
              colorClass={currentPayment?.status === 'paid' ? 'stat-card-green' : 'stat-card-red'}
              isText
            />
            <StatCard icon="✅" label="معدل الحضور" value={`${attRate}%`} colorClass="stat-card-blue" isText />
            <StatCard icon="⭐" label="تقييماتي" value={evaluations.length} colorClass="stat-card-gold" />
          </div>

          {/* Quick subjects */}
          {enrollments.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📚 موادي</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {enrollments.map((en: any, i: number) => (
                  <div key={i} style={{
                    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 20px',
                    border: '1px solid var(--border)', minWidth: 160,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{en.subject?.name || 'مادة'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      👨‍🏫 {en.subject?.teacherName || 'مدرس المادة'}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent-orange)' }}>
                      {en.score || 0}<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/{en.maxScore || 100}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'subjects' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📚 مواد وتقديرات</h3>
          {enrollments.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📚</div><p className="empty-state-text">لا يوجد مواد مسجلة بعد</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {enrollments.map((en: any, i: number) => {
                const pct = en.maxScore ? Math.round((en.score / en.maxScore) * 100) : 0;
                return (
                  <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '16px 20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{en.subject?.name || 'مادة'}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>👨‍🏫 {en.subject?.teacherName || '-'}</span>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: 20, color: pct >= 60 ? 'var(--success)' : 'var(--error)' }}>
                        {en.score || 0}/{en.maxScore || 100}
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-card)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 60 ? 'var(--success)' : 'var(--error)', borderRadius: 100, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{pct}% من الدرجة الكاملة</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {section === 'payments' && (
        <div>
          {payments.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">💰</div><p className="empty-state-text">لا يوجد سجلات مصاريف</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {payments.map((p: any, i: number) => (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.month}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>المبلغ: {p.amount} جنيه</div>
                    {p.paidAt && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>تاريخ الدفع: {new Date(p.paidAt).toLocaleDateString('ar-EG')}</div>}
                  </div>
                  <span className={`badge ${p.status === 'paid' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: 14, padding: '8px 16px' }}>
                    {p.status === 'paid' ? '✅ مدفوع' : '❌ غير مدفوع'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {section === 'attendance' && (
        <div>
          <div className="grid-3" style={{ marginBottom: 24 }}>
            <StatCard icon="✅" label="حاضر" value={presentCount} colorClass="stat-card-green" />
            <StatCard icon="❌" label="غائب" value={absentCount} colorClass="stat-card-red" />
            <StatCard icon="📊" label="معدل الحضور" value={`${attRate}%`} isText colorClass="stat-card-orange" />
          </div>
          {attendance.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📅</div><p className="empty-state-text">لا يوجد سجلات حضور</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>التاريخ</th><th>المادة</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
                <tbody>
                  {attendance.map((a: any, i: number) => (
                    <tr key={i}>
                      <td>{a.date}</td>
                      <td>{a.subject?.name || 'عام'}</td>
                      <td>
                        <span className={`badge ${a.status === 'present' ? 'badge-success' : a.status === 'absent' ? 'badge-error' : 'badge-warning'}`}>
                          {a.status === 'present' ? '✅ حاضر' : a.status === 'absent' ? '❌ غائب' : '📋 مبرر'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {section === 'evaluations' && (
        <EvaluationsSection evaluations={evaluations} />
      )}
    </div>
  );
}

// ============= SHARED COMPONENTS ==================
function StatCard({ icon, label, value, colorClass, isText }: {
  icon: string; label: string; value: any; colorClass: string; isText?: boolean;
}) {
  return (
    <div className={`stat-card ${colorClass}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className={isText ? '' : 'stat-number'} style={isText ? { fontSize: 22, fontWeight: 800, color: 'var(--accent-orange)', marginBottom: 4 } : { marginBottom: 4 }}>
            {value}
          </div>
          <div className="stat-label">{label}</div>
        </div>
        <span className="stat-icon">{icon}</span>
      </div>
    </div>
  );
}

function StudentsTable({ students, showAll, showPayment, showAttendance, onEvaluate }: {
  students: any[]; showAll?: boolean; showPayment?: boolean; showAttendance?: boolean; onEvaluate?: (s: any) => void;
}) {
  if (students.length === 0) {
    return <div className="empty-state"><div className="empty-state-icon">🎓</div><p className="empty-state-text">لا يوجد طلاب مسجلين بعد</p></div>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>رقم الهاتف</th>
            <th>الصف</th>
            <th>المواد</th>
            {showPayment && <th>المصروف</th>}
            {showAttendance && <th>الحضور</th>}
            {onEvaluate && <th>تقييم</th>}
          </tr>
        </thead>
        <tbody>
          {students.map((s: any) => (
            <tr key={s.id}>
              <td style={{ fontWeight: 600 }}>{s.name}</td>
              <td style={{ color: 'var(--text-secondary)', direction: 'ltr', textAlign: 'right' }}>{s.phone}</td>
              <td><span className="badge badge-info">{s.grade || 'غير محدد'}</span></td>
              <td style={{ color: 'var(--text-secondary)' }}>
                {s.subjects?.length > 0 ? s.subjects.map((sub: any) => sub.name).join('، ') : '—'}
              </td>
              {showPayment && (
                <td>
                  <span className={`badge ${s.paymentStatus === 'paid' ? 'badge-success' : 'badge-error'}`}>
                    {s.paymentStatus === 'paid' ? '✅ دفع' : '❌ لم يدفع'}
                  </span>
                </td>
              )}
              {showAttendance && (
                <td>
                  <span className={`badge ${s.attendanceRate >= 75 ? 'badge-success' : 'badge-warning'}`}>
                    {s.attendanceRate}%
                  </span>
                </td>
              )}
              {onEvaluate && (
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => onEvaluate(s)}>⭐ تقييم</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeachersTable({ teachers }: { teachers: any[] }) {
  if (teachers.length === 0) {
    return <div className="empty-state"><div className="empty-state-icon">👨‍🏫</div><p className="empty-state-text">لا يوجد مدرسين مسجلين بعد</p></div>;
  }
  return (
    <div className="table-wrapper">
      <table>
        <thead><tr><th>الاسم</th><th>رقم الهاتف</th><th>البريد الإلكتروني</th><th>المادة</th><th>عدد الطلاب</th></tr></thead>
        <tbody>
          {teachers.map((t: any, i: number) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{t.name}</td>
              <td style={{ direction: 'ltr', textAlign: 'right', color: 'var(--text-secondary)' }}>{t.phone}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{t.email || '—'}</td>
              <td><span className="badge badge-orange">{t.subjectName}</span></td>
              <td><span className="badge badge-info">{t.studentCount} طالب</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SecretariesTable({ secretaries }: { secretaries: any[] }) {
  if (secretaries.length === 0) {
    return <div className="empty-state"><div className="empty-state-icon">💼</div><p className="empty-state-text">لا يوجد سكرتارية مسجلين بعد</p></div>;
  }
  return (
    <div className="table-wrapper">
      <table>
        <thead><tr><th>الاسم</th><th>رقم الهاتف</th><th>البريد الإلكتروني</th><th>تاريخ الإضافة</th></tr></thead>
        <tbody>
          {secretaries.map((s: any, i: number) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{s.name}</td>
              <td style={{ direction: 'ltr', textAlign: 'right', color: 'var(--text-secondary)' }}>{s.phone}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{s.email || '—'}</td>
              <td style={{ color: 'var(--text-muted)' }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsSection({ payments, students, onUpdate }: { payments: any[]; students?: any[]; onUpdate?: () => void }) {
  if (payments.length === 0) {
    return (
      <div>
        {onUpdate && <button className="btn btn-primary" style={{ marginBottom: 24 }} onClick={onUpdate}>💰 تحديث مصروف</button>}
        <div className="empty-state"><div className="empty-state-icon">💰</div><p className="empty-state-text">لا يوجد سجلات مصاريف</p></div>
      </div>
    );
  }

  return (
    <div>
      {onUpdate && <button className="btn btn-primary" style={{ marginBottom: 24 }} onClick={onUpdate}>💰 تحديث مصروف</button>}
      <div className="table-wrapper">
        <table>
          <thead><tr><th>الطالب</th><th>الشهر</th><th>المبلغ</th><th>الحالة</th><th>تاريخ الدفع</th></tr></thead>
          <tbody>
            {payments.map((p: any, i: number) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{p.student?.name || 'الطالب'}</td>
                <td>{p.month}</td>
                <td>{p.amount} جنيه</td>
                <td>
                  <span className={`badge ${p.status === 'paid' ? 'badge-success' : 'badge-error'}`}>
                    {p.status === 'paid' ? '✅ دفع' : '❌ لم يدفع'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ar-EG') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceSection({ attendance, students, onAdd }: { attendance: any[]; students?: any[]; onAdd?: () => void }) {
  if (attendance.length === 0) {
    return (
      <div>
        {onAdd && <button className="btn btn-primary" style={{ marginBottom: 24 }} onClick={onAdd}>📅 تسجيل حضور</button>}
        <div className="empty-state"><div className="empty-state-icon">📅</div><p className="empty-state-text">لا يوجد سجلات حضور</p></div>
      </div>
    );
  }

  return (
    <div>
      {onAdd && <button className="btn btn-primary" style={{ marginBottom: 24 }} onClick={onAdd}>📅 تسجيل حضور</button>}
      <div className="table-wrapper">
        <table>
          <thead><tr><th>الطالب</th><th>التاريخ</th><th>المادة</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
          <tbody>
            {attendance.map((a: any, i: number) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{a.student?.name || 'الطالب'}</td>
                <td>{a.date}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{a.subject?.name || 'عام'}</td>
                <td>
                  <span className={`badge ${a.status === 'present' ? 'badge-success' : a.status === 'absent' ? 'badge-error' : 'badge-warning'}`}>
                    {a.status === 'present' ? '✅ حاضر' : a.status === 'absent' ? '❌ غائب' : '📋 مبرر'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{a.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EvaluationsSection({ evaluations }: { evaluations: any[] }) {
  if (evaluations.length === 0) {
    return <div className="empty-state"><div className="empty-state-icon">⭐</div><p className="empty-state-text">لا يوجد تقييمات بعد</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {evaluations.map((ev: any, i: number) => (
        <div key={i} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <Stars rating={ev.rating} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {ev.student?.name && <span>{ev.student.name} </span>}
              {ev.teacher?.name && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>— {ev.teacher.name}</span>}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{ev.notes}</p>
            {ev.subject?.name && <span className="badge badge-orange" style={{ marginTop: 6 }}>{ev.subject.name}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString('ar-EG') : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`star ${n <= rating ? 'active' : ''}`}>★</span>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
      </div>
    </div>
  );
}
