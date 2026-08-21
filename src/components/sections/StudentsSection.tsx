'use client';

import { useState, useEffect, useCallback } from 'react';
import PDFReport from '../PDFReport';
import { openStudentWhatsAppReport, openStudentWhatsAppDetails, AttendanceRecord } from '@/lib/whatsapp';

interface Student {
  id: string;
  name: string;
  phone: string;
  parentPhone: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  monthlyFee: number;
  notes: string;
  grades: Array<{ title: string; score: number; maxScore: number; date?: string }>;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  paymentAmount: number;
  paymentType?: 'session' | 'monthly';
  paymentReason?: string;
  remainingAmount: number;
  remainingReason?: string;
  totalAttendance: number;
  presentCount: number;
  absentCount: number;
  excusedCount?: number;
  attendanceHistory?: AttendanceRecord[];
  type?: 'student' | 'trainee';
}

interface Teacher {
  id: string;
  name: string;
  type: string;
  subjectName: string;
}

export default function StudentsSection() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Views
  const [currentView, setCurrentView] = useState<'list' | 'profile'>('list');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [activeTab, setActiveTab] = useState<'student' | 'trainee'>('student');
  const [selectedStage, setSelectedStage] = useState<'primary' | 'prep' | 'secondary'>('secondary');

  // Forms
  const [studentForm, setStudentForm] = useState({
    id: '',
    name: '',
    phone: '',
    parentPhone: '',
    subjectName: '',
    teacherId: '',
    grade: 'الصف الأول الثانوي',
    monthlyFee: 300,
    notes: '',
    type: 'student' as 'student' | 'trainee',
  });

  useEffect(() => {
    if (studentForm.grade) {
      if (studentForm.grade.includes('الابتدائي')) {
        setSelectedStage('primary');
      } else if (studentForm.grade.includes('الإعدادي')) {
        setSelectedStage('prep');
      } else if (studentForm.grade.includes('الثانوي')) {
        setSelectedStage('secondary');
      }
    }
  }, [studentForm.grade, showAddModal]);

  const [gradeForm, setGradeForm] = useState({ title: '', score: 100, maxScore: 100 });
  const [payForm, setPayForm] = useState({
    amount: 300,
    paymentType: 'monthly' as 'session' | 'monthly',
    paymentReason: 'اشتراك شهري',
    remainingAmount: 0,
    remainingReason: '',
    status: 'paid' as 'paid' | 'unpaid' | 'partial',
  });
  const [attForm, setAttForm] = useState({ status: 'present' as 'present' | 'absent', date: new Date().toISOString().substring(0, 10), notes: '' });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resSt, resTe] = await Promise.all([
        fetch(`/api/students${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        fetch('/api/teachers'),
      ]);
      if (resSt.ok) {
        const d = await resSt.json();
        setStudents(d.students || []);
        // Update selected student if in profile view
        if (selectedStudent) {
          const updated = d.students.find((s: Student) => s.id === selectedStudent.id);
          if (updated) setSelectedStudent(updated);
        }
      }
      if (resTe.ok) {
        const d = await resTe.json();
        setTeachers(d.teachers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedStudent]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]); // Intentionally omitting loadData to avoid re-fetching loop if selectedStudent changes

  const refreshList = async () => {
    try {
      const resSt = await fetch(`/api/students${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      if (resSt.ok) {
        const d = await resSt.json();
        setStudents(d.students || []);
        if (selectedStudent) {
          const updated = d.students.find((s: Student) => s.id === selectedStudent.id);
          if (updated) setSelectedStudent(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Add/Edit Student
  const handleSaveStudent = async () => {
    if (!studentForm.name || !studentForm.phone || !studentForm.parentPhone || !studentForm.subjectName) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    const method = studentForm.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/students', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(studentForm.id ? 'تم تعديل بيانات الطالب' : 'تم إضافة الطالب بنجاح');
        setShowAddModal(false);
        setStudentForm({ id: '', name: '', phone: '', parentPhone: '', subjectName: '', teacherId: '', grade: 'الصف الأول الثانوي', monthlyFee: 300, notes: '', type: activeTab });
        refreshList();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id: string) => {
    if (!confirm('هل أنت تأكد من حذف هذا الطالب نهائياً؟')) return;
    try {
      const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم حذف الطالب');
        setCurrentView('list');
        refreshList();
      }
    } catch {
      showToast('خطأ أثناء الحذف', 'error');
    }
  };

  // Add Grade to selected student
  const handleAddGrade = async () => {
    if (!selectedStudent || !gradeForm.title) return;
    const newGrades = [...(selectedStudent.grades || []), { ...gradeForm, date: new Date().toISOString().substring(0, 10) }];
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStudent.id, grades: newGrades }),
      });
      if (res.ok) {
        showToast('تم إضافة الدرجة بنجاح');
        setShowGradeModal(false);
        setGradeForm({ title: '', score: 100, maxScore: 100 });
        refreshList();
      }
    } catch {
      showToast('خطأ في إضافة الدرجة', 'error');
    }
  };

  // Save Attendance for selected student
  const handleSaveAttendance = async () => {
    if (!selectedStudent) return;
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          date: attForm.date,
          status: attForm.status,
          notes: attForm.notes,
        }),
      });
      if (res.ok) {
        showToast('تم تسجيل الحضور/الغياب بنجاح');
        setShowAttModal(false);
        refreshList();
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  // Update Payment Status for selected student
  const handleSavePayment = async () => {
    if (!selectedStudent) return;
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          month: currentMonth,
          amount: payForm.amount,
          paymentType: payForm.paymentType,
          paymentReason: payForm.paymentReason,
          remainingAmount: payForm.remainingAmount,
          remainingReason: payForm.remainingReason,
          status: payForm.status,
        }),
      });
      if (res.ok) {
        showToast('تم تحديث حالة دفع الطالب');
        setShowPayModal(false);
        refreshList();
      }
    } catch {
      showToast('خطأ في التحديث', 'error');
    }
  };

  const handleSendWhatsApp = (st: Student) => {
    openStudentWhatsAppReport(st);
  };

  const uniqueSubjects = Array.from(
    new Set(
      teachers
        .filter(t => t.type === (studentForm.type === 'trainee' ? 'trainer' : 'teacher'))
        .map(t => t.subjectName)
    )
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Dynamic Header based on view */}
      {currentView === 'list' ? (
        <>
          {/* Header */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
                {activeTab === 'student' ? '🎓 إدارة الطلاب التعليميين' : '🏋️ إدارة المتدربين الرياضيين'}
              </h1>
              <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {activeTab === 'student' ? 'متابعة قائمة الطلاب، المدفوعات، والصفوف الدراسية' : 'متابعة المتدربين، المدفوعات، والمدربين الرياضيين'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="/api/students/export" download className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                📥 تصدير شيت Excel
              </a>
              <button className="btn btn-primary" onClick={() => {
                setStudentForm({
                  id: '',
                  name: '',
                  phone: '',
                  parentPhone: '',
                  subjectName: '',
                  teacherId: '',
                  grade: activeTab === 'trainee' ? 'متدرب' : 'الصف الأول الثانوي',
                  monthlyFee: 300,
                  notes: '',
                  type: activeTab,
                });
                setShowAddModal(true);
              }}>
                {activeTab === 'student' ? '+ إضافة طالب جديد' : '+ إضافة متدرب جديد'}
              </button>
            </div>
          </div>

          {/* Student/Trainee Tabs */}
          <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <button
              className={`btn ${activeTab === 'student' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('student')}
            >
              🎓 قائمة الطلاب
            </button>
            <button
              className={`btn ${activeTab === 'trainee' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('trainee')}
            >
              🏋️ قائمة المتدربين
            </button>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <input
              className="input"
              placeholder="🔍 ابحث باسم الطالب، رقم الفون، رقم الوالد، أو المادة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
            </div>
          ) : students.filter(st => (st.type || 'student') === activeTab).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{activeTab === 'student' ? '🎓' : '🏋️'}</div>
              <p className="empty-state-text">{activeTab === 'student' ? 'لا يوجد طلاب مسجلين بعد' : 'لا يوجد متدربين مسجلين بعد'}</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{activeTab === 'student' ? 'اسم الطالب' : 'اسم المتدرب'}</th>
                    <th>{activeTab === 'student' ? 'المادة والمدرس' : 'التخصص والمدرب'}</th>
                    <th>{activeTab === 'student' ? 'رقم الطالب' : 'رقم المتدرب'}</th>
                    <th>رقم الوالد (واتس)</th>
                    <th>حالة الدفع</th>
                    <th>الحضور والغياب</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(st => (st.type || 'student') === activeTab).map((st) => (
                    <tr key={st.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedStudent(st); setCurrentView('profile'); }}>
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ color: 'var(--text-primary)' }}>{st.name}</div>
                        {st.type !== 'trainee' && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{st.grade}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{st.subjectName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {st.type === 'trainee' ? `🏋️ ${st.teacherName}` : `👨‍🏫 ${st.teacherName}`}
                        </div>
                      </td>
                      <td dir="ltr" style={{ textAlign: 'right' }}>{st.phone}</td>
                      <td dir="ltr" style={{ textAlign: 'right' }}>{st.parentPhone}</td>
                      <td>
                        {st.paymentStatus === 'paid' ? (
                          <span className="badge badge-success">تم الدفع</span>
                        ) : st.paymentStatus === 'partial' ? (
                          <span className="badge badge-orange">جزئي (متبقي {st.remainingAmount})</span>
                        ) : (
                          <span className="badge badge-danger">لم يدفع</span>
                        )}
                        {st.paymentType === 'session' && <div style={{ fontSize: 10, marginTop: 4, color: 'var(--text-muted)' }}>(بالحصة)</div>}
                      </td>
                      <td>
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>{st.presentCount} حاضر</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
                        <span style={{ color: 'var(--error)', fontWeight: 700 }}>{st.absentCount} غائب</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(st);
                              setCurrentView('profile');
                            }}
                          >
                            فتح الملف
                          </button>
                          <button
                            className="btn btn-sm"
                            title="إرسال التقرير الشامل على واتساب"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendWhatsApp(st);
                            }}
                            style={{
                              background: '#25D366',
                              color: 'white',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-md)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            <span>💬</span> تقرير
                          </button>
                          <button
                            className="btn btn-sm"
                            title="إرسال تفاصيل الطالب/المتدرب على واتساب"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStudentWhatsAppDetails(st);
                            }}
                            style={{
                              background: '#128C7E',
                              color: 'white',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-md)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            <span>📋</span> تفاصيل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* ================== PROFILE VIEW ================== */
        selectedStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-icon" onClick={() => { setCurrentView('list'); setSelectedStudent(null); }}>
              ←
            </button>
            <div>
              <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
                {selectedStudent.type === 'trainee' ? '🏋️ ملف المتدرب' : '🎓 ملف الطالب'}: {selectedStudent.name}
              </h1>
              <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {selectedStudent.type === 'trainee' ? `متدرب رياضي — التخصص: ${selectedStudent.subjectName}` : `${selectedStudent.grade} — مادة: ${selectedStudent.subjectName}`}
              </p>
            </div>
            <div style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => handleSendWhatsApp(selectedStudent)} style={{ background: '#25D366', borderColor: '#25D366' }}>
                💬 تقرير واتس
              </button>
              <button className="btn btn-primary" onClick={() => openStudentWhatsAppDetails(selectedStudent)} style={{ background: '#128C7E', borderColor: '#128C7E' }}>
                📋 إرسال تفاصيل
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPdf(true)}>
                📄 تصدير PDF
              </button>
              <button className="btn btn-secondary" onClick={() => {
                setStudentForm({
                  id: selectedStudent.id,
                  name: selectedStudent.name,
                  phone: selectedStudent.phone,
                  parentPhone: selectedStudent.parentPhone,
                  subjectName: selectedStudent.subjectName,
                  teacherId: selectedStudent.teacherId,
                  grade: selectedStudent.grade,
                  monthlyFee: selectedStudent.monthlyFee,
                  notes: selectedStudent.notes,
                  type: selectedStudent.type || 'student',
                });
                setShowAddModal(true);
              }}>
                ✏️ تعديل
              </button>
              <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDeleteStudent(selectedStudent.id)}>
                🗑️
              </button>
            </div>
          </div>

          <div className="grid-2">
            {/* Basic Info */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>البيانات الأساسية</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selectedStudent.type === 'trainee' ? 'رقم المتدرب:' : 'رقم الطالب:'}</span> <div dir="ltr" style={{ textAlign: 'right', fontWeight: 600 }}>{selectedStudent.phone}</div></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>رقم الوالد:</span> <div dir="ltr" style={{ textAlign: 'right', fontWeight: 600 }}>{selectedStudent.parentPhone}</div></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selectedStudent.type === 'trainee' ? 'المدرب:' : 'المدرس:'}</span> <div style={{ fontWeight: 600 }}>{selectedStudent.teacherName}</div></div>
                  <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>المصروف الافتراضي:</span> <div style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{selectedStudent.monthlyFee} ج.م</div></div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>ملاحظات:</span> 
                  <div style={{ fontSize: 14 }}>{selectedStudent.notes || 'لا يوجد'}</div>
                </div>
              </div>

              {/* Payments */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>💰 حالة المصاريف (الشهر الحالي)</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setPayForm({
                      ...payForm, 
                      amount: selectedStudent.monthlyFee,
                      paymentType: 'monthly'
                    });
                    setShowPayModal(true);
                  }}>تسجيل دفع</button>
                </div>
                <div style={{ fontSize: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    الحالة: {' '}
                    {selectedStudent.paymentStatus === 'paid' ? (
                      <span className="badge badge-success">تم الدفع بالكامل</span>
                    ) : selectedStudent.paymentStatus === 'partial' ? (
                      <span className="badge badge-orange">دفع جزئي</span>
                    ) : (
                      <span className="badge badge-danger">لم يدفع بعد</span>
                    )}
                  </div>
                  <div>نوع الدفع: <strong style={{ color: 'var(--info)' }}>{selectedStudent.paymentType === 'session' ? 'بالحصة' : 'بالشهر'}</strong></div>
                  {selectedStudent.paymentReason && <div style={{ color: 'var(--text-secondary)' }}>السبب: {selectedStudent.paymentReason}</div>}
                  {selectedStudent.remainingAmount > 0 && (
                    <div style={{ color: 'var(--error)', fontWeight: 600, marginTop: 4 }}>
                      المبلغ المتبقي: {selectedStudent.remainingAmount} ج.م — سبب المتبقي: {selectedStudent.remainingReason || 'غير محدد'}
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>📅 الحضور والغياب</h3>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAttModal(true)}>+ تسجيل يوم</button>
                </div>
                <div style={{ display: 'flex', gap: 24, fontSize: 16, justifyContent: 'center', padding: '10px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--success)', fontSize: 24, fontWeight: 800 }}>{selectedStudent.presentCount}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>حضور</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--error)', fontSize: 24, fontWeight: 800 }}>{selectedStudent.absentCount}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>غياب</div>
                  </div>
                </div>
              </div>

              {/* Grades */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>⭐ الدرجات والاختبارات</h3>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowGradeModal(true)}>+ إضافة درجة</button>
                </div>
                {selectedStudent.grades && selectedStudent.grades.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedStudent.grades.map((g, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 8 }}>
                        <span style={{ fontWeight: 600 }}>{g.title} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.date ? `(${g.date})` : ''}</span></span>
                        <strong style={{ color: 'var(--accent-orange)' }}>{g.score} / {g.maxScore}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>لا يوجد اختبارات مسجلة بعد</div>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {studentForm.id
                ? (studentForm.type === 'trainee' ? '✏️ تعديل بيانات المتدرب' : '✏️ تعديل بيانات الطالب')
                : (activeTab === 'trainee' ? '🏋️ إضافة متدرب جديد' : '🎓 إضافة طالب جديد')
              }
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">نوع التسجيل *</label>
                  <select
                    className="input"
                    value={studentForm.type}
                    onChange={(e) => {
                      const newType = e.target.value as 'student' | 'trainee';
                      setStudentForm({
                        ...studentForm,
                        type: newType,
                        grade: newType === 'trainee' ? 'متدرب' : 'الصف الأول الثانوي',
                        teacherId: '',
                      });
                    }}
                  >
                    <option value="student">طالب تعليمي 🎓</option>
                    <option value="trainee">متدرب رياضي 🏋️</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{studentForm.type === 'trainee' ? 'اسم المتدرب كامل *' : 'اسم الطالب كامل *'}</label>
                  <input className="input" placeholder="مثال: أحمد محمد علي" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">{studentForm.type === 'trainee' ? 'رقم هاتف المتدرب *' : 'رقم هاتف الطالب *'}</label>
                  <input className="input" placeholder="01xxxxxxxxx" value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">رقم فون الوالد (واتس) *</label>
                  <input className="input" placeholder="01xxxxxxxxx" value={studentForm.parentPhone} onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">{studentForm.type === 'trainee' ? 'التخصص الرياضي / التدريب *' : 'المادة الدراسية *'}</label>
                  <select 
                    className="input" 
                    value={studentForm.subjectName} 
                    onChange={(e) => setStudentForm({ ...studentForm, subjectName: e.target.value })}
                  >
                    <option value="">{studentForm.type === 'trainee' ? 'اختر التدريب...' : 'اختر المادة...'}</option>
                    {uniqueSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{studentForm.type === 'trainee' ? 'المدرب المسؤول *' : 'المدرس المسؤول *'}</label>
                  <select className="input" value={studentForm.teacherId} onChange={(e) => setStudentForm({ ...studentForm, teacherId: e.target.value })}>
                    <option value="">{studentForm.type === 'trainee' ? 'اختر المدرب...' : 'اختر المدرس...'}</option>
                    {teachers
                      .filter((t) => t.type === (studentForm.type === 'trainee' ? 'trainer' : 'teacher'))
                      .map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.subjectName})</option>
                      ))}
                  </select>
                </div>
              </div>

              {studentForm.type === 'student' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">المرحلة الدراسية *</label>
                    <select
                      className="input"
                      value={selectedStage}
                      onChange={(e) => {
                        const stage = e.target.value as 'primary' | 'prep' | 'secondary';
                        setSelectedStage(stage);
                        if (stage === 'primary') setStudentForm({ ...studentForm, grade: 'الصف الأول الابتدائي' });
                        else if (stage === 'prep') setStudentForm({ ...studentForm, grade: 'الصف الأول الإعدادي' });
                        else if (stage === 'secondary') setStudentForm({ ...studentForm, grade: 'الصف الأول الثانوي' });
                      }}
                    >
                      <option value="primary">ابتدائي 🎒</option>
                      <option value="prep">إعدادي 🏫</option>
                      <option value="secondary">ثانوي 🎓</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">الصف الدراسي *</label>
                    <select
                      className="input"
                      value={studentForm.grade}
                      onChange={(e) => setStudentForm({ ...studentForm, grade: e.target.value })}
                    >
                      {selectedStage === 'primary' && (
                        <>
                          <option value="الصف الأول الابتدائي">أولى ابتدائي</option>
                          <option value="الصف الثاني الابتدائي">تانية ابتدائي</option>
                          <option value="الصف الثالث الابتدائي">تالتة ابتدائي</option>
                          <option value="الصف الرابع الابتدائي">رابعة ابتدائي</option>
                          <option value="الصف الخامس الابتدائي">خامسة ابتدائي</option>
                          <option value="الصف السادس الابتدائي">سادسة ابتدائي</option>
                        </>
                      )}
                      {selectedStage === 'prep' && (
                        <>
                          <option value="الصف الأول الإعدادي">أولى إعدادي</option>
                          <option value="الصف الثاني الإعدادي">تانية إعدادي</option>
                          <option value="الصف الثالث الإعدادي">تالتة إعدادي</option>
                        </>
                      )}
                      {selectedStage === 'secondary' && (
                        <>
                          <option value="الصف الأول الثانوي">أولى ثانوي</option>
                          <option value="الصف الثاني الثانوي">تانية ثانوي</option>
                          <option value="الصف الثالث الثانوي">تالتة ثانوي</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group" style={{ gridColumn: studentForm.type === 'trainee' ? 'span 2' : 'span 1' }}>
                  <label className="input-label">الاشتراك المالي الافتراضي (ج.م)</label>
                  <input className="input" type="number" value={studentForm.monthlyFee} onChange={(e) => setStudentForm({ ...studentForm, monthlyFee: +e.target.value })} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{studentForm.type === 'trainee' ? 'ملاحظات على المتدرب' : 'ملاحظات على الطالب'}</label>
                <textarea className="input" rows={2} placeholder="ملاحظات إضافية..." value={studentForm.notes} onChange={(e) => setStudentForm({ ...studentForm, notes: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={handleSaveStudent} style={{ flex: 1 }}>حفظ الطالب</button>
                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Grade */}
      {showGradeModal && selectedStudent && (
        <div className="modal-backdrop" onClick={() => setShowGradeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>⭐ إضافة درجة اختبار للطالب: {selectedStudent.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">عنوان الاختبار *</label>
                <input className="input" placeholder="مثال: اختبار شهر أكتوبر" value={gradeForm.title} onChange={(e) => setGradeForm({ ...gradeForm, title: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">درجة الطالب</label>
                  <input className="input" type="number" value={gradeForm.score} onChange={(e) => setGradeForm({ ...gradeForm, score: +e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">الدرجة النهائية</label>
                  <input className="input" type="number" value={gradeForm.maxScore} onChange={(e) => setGradeForm({ ...gradeForm, maxScore: +e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleAddGrade} style={{ flex: 1 }}>حفظ الدرجة</button>
                <button className="btn btn-ghost" onClick={() => setShowGradeModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Attendance */}
      {showAttModal && selectedStudent && (
        <div className="modal-backdrop" onClick={() => setShowAttModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📅 تسجيل حضور/غياب: {selectedStudent.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">التاريخ</label>
                <input className="input" type="date" value={attForm.date} onChange={(e) => setAttForm({ ...attForm, date: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">الحالة</label>
                <select className="input" value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value as any })}>
                  <option value="present">حاضر ✅</option>
                  <option value="absent">غائب ❌</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">ملاحظات (اختياري)</label>
                <input className="input" placeholder="سبب الغياب أو تأخير..." value={attForm.notes} onChange={(e) => setAttForm({ ...attForm, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveAttendance} style={{ flex: 1 }}>تسجيل</button>
                <button className="btn btn-ghost" onClick={() => setShowAttModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Update Payment */}
      {showPayModal && selectedStudent && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>💰 دفع مصاريف: {selectedStudent.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">نظام الدفع</label>
                <select className="input" value={payForm.paymentType} onChange={(e) => setPayForm({ ...payForm, paymentType: e.target.value as any })}>
                  <option value="monthly">اشتراك شهري 📅</option>
                  <option value="session">دفع بالحصة ⏱️</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">حالة الدفع</label>
                <select className="input" value={payForm.status} onChange={(e) => setPayForm({ ...payForm, status: e.target.value as any })}>
                  <option value="paid">تم الدفع بالكامل ✅</option>
                  <option value="partial">دفع جزئي (متبقي فلوس) ⚠️</option>
                  <option value="unpaid">لم يدفع ❌</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">المبلغ المدفوع (ج.م)</label>
                <input className="input" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: +e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">سبب الدفع / ملاحظة</label>
                <input className="input" placeholder="مثال: اشتراك شهر يوليو أو حصة المراجعة" value={payForm.paymentReason} onChange={(e) => setPayForm({ ...payForm, paymentReason: e.target.value })} />
              </div>

              {payForm.status === 'partial' && (
                <>
                  <div className="input-group">
                    <label className="input-label">المبلغ المتبقي (ج.م)</label>
                    <input className="input" type="number" value={payForm.remainingAmount} onChange={(e) => setPayForm({ ...payForm, remainingAmount: +e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">سبب المبلغ المتبقي</label>
                    <input className="input" placeholder="مثال: سداد باقي المبلغ الأسبوع القادم" value={payForm.remainingReason} onChange={(e) => setPayForm({ ...payForm, remainingReason: e.target.value })} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleSavePayment} style={{ flex: 1 }}>حفظ الدفع</button>
                <button className="btn btn-ghost" onClick={() => setShowPayModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPdf && selectedStudent && (
        <PDFReport 
          title={`تقرير الطالب: ${selectedStudent.name}`} 
          subtitle={`الصف: ${selectedStudent.grade} | مادة: ${selectedStudent.subjectName} | المدرس: ${selectedStudent.teacherName}`}
          onClose={() => setShowPdf(false)}
        >
          <div style={{ marginBottom: 24 }}>
             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12 }}>البيانات الأساسية</h3>
             <table style={{ width: '100%', marginBottom: 16 }}>
               <tbody>
                 <tr><td style={{ padding: 4, fontWeight: 'bold', width: '30%' }}>رقم الطالب:</td><td style={{ padding: 4 }}>{selectedStudent.phone}</td></tr>
                 <tr><td style={{ padding: 4, fontWeight: 'bold' }}>رقم ولي الأمر:</td><td style={{ padding: 4 }}>{selectedStudent.parentPhone}</td></tr>
                 <tr><td style={{ padding: 4, fontWeight: 'bold' }}>المصروف الافتراضي:</td><td style={{ padding: 4 }}>{selectedStudent.monthlyFee} ج.م</td></tr>
               </tbody>
             </table>

             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12 }}>الماليات والمصروفات (الشهر الحالي)</h3>
             <p>نظام الدفع: {selectedStudent.paymentType === 'session' ? 'دفع بالحصة' : 'اشتراك شهري'}</p>
             <p>حالة الدفع: {selectedStudent.paymentStatus === 'paid' ? 'تم الدفع بالكامل' : selectedStudent.paymentStatus === 'partial' ? `دفع جزئي (متبقي ${selectedStudent.remainingAmount} ج.م)` : 'لم يدفع بعد'}</p>
             {selectedStudent.paymentReason && <p>السبب / التفاصيل: {selectedStudent.paymentReason}</p>}

             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12, marginTop: 24 }}>الحضور والغياب</h3>
             <p>إجمالي الحضور: {selectedStudent.presentCount} حصص</p>
             <p>إجمالي الغياب: {selectedStudent.absentCount} حصص</p>

             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12, marginTop: 24 }}>الدرجات والتقييمات</h3>
             {selectedStudent.grades && selectedStudent.grades.length > 0 ? (
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead>
                   <tr>
                     <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>الاختبار</th>
                     <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>التاريخ</th>
                     <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>الدرجة</th>
                   </tr>
                 </thead>
                 <tbody>
                   {selectedStudent.grades.map((g, i) => (
                     <tr key={i}>
                       <td style={{ border: '1px solid #ddd', padding: 8 }}>{g.title}</td>
                       <td style={{ border: '1px solid #ddd', padding: 8 }}>{g.date || '-'}</td>
                       <td style={{ border: '1px solid #ddd', padding: 8 }}>{g.score} / {g.maxScore}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             ) : <p>لا يوجد درجات مسجلة.</p>}

             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12, marginTop: 24 }}>الملاحظات</h3>
             <p>{selectedStudent.notes || 'لا يوجد ملاحظات مدونة'}</p>
          </div>
        </PDFReport>
      )}

      {/* Toast message */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
