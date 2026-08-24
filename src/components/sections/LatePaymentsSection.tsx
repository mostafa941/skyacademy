'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatWhatsAppPhone } from '@/lib/whatsapp';

interface LatePayment {
  paymentId: string;
  forMonth: string;
  paidOnDate: string;
  paidOnMonth: string;
  daysLate: number;
  amount: number;
  status: string;
  paymentReason: string;
  student: {
    id: string;
    name: string;
    phone: string;
    parentPhone: string;
    grade: string;
    subjectName: string;
    type: string;
  };
  teacher: {
    id: string;
    name: string;
    subjectName: string;
    type: string;
  };
}

interface Teacher {
  id: string;
  name: string;
  type: string;
  subjectName: string;
}

export default function LatePaymentsSection() {
  const [latePayments, setLatePayments] = useState<LatePayment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedTeacher
        ? `/api/payments/late?teacherId=${selectedTeacher}`
        : '/api/payments/late';
      const [resPayments, resTeachers] = await Promise.all([
        fetch(url),
        fetch('/api/teachers'),
      ]);
      if (resPayments.ok) {
        const d = await resPayments.json();
        setLatePayments(d.latePayments || []);
      }
      if (resTeachers.ok) {
        const d = await resTeachers.json();
        setTeachers(d.teachers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeacher]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = latePayments.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.student.name.toLowerCase().includes(q) ||
      p.student.phone.includes(q) ||
      p.teacher.name.toLowerCase().includes(q) ||
      p.student.grade.toLowerCase().includes(q) ||
      p.forMonth.includes(q)
    );
  });

  const sendWhatsApp = (p: LatePayment) => {
    const phone = formatWhatsAppPhone(p.student.parentPhone || p.student.phone);
    if (!phone) { alert('مفيش رقم هاتف مسجل'); return; }
    const msg = `🕐 *تذكير متأخر - أكاديمية سكاي*\n━━━━━━━━━━━━━━━━\n🎓 الطالب: ${p.student.name}\n📚 المادة: ${p.student.subjectName}\n👨‍🏫 المدرس: ${p.teacher.name}\n📅 كان المفروض يدفع: شهر ${p.forMonth}\n✅ دفع فعلاً بتاريخ: ${p.paidOnDate}\n⏳ التأخير: ${p.daysLate} يوم\n💰 المبلغ المدفوع: ${p.amount} ج.م\n━━━━━━━━━━━━━━━━\n🌤️ أكاديمية سكاي (Sky Academy)`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const badgeDays = (days: number) => {
    if (days <= 7) return <span className="badge badge-orange">⏰ {days} يوم تأخير</span>;
    if (days <= 30) return <span className="badge badge-danger">⚠️ {days} يوم تأخير</span>;
    return <span className="badge badge-danger" style={{ background: '#7f1d1d' }}>🚨 {days} يوم تأخير!</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
          🕐 سجل الدفعات المتأخرة
        </h1>
        <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          الطلاب اللي دفعوا مصاريف شهر معين بعد ما الشهر ده خلص — يعني دفعوا متأخرين
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <label className="input-label">فلتر حسب المدرس</label>
          <select className="input" value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
            <option value="">-- كل المدرسين --</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.type === 'teacher' ? '👨‍🏫' : '🏋️'} {t.name} — {t.subjectName}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group" style={{ marginBottom: 0, flex: 2, minWidth: 200 }}>
          <label className="input-label">بحث</label>
          <input
            className="input"
            placeholder="🔍 ابحث باسم الطالب، المدرس، الشهر، أو الصف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost" onClick={loadData} disabled={loading}>🔄 تحديث</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--error-muted)' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--error)' }}>{filtered.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>إجمالي الدفعات المتأخرة</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--accent-orange-muted)' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent-orange)' }}>
            {filtered.reduce((s, p) => s + p.amount, 0).toLocaleString('ar-EG')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>إجمالي المبالغ المتأخرة (ج.م)</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>
            {filtered.length > 0 ? Math.round(filtered.reduce((s, p) => s + p.daysLate, 0) / filtered.length) : 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>متوسط أيام التأخير</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل الدفعات المتأخرة...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🕐</div>
          <p className="empty-state-text">
            {latePayments.length === 0
              ? 'ما فيش دفعات متأخرة — كل الطلاب بيدفعوا في وقتهم 🎉'
              : 'لا يوجد نتائج مطابقة للبحث'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--error-muted)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--error)' }}>
              🕐 الدفعات المتأخرة ({filtered.length} دفعة)
            </h3>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  <th>المدرس والمادة</th>
                  <th>الصف</th>
                  <th>شهر المصاريف</th>
                  <th>دفع فعلاً إمتى</th>
                  <th>التأخير</th>
                  <th>المبلغ</th>
                  <th>واتساب</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.paymentId}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.student.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.student.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{p.teacher.subjectName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>👨‍🏫 {p.teacher.name}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.student.grade || '-'}</td>
                    <td>
                      <span className="badge badge-danger" style={{ fontSize: 12 }}>
                        📅 {p.forMonth}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700 }}>
                        ✅ {p.paidOnDate}
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>(شهر {p.paidOnMonth})</div>
                    </td>
                    <td>{badgeDays(p.daysLate)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>{p.amount} ج.م</td>
                    <td>
                      <button
                        onClick={() => sendWhatsApp(p)}
                        title="إرسال رسالة واتساب"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#25D366', color: 'white',
                          border: 'none', borderRadius: 'var(--radius-md)',
                          padding: '6px 12px', cursor: 'pointer',
                          fontWeight: 700, fontSize: 12,
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        واتساب
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
