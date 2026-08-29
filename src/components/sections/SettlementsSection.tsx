'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatWhatsAppPhone } from '@/lib/whatsapp';

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
    subjectName?: string;
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
  // Modal: show unpaid students
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);

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
    
    // We removed the balance <= 0 check to allow all types of settlements.

    if (!confirm(`هل أنت متأكد من تصفية حساب ${settlementData.teacher.name}؟ (الرصيد الحالي: ${Number(settlementData.teacher.balance).toFixed(2)} ج.م)`)) return;

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
            {/* Clickable Unpaid Card */}
            <div
              className="card"
              style={{ padding: 16, textAlign: 'center', background: 'var(--error-muted)', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}
              onClick={() => settlementData.unpaidCount > 0 && setShowUnpaidModal(true)}
              onMouseEnter={e => { if (settlementData.unpaidCount > 0) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--error)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}
              title={settlementData.unpaidCount > 0 ? 'اضغط لعرض الطلاب اللي لم يدفعوا' : ''}
            >
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--error)' }}>{settlementData.unpaidCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>لم يدفعوا ❌</div>
              {settlementData.unpaidCount > 0 && (
                <div style={{ fontSize: 10, color: 'var(--error)', marginTop: 4 }}>اضغط للتفاصيل 👆</div>
              )}
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{settlementData.expectedIncome.toFixed(0)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 'bold' }}>المتوقع يتلم (ج.م)</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>(لو كل الطلاب دفعوا مصاريفهم العادية)</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--success)' }}>{settlementData.collectedIncome.toFixed(0)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 'bold' }}>المحصل الفعلي (ج.م)</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>(ممكن يكون أكتر من المتوقع لو فيه متأخرات اندفعت)</div>
            </div>
          </div>

          {/* Teacher Financials */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Income breakdown */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>
                💰 تفاصيل حساب {settlementData.teacher.name} (نسبته {settlementData.teacher.percentage}%)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, borderBottom: '1px dashed var(--border)' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>إجمالي الفلوس اللي اتلمت الشهر ده</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(كل المبالغ اللي الطلاب دفعوها فعلاً)</span>
                  </div>
                  <strong style={{ alignSelf: 'center' }}>{settlementData.collectedIncome.toFixed(2)} ج.م</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, borderBottom: '1px dashed var(--border)' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>نصيب المدرس عن الشهر ده</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(نسبته من الفلوس اللي اتلمت)</span>
                  </div>
                  <strong style={{ color: 'var(--success)', alignSelf: 'center' }}>{settlementData.teacherShare.toFixed(2)} ج.م</strong>
                </div>

                {/* شرح الرصيد المتراكم والسلف */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold' }}>رصيد المدرس الإجمالي بالسيستم</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      (شامل كل شغله القديم ناقص أي سلف أو دفعات استلمها)
                    </span>
                  </div>
                  <div style={{ textAlign: 'left', alignSelf: 'center' }}>
                    <strong style={{
                      color: settlementData.teacher.balance > 0 ? 'var(--success)' : settlementData.teacher.balance < 0 ? 'var(--error)' : 'var(--text-muted)',
                      fontSize: 16
                    }}>
                      {Math.abs(settlementData.teacher.balance).toFixed(2)} ج.م
                    </strong>
                    {settlementData.teacher.balance < 0 && (
                      <div style={{ color: 'var(--error)', fontSize: 12, fontWeight: 'bold' }}>سلفة (فلوس عليه)</div>
                    )}
                    {settlementData.teacher.balance > 0 && (
                      <div style={{ color: 'var(--success)', fontSize: 12, fontWeight: 'bold' }}>مستحقات ليه</div>
                    )}
                    {settlementData.teacher.balance === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>خالص</div>
                    )}
                  </div>
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
                  ? `الصافي للمدرس: ${settlementData.teacher.balance.toFixed(2)} ج.م`
                  : settlementData.teacher.balance < 0
                  ? `المدرس عليه سلفة بـ: ${Math.abs(settlementData.teacher.balance).toFixed(2)} ج.م`
                  : 'الحساب خالص'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: '1.6' }}>
                {settlementData.teacher.balance > 0
                  ? 'لما تضغط "تصفية الحساب"، كأنك سلمت المدرس الفلوس دي في إيده ورصيده هيرجع صفر.'
                  : settlementData.teacher.balance < 0
                  ? 'المدرس ده واخد سلف ومخصومة من حسابه، ولسه عليه الفلوس دي للسنتر.'
                  : 'مفيش فلوس ليه ولا عليه دلوقتي.'}
              </p>
              <button
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: 260 }}
                disabled={settling}
                onClick={handleSettle}
              >
                {settling ? '⏳ بنصفي الحساب...' : 
                 settlementData.teacher.balance > 0 ? '✅ تصفية الحساب (دفع للمدرس)' :
                 settlementData.teacher.balance < 0 ? '✅ تصفية الحساب (تحصيل من المدرس)' :
                 '✅ تصفية الحساب (تقفيل الشهر)'}
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
                      <th>مصاريفه المفروضة</th>
                      <th>اللي دفعه فعلاً</th>
                      <th>الباقي عليه</th>
                      <th>نصيب المدرس منه</th>
                      <th>حالة الدفع</th>
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

      {/* ===== Modal: Unpaid Students ===== */}
      {showUnpaidModal && settlementData && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '85vh', overflowY: 'auto', padding: 0 }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 20px', borderBottom: '1px solid var(--border)',
              background: 'var(--error-muted)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--error)' }}>
                ❌ الطلاب اللي لم يدفعوا — {settlementData.teacher.name} | شهر {settlementData.month}
              </h3>
              <button
                onClick={() => setShowUnpaidModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
              >✕</button>
            </div>

            {/* Unpaid Students List */}
            <div style={{ padding: 16 }}>
              {settlementData.studentBreakdown.filter(s => s.paymentStatus === 'unpaid').length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  🎉 كل الطلاب دفعوا!
                </div>
              ) : (
                <div className="table-wrapper" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>اسم الطالب</th>
                        <th>الصف</th>
                        <th>المادة والمدرس</th>
                        <th>المصاريف المفروضة</th>
                        <th>واتساب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlementData.studentBreakdown
                        .filter(s => s.paymentStatus === 'unpaid')
                        .map(st => {
                          const phone = formatWhatsAppPhone(st.studentPhone);
                          const msg = `❌ *تذكير بالمصاريف - أكاديمية سكاي*\n━━━━━━━━━━━━━━━━\n🎓 الطالب: ${st.studentName}\n📚 المادة: ${settlementData.teacher.subjectName || settlementData.teacher.name}\n👨‍🏫 المدرس: ${settlementData.teacher.name}\n${st.grade ? `🏫 الصف: ${st.grade}\n` : ''}📅 شهر: ${settlementData.month}\n💰 المبلغ المطلوب: ${st.monthlyFee} ج.م\n💳 الحالة: ❌ لم يتم السداد بعد\n━━━━━━━━━━━━━━━━\n🌤️ أكاديمية سكاي (Sky Academy)\nيسعدنا تسجيل المصاريف في أقرب وقت.`;
                          return (
                            <tr key={st.studentId}>
                              <td>
                                <div style={{ fontWeight: 700 }}>{st.studentName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }} dir="ltr">{st.studentPhone}</div>
                              </td>
                              <td style={{ fontSize: 13 }}>{st.grade || '—'}</td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--accent-orange)', fontSize: 13 }}>
                                  {settlementData.teacher.subjectName || '—'}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                  👨‍🏫 {settlementData.teacher.name}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontWeight: 800, color: 'var(--error)' }}>{st.monthlyFee} ج.م</span>
                              </td>
                              <td>
                                <button
                                  disabled={!phone}
                                  onClick={() => {
                                    if (!phone) { alert('مفيش رقم هاتف'); return; }
                                    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                  title="إرسال تذكير واتساب"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: phone ? '#25D366' : 'var(--bg-elevated)',
                                    color: phone ? 'white' : 'var(--text-muted)',
                                    border: 'none', borderRadius: 'var(--radius-md)',
                                    padding: '6px 12px', cursor: phone ? 'pointer' : 'not-allowed',
                                    fontWeight: 700, fontSize: 12,
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                  تذكير
                                </button>
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
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
