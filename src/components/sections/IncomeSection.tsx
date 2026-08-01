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

  const [inlineIncome, setInlineIncome] = useState({ name: '', type: '', amount: '', notes: '' });
  const [addingInline, setAddingInline] = useState(false);

  // New Search & Payment States
  const [search, setSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paySearchQuery, setPaySearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<any>(null);
  
  const [payForm, setPayForm] = useState({
    type: 'student' as 'student' | 'trainee',
    studentId: '',
    amount: 0,
    paymentType: 'monthly' as 'session' | 'monthly',
    paymentReason: 'اشتراك شهري',
    remainingAmount: 0,
    remainingReason: '',
    status: 'paid' as 'paid' | 'unpaid' | 'partial',
  });

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

  const handleSearchStudents = async (query: string) => {
    setPaySearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearchingStudents(true);
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(query)}&type=${payForm.type}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.students || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleSelectStudent = (st: any) => {
    setSelectedStudentForPay(st);
    setPayForm(prev => ({
      ...prev,
      studentId: st.id,
      amount: st.monthlyFee || 0,
      paymentType: st.paymentType || 'monthly',
      paymentReason: st.paymentType === 'session' ? 'دفع حصة' : 'اشتراك شهري',
      remainingAmount: 0,
      remainingReason: '',
      status: 'paid',
    }));
  };

  const handleSaveStudentPayment = async () => {
    if (!selectedStudentForPay) return;
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentForPay.id,
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
        showToast('تم تسجيل دفع الطالب وزيادة رصيد معلمه بنجاح');
        setShowPaymentModal(false);
        setSelectedStudentForPay(null);
        setPaySearchQuery('');
        setSearchResults([]);
        loadIncome();
      } else {
        const d = await res.json();
        showToast(d.error || 'حدث خطأ أثناء حفظ الدفع', 'error');
      }
    } catch (err) {
      showToast('خطأ بالاتصال بالخادم', 'error');
    }
  };

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

  const handleAddInlineIncome = async () => {
    if (!inlineIncome.name || !inlineIncome.amount) {
      showToast('يرجى كتابة الاسم والمبلغ على الأقل', 'error');
      return;
    }
    setAddingInline(true);
    const combinedReason = `[${inlineIncome.name}] - [${inlineIncome.type || 'بدون نوع'}] - ${inlineIncome.notes || ''}`.trim();
    
    try {
      const res = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(inlineIncome.amount),
          reason: combinedReason,
          date: new Date().toISOString().substring(0, 10),
        }),
      });
      if (res.ok) {
        showToast('تم إضافة الدخل بنجاح');
        setInlineIncome({ name: '', type: '', amount: '', notes: '' });
        loadIncome();
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

  const totalIncome = invoices.reduce((sum, i) => sum + i.amount, 0);

  // Client-side filtering logic
  const filteredInvoices = invoices.filter(inv => {
    if (!search.trim()) return true;
    
    const query = search.toLowerCase().trim();
    
    const studentName = inv.student?.name || '';
    const reason = inv.paymentReason || '';
    const amountStr = inv.amount.toString();
    const typeLabel = inv.type === 'manual_income' ? 'إضافة يدوية' : 'اشتراك طالب';
    
    const dateObj = new Date(inv.paidAt || '');
    let dateStr = '';
    let timeStr = '';
    let dayName = '';
    let dayOfMonth = '';
    
    if (inv.paidAt && !isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getDate().toString().padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
      timeStr = getArabicTimeStr(dateObj);
      dayName = getArabicDayName(dateObj);
      dayOfMonth = dateObj.getDate().toString();
    }
    
    return (
      studentName.toLowerCase().includes(query) ||
      reason.toLowerCase().includes(query) ||
      amountStr.includes(query) ||
      typeLabel.includes(query) ||
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
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>💵 سجل الدخل والإيرادات</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>استعراض الدخل (يومي / شهري) وإضافة دخل يدوي أو تسجيل دفع الطلاب</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => {
            setPayForm({
              type: 'student',
              studentId: '',
              amount: 0,
              paymentType: 'monthly',
              paymentReason: 'اشتراك شهري',
              remainingAmount: 0,
              remainingReason: '',
              status: 'paid',
            });
            setShowPaymentModal(true);
          }}>
            💰 تسجيل دفع طالب / متدرب
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + إضافة دخل يدوي
          </button>
        </div>
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

      {/* Advanced Search Input */}
      <div className="card" style={{ padding: 16 }}>
        <input
          className="input"
          placeholder="🔍 ابحث بالتاريخ (YYYY-MM-DD)، الوقت (12:00)، يوم الأسبوع (الخميس)، اليوم في الشهر (30)، اسم الطالب أو التفاصيل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
      ) : filteredInvoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <p className="empty-state-text">لا يوجد عمليات دخل مطابقة للبحث</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>م</th>
                <th>وقت التحصيل</th>
                <th>اسم المشترك</th>
                <th>نوع الاشتراك (لعبة / كورس / درس)</th>
                <th>قيمة الاشتراك المدفوع اليوم</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {/* Inline Add Row */}
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>+</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>الآن</td>
                <td>
                  <input className="input" placeholder="اسم المشترك" style={{ padding: '6px 8px', minWidth: 120, fontSize: 13 }} value={inlineIncome.name} onChange={e => setInlineIncome({...inlineIncome, name: e.target.value})} />
                </td>
                <td>
                  <input className="input" placeholder="لعبة/كورس/درس" style={{ padding: '6px 8px', minWidth: 120, fontSize: 13 }} value={inlineIncome.type} onChange={e => setInlineIncome({...inlineIncome, type: e.target.value})} />
                </td>
                <td>
                  <input className="input" type="number" placeholder="المبلغ" style={{ padding: '6px 8px', width: 90, fontSize: 13 }} value={inlineIncome.amount} onChange={e => setInlineIncome({...inlineIncome, amount: e.target.value})} />
                </td>
                <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input" placeholder="ملاحظات" style={{ padding: '6px 8px', flex: 1, fontSize: 13 }} value={inlineIncome.notes} onChange={e => setInlineIncome({...inlineIncome, notes: e.target.value})} />
                  <button className="btn btn-primary btn-sm" onClick={handleAddInlineIncome} disabled={addingInline}>
                    {addingInline ? '⏳' : 'إضافة'}
                  </button>
                </td>
              </tr>
              {filteredInvoices.map((inv, index) => (
                <tr key={inv._id}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {inv.paidAt ? (
                      <div>
                        <div>{new Date(inv.paidAt).toISOString().substring(0, 10)}</div>
                        <div style={{ fontSize: 12, color: 'var(--accent-gold)', marginTop: 2 }}>
                          {getArabicDayName(inv.paidAt)} | {getArabicTimeStr(inv.paidAt)}
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {inv.type === 'manual_income' ? (inv.paymentReason?.split('] - [')[0]?.replace('[', '') || 'إضافة يدوية') : (inv.student?.name || 'طالب مجهول')}
                  </td>
                  <td>
                    {inv.type === 'manual_income' ? (
                      <span className="badge badge-info">{inv.paymentReason?.split('] - [')[1]?.split('] - ')[0] || 'دخل عام'}</span>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600 }}>{inv.student?.subjectName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inv.student?.grade}</div>
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--success)' }}>{inv.amount} ج.م</td>
                  <td>
                    {inv.type === 'manual_income' ? (
                      <div>
                        <div>{inv.paymentReason?.split('] - ').slice(-1)[0] || inv.paymentReason}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>بواسطة: {inv.createdBy?.name || '-'}</div>
                      </div>
                    ) : (
                      <div>
                        <div>{inv.paymentReason || 'اشتراك شهري'}</div>
                        {inv.remainingAmount && inv.remainingAmount > 0 ? (
                           <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--error)', marginTop: 4 }}>
                             المتبقي: {inv.remainingAmount} ج.م
                           </div>
                        ) : null}
                      </div>
                    )}
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

      {/* Modal: Student / Trainee Payment */}
      {showPaymentModal && (
        <div className="modal-backdrop" onClick={() => { setShowPaymentModal(false); setSelectedStudentForPay(null); setPaySearchQuery(''); setSearchResults([]); }}>
          <div className="modal card-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>💰 تسجيل دفع (طالب / متدرب)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              {/* Select Type */}
              <div className="input-group">
                <label className="input-label">النوع *</label>
                <select 
                  className="input" 
                  value={payForm.type} 
                  onChange={(e) => {
                    setPayForm({ ...payForm, type: e.target.value as any, studentId: '' });
                    setSelectedStudentForPay(null);
                    setPaySearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <option value="student">طالب تعليمي 🎓</option>
                  <option value="trainee">متدرب رياضي / تدريب 🏋️</option>
                </select>
              </div>

              {/* Search by Phone / Name */}
              <div className="input-group">
                <label className="input-label">ابحث برقم الهاتف أو الاسم (3 حروف على الأقل) *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    className="input" 
                    placeholder="رقم الهاتف أو الاسم..." 
                    value={paySearchQuery} 
                    onChange={(e) => handleSearchStudents(e.target.value)}
                  />
                </div>
                {searchingStudents && <div style={{ fontSize: 12, color: 'var(--accent-orange)', marginTop: 4 }}>جاري البحث...</div>}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && !selectedStudentForPay && (
                <div style={{ maxHeight: 150, overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
                  {searchResults.map(st => (
                    <div 
                      key={st.id} 
                      onClick={() => handleSelectStudent(st)} 
                      style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                      className="sidebar-item"
                    >
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{st.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        الهاتف: {st.phone} | {st.type === 'trainee' ? `المدرب: ${st.teacherName}` : `${st.grade} - المدرس: ${st.teacherName}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Student Details */}
              {selectedStudentForPay && (
                <div style={{ background: 'var(--accent-orange-muted)', border: '1px solid var(--accent-orange-border)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                  <h4 style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>بيانات الحساب المحددة:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                    <div>الاسم: <strong>{selectedStudentForPay.name}</strong></div>
                    <div>الهاتف: <strong>{selectedStudentForPay.phone}</strong></div>
                    <div>{selectedStudentForPay.type === 'trainee' ? 'المدرب:' : 'المرحلة/الصف:'} <strong>{selectedStudentForPay.type === 'trainee' ? selectedStudentForPay.teacherName : selectedStudentForPay.grade}</strong></div>
                    {selectedStudentForPay.type !== 'trainee' && <div>المدرس: <strong>{selectedStudentForPay.teacherName}</strong></div>}
                    <div>الاشتراك الافتراضي: <strong>{selectedStudentForPay.monthlyFee} ج.م</strong></div>
                  </div>
                </div>
              )}

              {/* Payment Form details (only shown if student selected) */}
              {selectedStudentForPay && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="input-group">
                      <label className="input-label">نظام الدفع *</label>
                      <select 
                        className="input" 
                        value={payForm.paymentType} 
                        onChange={(e) => setPayForm({ ...payForm, paymentType: e.target.value as any, paymentReason: e.target.value === 'session' ? 'دفع حصة' : 'اشتراك شهري' })}
                      >
                        <option value="monthly">اشتراك شهري 📅</option>
                        <option value="session">دفع بالحصة ⏱️</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">حالة الدفع *</label>
                      <select 
                        className="input" 
                        value={payForm.status} 
                        onChange={(e) => setPayForm({ ...payForm, status: e.target.value as any, remainingAmount: e.target.value === 'partial' ? selectedStudentForPay.monthlyFee - payForm.amount : 0 })}
                      >
                        <option value="paid">تم الدفع بالكامل ✅</option>
                        <option value="partial">دفع جزئي (متبقي فلوس) ⚠️</option>
                        <option value="unpaid">لم يدفع ❌</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="input-group">
                      <label className="input-label">المبلغ المدفوع فعلياً (ج.م) *</label>
                      <input 
                        className="input" 
                        type="number" 
                        value={payForm.amount} 
                        onChange={(e) => {
                          const paid = +e.target.value;
                          setPayForm({ 
                            ...payForm, 
                            amount: paid, 
                            remainingAmount: payForm.status === 'partial' ? selectedStudentForPay.monthlyFee - paid : 0 
                          });
                        }}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">السبب / الملاحظة *</label>
                      <select
                        className="input"
                        value={payForm.paymentReason}
                        onChange={(e) => setPayForm({ ...payForm, paymentReason: e.target.value })}
                      >
                        <option value="اشتراك شهري">اشتراك شهري 📅</option>
                        <option value="دفع حصة">دفع حصة ⏱️</option>
                        <option value="حصة مراجعة">حصة مراجعة 📚</option>
                        <option value="سداد متأخرات">سداد متأخرات 💰</option>
                      </select>
                    </div>
                  </div>

                  {payForm.status === 'partial' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-secondary)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">المبلغ المتبقي (ج.م)</label>
                        <input className="input" type="number" value={payForm.remainingAmount} onChange={(e) => setPayForm({ ...payForm, remainingAmount: +e.target.value })} />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">سبب المبلغ المتبقي</label>
                        <input className="input" placeholder="مثال: يدفعه الأسبوع القادم" value={payForm.remainingReason} onChange={(e) => setPayForm({ ...payForm, remainingReason: e.target.value })} />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={handleSaveStudentPayment} disabled={!selectedStudentForPay} style={{ flex: 1 }}>تأكيد عملية الدفع</button>
                <button className="btn btn-ghost" onClick={() => { setShowPaymentModal(false); setSelectedStudentForPay(null); setPaySearchQuery(''); setSearchResults([]); }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
