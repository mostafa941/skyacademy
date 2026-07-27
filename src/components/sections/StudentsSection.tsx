'use client';

import { useState, useEffect, useCallback } from 'react';

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
  paymentReason?: string;
  remainingAmount: number;
  remainingReason?: string;
  totalAttendance: number;
  presentCount: number;
  absentCount: number;
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

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
  });

  const [gradeForm, setGradeForm] = useState({ title: '', score: 100, maxScore: 100 });
  const [payForm, setPayForm] = useState({
    amount: 300,
    paymentReason: 'مصاريف الدرس الشهري',
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
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        setStudentForm({ id: '', name: '', phone: '', parentPhone: '', subjectName: '', teacherId: '', grade: 'الصف الأول الثانوي', monthlyFee: 300, notes: '' });
        loadData();
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
        setShowDetailModal(false);
        loadData();
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
        setSelectedStudent({ ...selectedStudent, grades: newGrades });
        setShowGradeModal(false);
        setGradeForm({ title: '', score: 100, maxScore: 100 });
        loadData();
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
        loadData();
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
          paymentReason: payForm.paymentReason,
          remainingAmount: payForm.remainingAmount,
          remainingReason: payForm.remainingReason,
          status: payForm.status,
        }),
      });
      if (res.ok) {
        showToast('تم تحديث حالة دفع الطالب');
        setShowPayModal(false);
        loadData();
      }
    } catch {
      showToast('خطأ في التحديث', 'error');
    }
  };

  // Send Report via WhatsApp
  const handleSendWhatsApp = (st: Student) => {
    const cleanPhone = st.parentPhone.replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('01')) formattedPhone = '2' + cleanPhone;

    const gradesText = st.grades && st.grades.length > 0
      ? st.grades.map(g => `• ${g.title}: ${g.score}/${g.maxScore}`).join('\n')
      : 'لا يوجد درجات مسجلة بعد';

    const payText = st.paymentStatus === 'paid'
      ? `✅ تم دفع المصاريف (${st.paymentAmount} ج.م - ${st.paymentReason || ''})`
      : st.paymentStatus === 'partial'
      ? `⚠️ دفع جزئي (${st.paymentAmount} ج.م) والمتبقي: ${st.remainingAmount} ج.م (سبب: ${st.remainingReason || 'غير محدد'})`
      : `❌ لم يتم دفع المصاريف. المتبقي: ${st.monthlyFee} ج.م`;

    const message = `تقرير الطالب: ${st.name} 🎓\n` +
      `المادة: ${st.subjectName}\n` +
      `المدرس: ${st.teacherName}\n` +
      `-------------------------\n` +
      `📅 الحضور والغياب:\n` +
      `حاضر: ${st.presentCount} | غائب: ${st.absentCount}\n\n` +
      `💰 حالة المصاريف:\n${payText}\n\n` +
      `⭐ الدرجات والأداء:\n${gradesText}\n\n` +
      `📝 ملاحظات الأكاديمية:\n${st.notes || 'لا يوجد ملاحظات'}\n` +
      `-------------------------\n` +
      `تحيات أكاديمية اسكاي (Sky Academy) 🌤️`;

    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>🎓 إدارة الطلاب</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>قائمة الطلاب، التقارير الشاملة، والواتساب</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/api/students/export" download className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            📥 تصدير شيت Excel
          </a>
          <button className="btn btn-primary" onClick={() => {
            setStudentForm({ id: '', name: '', phone: '', parentPhone: '', subjectName: '', teacherId: '', grade: 'الصف الأول الثانوي', monthlyFee: 300, notes: '' });
            setShowAddModal(true);
          }}>
            + إضافة طالب جديد
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: 16 }}>
        <input
          className="input"
          placeholder="🔍 ابحث باسم الطالب، رقم الفون، رقم الوالد، أو المادة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Student List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎓</div>
          <p className="empty-state-text">لا يوجد طلاب مسجلين</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>اسم الطالب</th>
                <th>المادة والمدرس</th>
                <th>رقم الطالب</th>
                <th>رقم الوالد (واتس)</th>
                <th>حالة الدفع</th>
                <th>الحضور والغياب</th>
                <th>التقارير والإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id}>
                  <td style={{ fontWeight: 700 }}>
                    <div style={{ color: 'var(--text-primary)' }}>{st.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{st.grade}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{st.subjectName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>👨‍🏫 {st.teacherName}</div>
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
                  </td>
                  <td>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>{st.presentCount} حاضر</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
                    <span style={{ color: 'var(--error)', fontWeight: 700 }}>{st.absentCount} غائب</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedStudent(st); setShowDetailModal(true); }}>
                        📋 التقرير الشامل
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSendWhatsApp(st)} style={{ background: '#25D366', borderColor: '#25D366' }}>
                        💬 واتساب
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {studentForm.id ? '✏️ تعديل بيانات الطالب' : '🎓 إضافة طالب جديد'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">اسم الطالب كامل *</label>
                <input className="input" placeholder="مثال: أحمد محمد علي" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">رقم هاتف الطالب *</label>
                  <input className="input" placeholder="01xxxxxxxxx" value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">رقم فون الوالد (واتس) *</label>
                  <input className="input" placeholder="01xxxxxxxxx" value={studentForm.parentPhone} onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">المادة الدراسية *</label>
                  <input className="input" placeholder="مثال: رياضيات، فيزياء..." value={studentForm.subjectName} onChange={(e) => setStudentForm({ ...studentForm, subjectName: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">المدرس المسؤول</label>
                  <select className="input" value={studentForm.teacherId} onChange={(e) => setStudentForm({ ...studentForm, teacherId: e.target.value })}>
                    <option value="">اختر المدرس...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subjectName})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">الصف الدراسي *</label>
                  <input className="input" placeholder="مثال: الصف الأول الثانوي" value={studentForm.grade} onChange={(e) => setStudentForm({ ...studentForm, grade: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">المصروف الشهري (ج.م)</label>
                  <input className="input" type="number" value={studentForm.monthlyFee} onChange={(e) => setStudentForm({ ...studentForm, monthlyFee: +e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">ملاحظات على الطالب</label>
                <textarea className="input" rows={2} placeholder="ملاحظات سلوكية أو تعليمية..." value={studentForm.notes} onChange={(e) => setStudentForm({ ...studentForm, notes: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={handleSaveStudent} style={{ flex: 1 }}>حفظ الطالب</button>
                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Student Detail Report Modal */}
      {showDetailModal && selectedStudent && (
        <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="modal card-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>📋 تقرير الطالب: {selectedStudent.name}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedStudent.grade} — مادة: {selectedStudent.subjectName}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleSendWhatsApp(selectedStudent)} style={{ background: '#25D366', borderColor: '#25D366' }}>
                💬 إرسال للوالد على الواتساب
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Basic & Contact Info */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>رقم الطالب:</span> <div dir="ltr" style={{ textAlign: 'right', fontWeight: 600 }}>{selectedStudent.phone}</div></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>رقم الوالد:</span> <div dir="ltr" style={{ textAlign: 'right', fontWeight: 600 }}>{selectedStudent.parentPhone}</div></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>المدرس:</span> <div style={{ fontWeight: 600 }}>{selectedStudent.teacherName}</div></div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>المصروف الشهري:</span> <div style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{selectedStudent.monthlyFee} ج.م</div></div>
              </div>

              {/* Payment Section */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ fontWeight: 700 }}>💰 حالة المصاريف والدفع</h4>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(true)}>تعديل حالة الدفع</button>
                </div>
                <div style={{ fontSize: 14 }}>
                  حالة الشهر الحالي: {' '}
                  {selectedStudent.paymentStatus === 'paid' ? (
                    <span className="badge badge-success">تم الدفع بالكامل</span>
                  ) : selectedStudent.paymentStatus === 'partial' ? (
                    <span className="badge badge-orange">دفع جزئي</span>
                  ) : (
                    <span className="badge badge-danger">لم يدفع بعد</span>
                  )}
                </div>
                {selectedStudent.paymentReason && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>سبب الدفع: {selectedStudent.paymentReason}</div>}
                {selectedStudent.remainingAmount > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--error)', marginTop: 4, fontWeight: 600 }}>
                    المبلغ المتبقي: {selectedStudent.remainingAmount} ج.م — سبب المتبقي: {selectedStudent.remainingReason || 'غير محدد'}
                  </div>
                )}
              </div>

              {/* Attendance Section */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ fontWeight: 700 }}>📅 الحضور والغياب</h4>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAttModal(true)}>+ تسجيل حضور/غياب</button>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                  <div>إجمالي الحضور: <strong style={{ color: 'var(--success)' }}>{selectedStudent.presentCount} حصص</strong></div>
                  <div>إجمالي الغياب: <strong style={{ color: 'var(--error)' }}>{selectedStudent.absentCount} حصص</strong></div>
                </div>
              </div>

              {/* Grades Section */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ fontWeight: 700 }}>⭐ الدرجات والاختبارات</h4>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowGradeModal(true)}>+ إضافة درجة</button>
                </div>
                {selectedStudent.grades && selectedStudent.grades.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedStudent.grades.map((g, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: 6 }}>
                        <span>{g.title} {g.date ? `(${g.date})` : ''}</span>
                        <strong style={{ color: 'var(--accent-orange)' }}>{g.score} / {g.maxScore}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>لا يوجد اختبارات مسجلة بعد</div>
                )}
              </div>

              {/* Notes */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <h4 style={{ fontWeight: 700, marginBottom: 4 }}>📝 ملاحظات خاصة</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedStudent.notes || 'لا يوجد ملاحظات مدونة'}</p>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
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
                  });
                  setShowDetailModal(false);
                  setShowAddModal(true);
                }}>
                  ✏️ تعديل بيانات الطالب
                </button>
                <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDeleteStudent(selectedStudent.id)}>
                  🗑️ حذف الطالب
                </button>
                <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => setShowDetailModal(false)}>
                  إغلاق
                </button>
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
                <label className="input-label">سبب الدفع</label>
                <input className="input" placeholder="مثال: اشتراك شهر يوليو" value={payForm.paymentReason} onChange={(e) => setPayForm({ ...payForm, paymentReason: e.target.value })} />
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
                <button className="btn btn-primary" onClick={handleSavePayment} style={{ flex: 1 }}>حفظ حالة الدفع</button>
                <button className="btn btn-ghost" onClick={() => setShowPayModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast message */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
