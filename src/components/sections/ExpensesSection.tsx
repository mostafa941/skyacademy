'use client';

import { useState, useEffect, useCallback } from 'react';

interface ExpenseItem {
  _id: string;
  amount: number;
  date: string;
  reason: string;
  type: 'general' | 'teacher_loan';
  teacher?: { name: string; type: string; subjectName: string };
  createdBy?: { name: string };
}

interface TeacherOption {
  id: string;
  name: string;
  type: string;
  subjectName: string;
}

interface ExpensesSectionProps {
  userRole: string;
}

export default function ExpensesSection({ userRole }: ExpensesSectionProps) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form
  const [form, setForm] = useState({
    amount: 100,
    date: new Date().toISOString().substring(0, 10),
    reason: '',
    type: 'general' as 'general' | 'teacher_loan',
    teacherId: '',
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resExp, resTe] = await Promise.all([fetch('/api/expenses'), fetch('/api/teachers')]);
      if (resExp.ok) {
        const d = await resExp.json();
        setExpenses(d.expenses || []);
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Expense
  const handleSaveExpense = async () => {
    if (!form.amount || !form.reason) {
      showToast('يرجى كِتابة المبلغ وسبب الخرج', 'error');
      return;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('تم تسجيل الخرج بنجاح');
        setShowAddModal(false);
        setForm({ amount: 100, date: new Date().toISOString().substring(0, 10), reason: '', type: 'general', teacherId: '' });
        loadData();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Delete Expense (Admin only)
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('هل أنت تأكد من حذف هذا المصروف؟')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم حذف المصروف');
        loadData();
      } else {
        const d = await res.json();
        showToast(d.error || 'خطأ بالحذف', 'error');
      }
    } catch {
      showToast('خطأ بالحذف', 'error');
    }
  };

  const isAdmin = userRole === 'admin';
  const totalExpensesAllTime = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>📤 الخرج والمصروفات</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>تسجيل ومتابعة مصروفات الأكاديمية وسلف المدرسين والمدربين</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + تسجيل خرج جديد
        </button>
      </div>

      {/* Summary Card */}
      <div className="card" style={{ background: 'var(--error-muted)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>إجمالي الخرج والمصروفات المسجلة</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--error)' }}>
            {totalExpensesAllTime.toLocaleString('ar-EG')} جنيه
          </div>
        </div>
        <div className="badge badge-danger" style={{ fontSize: 14, padding: '8px 16px' }}>
          عدد المصروفات: {expenses.length}
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📤</div>
          <p className="empty-state-text">لا يوجد مصروفات مسجلة بعد</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>سبب الخرج / المصروف</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>المستلم / المدرس</th>
                {isAdmin && <th>حذف</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((item) => (
                <tr key={item._id}>
                  <td style={{ color: 'var(--text-muted)' }}>{item.date}</td>
                  <td style={{ fontWeight: 700 }}>{item.reason}</td>
                  <td>
                    {item.type === 'teacher_loan' ? (
                      <span className="badge badge-orange">سلفة مدرس/مدرب</span>
                    ) : (
                      <span className="badge badge-info">مصروف عام</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--error)' }}>{item.amount} ج.م</td>
                  <td>{item.teacher ? `${item.teacher.name} (${item.teacher.subjectName})` : '-'}</td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteExpense(item._id)}>
                        🗑️ حذف
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Expense */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📤 تسجيل خرج / مصروف</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">نوع المصروف *</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                  <option value="general">مصروف عام (كهرباء، مياه، إيجار...)</option>
                  <option value="teacher_loan">سلفة لمدرس أو مدرب 💸</option>
                </select>
              </div>

              {form.type === 'teacher_loan' && (
                <div className="input-group">
                  <label className="input-label">اختر المدرس / المدرب *</label>
                  <select className="input" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                    <option value="">اختر الاسم...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subjectName})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">المبلغ (ج.م) *</label>
                <input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} />
              </div>

              <div className="input-group">
                <label className="input-label">التاريخ *</label>
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>

              <div className="input-group">
                <label className="input-label">السبب والوصف *</label>
                <input className="input" placeholder="مثال: إيجار القاعة، فاتورة الكهرباء..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={handleSaveExpense} style={{ flex: 1 }}>حفظ المصروف</button>
                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
