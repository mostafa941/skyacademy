'use client';

import { useState, useEffect, useCallback } from 'react';

interface Invoice {
  _id: string;
  type: 'student_payment' | 'manual_income';
  amount: number;
  remainingAmount?: number;
  paymentReason?: string;
  paidAt?: string;
  student?: { name: string; phone: string; grade: string; subjectName: string };
  createdBy?: { name: string };
}

export default function IncomeSection() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewType, setViewType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: '', reason: '', date: new Date().toISOString().substring(0, 10) });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadIncome = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = viewType === 'daily' ? `date=${selectedDate}` : `month=${selectedMonth}`;
      const res = await fetch(`/api/finance/income?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [viewType, selectedDate, selectedMonth]);

  useEffect(() => {
    loadIncome();
  }, [loadIncome]);

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.amount || !incomeForm.reason || !incomeForm.date) {
      showToast('يرجى ملء جميع الحقول', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incomeForm),
      });
      if (res.ok) {
        showToast('تم إضافة الدخل بنجاح');
        setShowAddModal(false);
        setIncomeForm({ amount: '', reason: '', date: new Date().toISOString().substring(0, 10) });
        loadIncome();
      } else {
        const data = await res.json();
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ بالخادم', 'error');
    }
  };

  const totalIncome = invoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>💵 سجل الدخل والإيرادات</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>استعراض الدخل (يومي / شهري) وإضافة دخل يدوي</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + إضافة دخل يدوي
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button
          className={`btn ${viewType === 'daily' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewType('daily')}
        >
          الدخل اليومي
        </button>
        <button
          className={`btn ${viewType === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewType('monthly')}
        >
          الدخل الشهري
        </button>
      </div>

      {/* Filters & Summary */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
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
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>إجمالي الدخل للـ{viewType === 'daily' ? 'يوم' : 'شهر'}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)' }}>
            {totalIncome.toLocaleString('ar-EG')} جنيه
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <p className="empty-state-text">لا يوجد عمليات دخل مسجلة</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>النوع / المصدر</th>
                <th>التفاصيل</th>
                <th>المبلغ</th>
                <th>تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td style={{ fontWeight: 700 }}>
                    {inv.type === 'manual_income' ? (
                      <span className="badge badge-info">إضافة يدوية</span>
                    ) : (
                      <span className="badge badge-success">اشتراك طالب</span>
                    )}
                  </td>
                  <td>
                    {inv.type === 'manual_income' ? (
                      <div>
                        <div>{inv.paymentReason}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>بواسطة: {inv.createdBy?.name || '-'}</div>
                      </div>
                    ) : (
                      <div>
                        <div>{inv.student?.name || 'طالب مجهول'} ({inv.paymentReason || 'اشتراك شهري'})</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inv.student?.subjectName} - {inv.student?.grade}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: inv.remainingAmount && inv.remainingAmount > 0 ? 'var(--error)' : 'var(--success)', marginTop: 4 }}>
                          {inv.remainingAmount && inv.remainingAmount > 0 ? `المتبقي: ${inv.remainingAmount} ج.م` : 'المتبقي: 0 ج.م'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--success)' }}>{inv.amount} ج.م</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleString('ar-EG') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal card-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>💵 إضافة دخل يدوي</h2>
            <form onSubmit={handleAddIncome} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">المبلغ *</label>
                <input className="input" type="number" required min="1" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">السبب / المصدر *</label>
                <input className="input" required placeholder="مثال: مبيعات كتب..." value={incomeForm.reason} onChange={(e) => setIncomeForm({ ...incomeForm, reason: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">التاريخ *</label>
                <input className="input" type="date" required value={incomeForm.date} onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>حفظ الدخل</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
