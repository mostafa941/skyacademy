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

  const [viewType, setViewType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  const [inlineExpense, setInlineExpense] = useState({ type: 'مصروف عام', details: '', amount: '', recipient: '' });
  const [addingInline, setAddingInline] = useState(false);
  
  const [search, setSearch] = useState('');

  const getArabicDayName = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[date.getDay()];
  };

  const getArabicTimeStr = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'مساءً' : 'صباحاً';
    const displayHours = (hours % 12 || 12).toString();
    return `${displayHours}:${minutes} ${period}`;
  };

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
      const queryParam = viewType === 'daily' ? `date=${selectedDate}` : `month=${selectedMonth}`;
      const [resExp, resTe] = await Promise.all([
        fetch(`/api/expenses?${queryParam}`),
        fetch('/api/teachers'),
      ]);
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
  }, [viewType, selectedDate, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleAddInlineExpense = async () => {
    if (!inlineExpense.amount || !inlineExpense.details) {
      showToast('يرجى كِتابة المبلغ والتفاصيل', 'error');
      return;
    }
    setAddingInline(true);
    const combinedReason = inlineExpense.recipient 
      ? `[${inlineExpense.recipient}] - ${inlineExpense.details}`
      : inlineExpense.details;
      
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(inlineExpense.amount),
          date: new Date().toISOString().substring(0, 10),
          reason: combinedReason,
          type: 'general', // Manual inline is usually general expense
        }),
      });
      if (res.ok) {
        showToast('تم إضافة المصروف بنجاح');
        setInlineExpense({ type: 'مصروف عام', details: '', amount: '', recipient: '' });
        loadData();
      } else {
        const data = await res.json();
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ بالخادم', 'error');
    } finally {
      setAddingInline(false);
    }
  };

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
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Client-side filtering logic
  const filteredExpenses = expenses.filter(item => {
    if (!search.trim()) return true;
    const query = search.toLowerCase().trim();
    
    const reason = item.reason || '';
    const amountStr = item.amount.toString();
    const typeLabel = item.type === 'teacher_loan' ? 'سلفة مدرس/مدرب' : 'مصروف عام';
    const recipient = item.teacher ? `${item.teacher.name} (${item.teacher.subjectName})` : '';
    
    const dateObj = new Date((item as any).createdAt || item.date);
    let dateStr = item.date;
    let timeStr = '';
    let dayName = '';
    let dayOfMonth = '';
    
    if (dateObj && !isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getDate().toString().padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
      timeStr = getArabicTimeStr(dateObj);
      dayName = getArabicDayName(dateObj);
      dayOfMonth = dateObj.getDate().toString();
    }
    
    return (
      reason.toLowerCase().includes(query) ||
      amountStr.includes(query) ||
      typeLabel.includes(query) ||
      recipient.toLowerCase().includes(query) ||
      dateStr.includes(query) ||
      timeStr.includes(query) ||
      dayName.includes(query) ||
      dayOfMonth === query
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>📤 الخرج والمصروفات</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>تسجيل ومتابعة مصروفات الأكاديمية وسلف المدرسين والمدربين (يومي / شهري)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + تسجيل خرج جديد
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button
          className={`btn ${viewType === 'daily' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewType('daily')}
        >
          الخرج اليومي
        </button>
        <button
          className={`btn ${viewType === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewType('monthly')}
        >
          الخرج الشهري
        </button>
      </div>

      {/* Advanced Search Input */}
      <div className="card" style={{ padding: 16 }}>
        <input
          className="input"
          placeholder="🔍 ابحث بالتاريخ (YYYY-MM-DD)، الوقت (12:00)، يوم الأسبوع (الخميس)، اليوم في الشهر (30)، أو باسم المدرس/التفاصيل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter & Summary */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, background: 'var(--error-muted)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {viewType === 'daily' ? (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">بحث بيوم معين:</label>
              <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          ) : (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">بحث بشهر معين:</label>
              <input className="input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
          )}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>
            إجمالي الخرج للـ{viewType === 'daily' ? 'يوم' : 'شهر'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--error)' }}>
            {totalExpenses.toLocaleString('ar-EG')} جنيه
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>عدد المصروفات: {expenses.length}</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📤</div>
          <p className="empty-state-text">لا يوجد مصروفات مطابقة للبحث</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>م</th>
                <th>نوع المصروف</th>
                <th>البند / التفاصيل</th>
                <th>المبلغ (EGP)</th>
                <th>مصروف من / التاريخ</th>
                {isAdmin && <th>حذف</th>}
              </tr>
            </thead>
            <tbody>
              {/* Inline Add Row */}
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>+</td>
                <td>
                  <input className="input" placeholder="نوع المصروف" style={{ padding: '6px 8px', minWidth: 100, fontSize: 13 }} value={inlineExpense.type} onChange={e => setInlineExpense({...inlineExpense, type: e.target.value})} />
                </td>
                <td>
                  <input className="input" placeholder="البند / التفاصيل" style={{ padding: '6px 8px', minWidth: 150, fontSize: 13 }} value={inlineExpense.details} onChange={e => setInlineExpense({...inlineExpense, details: e.target.value})} />
                </td>
                <td>
                  <input className="input" type="number" placeholder="المبلغ" style={{ padding: '6px 8px', width: 90, fontSize: 13 }} value={inlineExpense.amount} onChange={e => setInlineExpense({...inlineExpense, amount: e.target.value})} />
                </td>
                <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input" placeholder="مصروف من" style={{ padding: '6px 8px', flex: 1, fontSize: 13 }} value={inlineExpense.recipient} onChange={e => setInlineExpense({...inlineExpense, recipient: e.target.value})} />
                  <button className="btn btn-primary btn-sm" onClick={handleAddInlineExpense} disabled={addingInline}>
                    {addingInline ? '⏳' : 'إضافة'}
                  </button>
                </td>
                {isAdmin && <td></td>}
              </tr>
              {filteredExpenses.map((item, index) => (
                <tr key={item._id}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                  <td>
                    {item.type === 'teacher_loan' ? (
                      <span className="badge badge-orange">سلفة مدرس/مدرب</span>
                    ) : (
                      <span className="badge badge-info">مصروف عام</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 700 }}>{item.reason}</td>
                  <td style={{ fontWeight: 800, color: 'var(--error)' }}>{item.amount} ج.م</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {item.teacher ? `${item.teacher.name} (${item.teacher.subjectName})` : (item.createdBy?.name || 'الأكاديمية')}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>{item.date}</div>
                    {(item as any).createdAt && (
                      <div style={{ fontSize: 12, color: 'var(--accent-gold)' }}>
                        {getArabicDayName((item as any).createdAt)} | {getArabicTimeStr((item as any).createdAt)}
                      </div>
                    )}
                  </td>
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
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'general' | 'teacher_loan' })}>
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
