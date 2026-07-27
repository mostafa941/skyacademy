'use client';

import { useState, useEffect, useCallback } from 'react';

interface TeacherStaff {
  id: string;
  name: string;
  phone: string;
  type: 'teacher' | 'trainer';
  subjectName: string;
  roomId: string;
  roomName: string;
  teacherPercentage: number;
  academyPercentage: number;
  balance: number;
  studentCount: number;
  totalAttendance: number;
  presentCount: number;
  absentCount: number;
}

interface RoomOption {
  _id: string;
  name: string;
}

interface TeachersSectionProps {
  staffType: 'teacher' | 'trainer';
  userRole: string;
}

export default function TeachersSection({ staffType, userRole }: TeachersSectionProps) {
  const [staffList, setStaffList] = useState<TeacherStaff[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<TeacherStaff | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Forms
  const [staffForm, setStaffForm] = useState({
    id: '',
    name: '',
    phone: '',
    subjectName: '',
    roomId: '',
    teacherPercentage: 60,
    academyPercentage: 40,
    balance: 0,
  });

  const [attForm, setAttForm] = useState({ status: 'present' as 'present' | 'absent', date: new Date().toISOString().substring(0, 10), notes: '' });
  const [loanForm, setLoanForm] = useState({ amount: 500, reason: 'سلفة مالية', date: new Date().toISOString().substring(0, 10) });

  const labelTitle = staffType === 'teacher' ? 'المدرسين' : 'المدربين';
  const labelSingle = staffType === 'teacher' ? 'مدرس' : 'مدرب';
  const iconEmoji = staffType === 'teacher' ? '👨‍🏫' : '🏋️';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resSt, resRm] = await Promise.all([
        fetch(`/api/teachers?type=${staffType}`),
        fetch('/api/rooms'),
      ]);
      if (resSt.ok) {
        const d = await resSt.json();
        setStaffList(d.teachers || []);
      }
      if (resRm.ok) {
        const d = await resRm.json();
        setRooms(d.rooms || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [staffType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save / Edit Staff
  const handleSaveStaff = async () => {
    if (!staffForm.name || !staffForm.phone || !staffForm.subjectName) {
      showToast('يرجى ملء الاسم ورقم الهاتف والمادة/التخصص', 'error');
      return;
    }

    const method = staffForm.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/teachers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...staffForm,
          type: staffType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(staffForm.id ? `تم تعديل ${labelSingle}` : `تم إضافة ${labelSingle} بنجاح`);
        setShowAddModal(false);
        loadData();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Delete Staff
  const handleDeleteStaff = async (id: string) => {
    if (!confirm(`هل تريد حذف هذا الـ ${labelSingle} نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/teachers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`تم حذف الـ ${labelSingle}`);
        setShowDetailModal(false);
        loadData();
      } else {
        const d = await res.json();
        showToast(d.error || 'خطأ أثناء الحذف', 'error');
      }
    } catch {
      showToast('خطأ بالحذف', 'error');
    }
  };

  // Record Attendance for staff
  const handleSaveAttendance = async () => {
    if (!selectedStaff) return;
    try {
      const res = await fetch('/api/teachers/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedStaff.id,
          date: attForm.date,
          status: attForm.status,
          notes: attForm.notes,
        }),
      });
      if (res.ok) {
        showToast(`تم تسجيل حضور ${labelSingle}`);
        setShowAttModal(false);
        loadData();
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  // Add Loan / Advance Payment
  const handleSaveLoan = async () => {
    if (!selectedStaff || !loanForm.amount) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: loanForm.amount,
          date: loanForm.date,
          reason: `سلفة ${labelSingle}: ${selectedStaff.name} - ${loanForm.reason}`,
          type: 'teacher_loan',
          teacherId: selectedStaff.id,
        }),
      });
      if (res.ok) {
        showToast(`تم تسجيل السلفة وتحديث رصيد الـ ${labelSingle}`);
        setShowLoanModal(false);
        loadData();
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
            {iconEmoji} إدارة {labelTitle}
          </h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            متابعة {labelTitle}، القاعات، الحضور والغياب، والنسب المالية
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setStaffForm({ id: '', name: '', phone: '', subjectName: '', roomId: '', teacherPercentage: 60, academyPercentage: 40, balance: 0 });
          setShowAddModal(true);
        }}>
          + إضافة {labelSingle} جديد
        </button>
      </div>

      {/* Staff List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : staffList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{iconEmoji}</div>
          <p className="empty-state-text">لا يوجد {labelTitle} مسجلين بعد</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>اسم {labelSingle}</th>
                <th>المادة / التخصص</th>
                <th>القاعة</th>
                <th>عدد الطلاب</th>
                {isAdmin && <th>نسبة {labelSingle} / الأكاديمية</th>}
                {isAdmin && <th>الرصيد / السلف</th>}
                <th>الإجراءات والتقارير</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((st) => (
                <tr key={st.id}>
                  <td style={{ fontWeight: 700 }}>
                    <div style={{ color: 'var(--text-primary)' }}>{st.name}</div>
                    <div dir="ltr" style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{st.phone}</div>
                  </td>
                  <td>
                    <span className="badge badge-orange">{st.subjectName}</span>
                  </td>
                  <td>🏫 {st.roomName}</td>
                  <td><strong style={{ color: 'var(--accent-orange)' }}>{st.studentCount} طالب</strong></td>
                  {isAdmin && (
                    <td>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{st.teacherPercentage}%</span> / <span style={{ color: 'var(--text-muted)' }}>{st.academyPercentage}%</span>
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      {st.balance < 0 ? (
                        <span style={{ color: 'var(--error)', fontWeight: 700 }}>سالف {-st.balance} ج.م</span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>مستحق {st.balance} ج.م</span>
                      )}
                    </td>
                  )}
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedStaff(st); setShowDetailModal(true); }}>
                        📋 التقرير الشامل
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add / Edit Staff */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {staffForm.id ? `✏️ تعديل بيانات ${labelSingle}` : `${iconEmoji} إضافة ${labelSingle} جديد`}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">الاسم كامل *</label>
                <input className="input" placeholder="اسم المدرس/المدرب" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">رقم الهاتف *</label>
                  <input className="input" placeholder="01xxxxxxxxx" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">المادة / التخصص *</label>
                  <input className="input" placeholder="مثال: فيزياء، كاراتيه..." value={staffForm.subjectName} onChange={(e) => setStaffForm({ ...staffForm, subjectName: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">القاعة الدراسية</label>
                <select className="input" value={staffForm.roomId} onChange={(e) => setStaffForm({ ...staffForm, roomId: e.target.value })}>
                  <option value="">اختر القاعة...</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">نسبة الـ {labelSingle} (%)</label>
                    <input className="input" type="number" value={staffForm.teacherPercentage} onChange={(e) => {
                      const val = +e.target.value;
                      setStaffForm({ ...staffForm, teacherPercentage: val, academyPercentage: 100 - val });
                    }} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">نسبة الأكاديمية (%)</label>
                    <input className="input" type="number" value={staffForm.academyPercentage} readOnly style={{ opacity: 0.8 }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={handleSaveStaff} style={{ flex: 1 }}>حفظ البيانات</button>
                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Staff Report Modal */}
      {showDetailModal && selectedStaff && (
        <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="modal card-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{iconEmoji} تقرير الـ {labelSingle}: {selectedStaff.name}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>مادة: {selectedStaff.subjectName} — قاعة: {selectedStaff.roomName}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>عدد الطلاب</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-orange)' }}>{selectedStaff.studentCount} طلاب</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>حضور الـ {labelSingle}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{selectedStaff.presentCount} يوم</div>
                </div>
                {isAdmin && (
                  <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>نسبة الأرباح</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-gold)' }}>{selectedStaff.teacherPercentage}% لكم</div>
                  </div>
                )}
                {isAdmin && (
                  <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>الرصيد الحالي</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: selectedStaff.balance < 0 ? 'var(--error)' : 'var(--success)' }}>
                      {selectedStaff.balance} ج.م
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAttModal(true)}>📅 تسجيل حضور/غياب</button>
                {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setShowLoanModal(true)}>💸 إضافة سلفة / مصروف</button>}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={() => {
                  setStaffForm({
                    id: selectedStaff.id,
                    name: selectedStaff.name,
                    phone: selectedStaff.phone,
                    subjectName: selectedStaff.subjectName,
                    roomId: selectedStaff.roomId,
                    teacherPercentage: selectedStaff.teacherPercentage,
                    academyPercentage: selectedStaff.academyPercentage,
                    balance: selectedStaff.balance,
                  });
                  setShowDetailModal(false);
                  setShowAddModal(true);
                }}>
                  ✏️ تعديل البيانات
                </button>
                {isAdmin && (
                  <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDeleteStaff(selectedStaff.id)}>
                    🗑️ حذف
                  </button>
                )}
                <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => setShowDetailModal(false)}>
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttModal && selectedStaff && (
        <div className="modal-backdrop" onClick={() => setShowAttModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📅 حضور الـ {labelSingle}: {selectedStaff.name}</h3>
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
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveAttendance} style={{ flex: 1 }}>حفظ الحضور</button>
                <button className="btn btn-ghost" onClick={() => setShowAttModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Modal */}
      {showLoanModal && selectedStaff && (
        <div className="modal-backdrop" onClick={() => setShowLoanModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>💸 تسجيل سلفة للـ {labelSingle}: {selectedStaff.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">مبلغ السلفة (ج.م) *</label>
                <input className="input" type="number" value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: +e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">التاريخ</label>
                <input className="input" type="date" value={loanForm.date} onChange={(e) => setLoanForm({ ...loanForm, date: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">ملاحظات / السبب</label>
                <input className="input" placeholder="سبب السلفة..." value={loanForm.reason} onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveLoan} style={{ flex: 1 }}>تسجيل السلفة</button>
                <button className="btn btn-ghost" onClick={() => setShowLoanModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
