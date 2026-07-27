'use client';

import { useState, useEffect, useCallback } from 'react';

interface PaymentInvoice {
  _id: string;
  student?: { name: string; phone: string; grade: string; subjectName: string };
  month: string;
  amount: number;
  paymentReason?: string;
  paidAt?: string;
  notes?: string;
}

export default function IncomeSection() {
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  const loadIncome = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.payments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadIncome();
  }, [loadIncome]);

  const paidInvoices = invoices.filter(i => i.amount > 0);
  const totalIncomeMonth = paidInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>💵 سجل الدخل والإيرادات</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>استعراض الدخل الشهري وإجماليات المدفوعات</p>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <input className="input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        </div>
      </div>

      {/* Summary Card */}
      <div className="card" style={{ background: 'var(--success-muted)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>إجمالي دخل شهر ({selectedMonth})</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--success)' }}>
            {totalIncomeMonth.toLocaleString('ar-EG')} جنيه
          </div>
        </div>
        <div className="badge badge-success" style={{ fontSize: 14, padding: '8px 16px' }}>
          عدد الفواتير والعمليات: {paidInvoices.length}
        </div>
      </div>

      {/* Invoice Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : paidInvoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <p className="empty-state-text">لا يوجد مدفوعات مسجلة في هذا الشهر</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>الطالب</th>
                <th>المادة والصف</th>
                <th>سبب الدفع</th>
                <th>المبلغ</th>
                <th>تاريخ الدفع</th>
              </tr>
            </thead>
            <tbody>
              {paidInvoices.map((inv) => (
                <tr key={inv._id}>
                  <td style={{ fontWeight: 700 }}>
                    <div>{inv.student?.name || 'طالب مجهول'}</div>
                    <div dir="ltr" style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{inv.student?.phone}</div>
                  </td>
                  <td>
                    <div>{inv.student?.subjectName || '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inv.student?.grade}</div>
                  </td>
                  <td>{inv.paymentReason || 'اشتراك شهري'}</td>
                  <td style={{ fontWeight: 800, color: 'var(--success)' }}>{inv.amount} ج.م</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('ar-EG') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
