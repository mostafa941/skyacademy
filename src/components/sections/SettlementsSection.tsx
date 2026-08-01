'use client';

import { useState, useEffect, useCallback } from 'react';

interface Teacher {
  id: string;
  name: string;
  type: 'teacher' | 'trainer';
  subjectName: string;
}

interface StudentBreakdown {
  studentId: string;
  studentName: string;
  studentPhone: string;
  grade: string;
  type: string;
  monthlyFee: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentReason: string;
  teacherCutFromThisStudent: number;
}

interface SettlementData {
  teacher: {
    id: string;
    name: string;
    type: string;
    percentage: number;
    balance: number;
  };
  month: string;
  expectedIncome: number;
  collectedIncome: number;
  teacherShare: number;
  netPayout: number;
  studentsCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  studentBreakdown: StudentBreakdown[];
}

export default function SettlementsSection() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await fetch('/api/teachers');
        if (res.ok) {
          const data = await res.json();
          setTeachers(data.teachers || []);
        }
      } catch (err) {
        console.error('Failed to load teachers');
      }
    };
    fetchTeachers();
  }, []);

  const fetchSettlement = useCallback(async () => {
    if (!selectedTeacher || !selectedMonth) return;
    setLoading(true);
    setSettlementData(null);
    try {
      const res = await fetch(`/api/finance/settlements?teacherId=${selectedTeacher}&month=${selectedMonth}`);
      const data = await res.json();
      if (res.ok) {
        setSettlementData(data.data);
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch (err) {
      showToast('خطأ بالاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTeacher, selectedMonth]);

  useEffect(() => {
    fetchSettlement();
  }, [fetchSettlement]);

  const handleSettle = async () => {
    if (!selectedTeacher || !selectedMonth || !settlementData) return;
    if (settlementData.teacher.balance <= 0) {
      showToast('لا يوجد رصيد لتصفيته', 'error');
      return;
    }

    if (!confirm(`هل أنت متأكد من تصفية حساب ${settlementData.teacher.name} ودفع مبلغ ${settlementData.teacher.balance.toFixed(2)} ج.م؟`)) return;

    setSettling(true);
    try {
      const res = await fetch('/api/finance/settlements/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: selectedTeacher, month: selectedMonth }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('تمت التصفية بنجاح! تم تصفير الرصيد.', 'success');
        fetchSettlement();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch (err) {
      showToast('خطأ بالاتصال بالخادم', 'error');
    } finally {
      setSettling(false);
    }
  };

  const filteredBreakdown = settlementData?.studentBreakdown.filter(st => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      st.studentName.toLowerCase().includes(q) ||
      st.studentPhone.includes(q) ||
      st.grade.toLowerCase().includes(q) ||
      st.paymentStatus.includes(q)
    );
  }) || [];

  const statusBadge = (status: string) => {
    if (status === 'paid') return <span className="badge badge-success">دفع الكامل ✅</span>;
    if (status === 'partial') return <span className="badge badge-orange">دفع جزئي ⚠️</span>;
    return <span className="badge badge-danger">لم يدفع ❌</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>⚖️ تصفيات المدرسين والمدربين</h1>
        <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>تصفية الحسابات وتسوية الأرصدة مع تفاصيل كل طالب</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <label className="input-label">اختر المدرس / المدرب</label>
          <select className="input" value={selectedTeacher} onChange={e => { setSelectedTeacher(e.target.value); setSearch(''); }}>
            <option value="">-- اختر المدرس --</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.type === 'teacher' ? '👨‍🏫' : '🏋️'} {t.name} — {t.subjectName}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <label className="input-label">اختر الشهر</label>
          <input className="input" type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
        </div>
        {selectedTeacher && (
          <button className="btn btn-ghost" onClick={fetchSettlement} disabled={loading}>
            🔄 تحديث
          </button>
        )}
      </div>

      {/* Empty / Loading State */}
      {!selectedTeacher && (
        <div className="empty-state">
          <div className="empty-state-icon">⚖️</div>
          <p className="empty-state-text">اختر المدرس أو المدرب من القائمة أعلاه لعرض حسابه</p>
        </div>
      )}

      {loading && selectedTeacher && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري جلب بيانات التصفية...</p>
        </div>
      )}

      {/* Settlement Summary Cards */}
      {settlementData && !loading && (
        <>
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{settlementData.studentsCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>إجمالي الطلاب</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--success-muted)' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)' }}>{settlementData.paidCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>دفعوا الكامل ✅</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--accent-orange-muted)' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-orange)' }}>{settlementData.partialCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>دفعوا جزئياً ⚠️</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--error-muted)' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--error)' }}>{settlementData.unpaidCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>لم يدفعوا ❌</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{settlementData.expectedIncome.toFixed(0)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>المتوقع (ج.م)</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--success)' }}>{settlementData.collectedIncome.toFixed(0)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>المحصل (ج.م)</div>
            </div>
          </div>

          {/* Teacher Financials */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Income breakdown */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>
                💰 حساب نسبة {settlementData.teacher.name} ({settlementData.teacher.percentage}%)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>إجمالي المحصل من طلابه</span>
                  <strong>{settlementData.collectedIncome.toFixed(2)} ج.م</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>نسبة المدرس من المحصل</span>
                  <strong style={{ color: 'var(--success)' }}>{settlementData.teacherShare.toFixed(2)} ج.م</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>الرصيد المتراكم (بعد السلف)</span>
                  <strong style={{
                    color: settlementData.teacher.balance > 0 ? 'var(--success)' : settlementData.teacher.balance < 0 ? 'var(--error)' : 'var(--text-muted)'
                  }}>
                    {settlementData.teacher.balance.toFixed(2)} ج.م
                    {settlementData.teacher.balance < 0 && ' (عليه سلفة)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Settle Action */}
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: settlementData.teacher.balance > 0 ? 'var(--accent-orange-muted)' : 'var(--bg-secondary)', border: settlementData.teacher.balance > 0 ? '1px solid var(--accent-orange-border)' : '1px solid var(--border)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>
                {settlementData.teacher.balance > 0 ? '💸' : settlementData.teacher.balance < 0 ? '🚨' : '✅'}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                {settlementData.teacher.balance > 0
                  ? `مستحق له: ${settlementData.teacher.balance.toFixed(2)} ج.م`
                  : settlementData.teacher.balance < 0
                  ? `عليه سلفة: ${Math.abs(settlementData.teacher.balance).toFixed(2)} ج.م`
                  : 'الحساب صفر'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {settlementData.teacher.balance > 0
                  ? 'عند الضغط على "تصفية"، سيتم تسجيل الدفع وتصفير الرصيد.'
                  : settlementData.teacher.balance < 0
                  ? 'عليه سلفة — يجب تسوية السلفة أولاً.'
                  : 'لا يوجد مستحقات لهذا الشهر.'}
              </p>
              <button
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: 220 }}
                disabled={settlementData.teacher.balance <= 0 || settling}
                onClick={handleSettle}
              >
                {settling ? '⏳ جاري التصفية...' : '✅ تصفية الحساب الآن'}
              </button>
            </div>
          </div>

          {/* Per-Student Breakdown Table */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>📋 تفاصيل الطلاب والدفعات</h3>
            <input
              className="input"
              placeholder="🔍 ابحث باسم الطالب، الصف، أو حالة الدفع..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            {filteredBreakdown.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p className="empty-state-text">لا يوجد طلاب مطابقة</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>م</th>
                      <th>اسم الطالب</th>
                      <th>{settlementData.teacher.type === 'teacher' ? 'الصف' : 'النوع'}</th>
                      <th>الرسوم الشهرية</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>نصيب المدرس</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBreakdown.map((st, i) => (
                      <tr key={st.studentId}>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{st.studentName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{st.studentPhone}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{st.grade || (st.type === 'trainee' ? 'متدرب' : '-')}</td>
                        <td style={{ fontWeight: 700 }}>{st.monthlyFee} ج.م</td>
                        <td style={{ fontWeight: 700, color: st.paidAmount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {st.paidAmount} ج.م
                          {st.paymentReason && st.paymentReason !== '-' && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{st.paymentReason}</div>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: st.remainingAmount > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                          {st.remainingAmount > 0 ? `${st.remainingAmount} ج.م` : '-'}
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>
                          {st.teacherCutFromThisStudent.toFixed(2)} ج.م
                        </td>
                        <td>{statusBadge(st.paymentStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-elevated)', fontWeight: 900 }}>
                      <td colSpan={3} style={{ textAlign: 'center' }}>الإجمالي</td>
                      <td>{settlementData.expectedIncome.toFixed(0)} ج.م</td>
                      <td style={{ color: 'var(--success)' }}>{settlementData.collectedIncome.toFixed(0)} ج.م</td>
                      <td style={{ color: 'var(--error)' }}>
                        {filteredBreakdown.reduce((s, x) => s + x.remainingAmount, 0).toFixed(0)} ج.م
                      </td>
                      <td style={{ color: 'var(--accent-orange)' }}>{settlementData.teacherShare.toFixed(2)} ج.م</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
