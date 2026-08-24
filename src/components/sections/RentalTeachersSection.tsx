'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatWhatsAppPhone } from '@/lib/whatsapp';

interface RentalTeacher {
  _id: string;
  name: string;
  phone: string;
  subjectName: string;
  room?: { _id: string; name: string };
  roomName?: string;
  days: string[];
  startTime?: string;
  endTime?: string;
  rentAmount: number;
  rentPeriod: 'monthly' | 'per_session';
  isPaid: boolean;
  lastPaidDate?: string;
  notes?: string;
  isActive: boolean;
}

interface RoomOption {
  _id: string;
  name: string;
}

const DAYS_OF_WEEK = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const emptyForm = {
  name: '',
  phone: '',
  subjectName: '',
  room: '',
  roomName: '',
  days: [] as string[],
  startTime: '',
  endTime: '',
  rentAmount: 0,
  rentPeriod: 'monthly' as 'monthly' | 'per_session',
  isPaid: false,
  notes: '',
};

export default function RentalTeachersSection() {
  const [rentalTeachers, setRentalTeachers] = useState<RentalTeacher[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRental, resRooms] = await Promise.all([
        fetch('/api/rental-teachers'),
        fetch('/api/rooms'),
      ]);
      if (resRental.ok) {
        const d = await resRental.json();
        setRentalTeachers(d.rentalTeachers || []);
      }
      if (resRooms.ok) {
        const d = await resRooms.json();
        setRooms(d.rooms || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEditModal = (t: RentalTeacher) => {
    setEditingId(t._id);
    setForm({
      name: t.name,
      phone: t.phone,
      subjectName: t.subjectName,
      room: t.room?._id || '',
      roomName: t.roomName || t.room?.name || '',
      days: t.days || [],
      startTime: t.startTime || '',
      endTime: t.endTime || '',
      rentAmount: t.rentAmount,
      rentPeriod: t.rentPeriod,
      isPaid: t.isPaid,
      notes: t.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.subjectName) {
      showToast('الاسم والهاتف والمادة مطلوبين', 'error');
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch('/api/rental-teachers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingId ? 'تم التعديل بنجاح ✅' : 'تم الإضافة بنجاح ✅');
        setShowModal(false);
        loadData();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaid = async (t: RentalTeacher) => {
    try {
      const res = await fetch('/api/rental-teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t._id, ...t, isPaid: !t.isPaid, room: t.room?._id || '' }),
      });
      if (res.ok) {
        showToast(t.isPaid ? 'تم تحديد الإيجار كـ "لم يُدفع"' : 'تم تسجيل دفع الإيجار ✅');
        loadData();
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل تريد حذف "${name}" نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/rental-teachers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم الحذف بنجاح');
        loadData();
      }
    } catch {
      showToast('خطأ في الحذف', 'error');
    }
  };

  const sendWhatsApp = (t: RentalTeacher) => {
    const phone = formatWhatsAppPhone(t.phone);
    if (!phone) { alert('مفيش رقم هاتف'); return; }
    const daysStr = t.days.join(' - ') || 'غير محدد';
    const timeStr = t.startTime && t.endTime ? `${t.startTime} - ${t.endTime}` : 'غير محدد';
    const periodStr = t.rentPeriod === 'monthly' ? 'شهري' : 'لكل حصة';
    const paidStr = t.isPaid ? '✅ تم الدفع' : '❌ لم يتم الدفع بعد';
    const msg = `🏫 *تفاصيل إيجار القاعة - أكاديمية سكاي*\n━━━━━━━━━━━━━━━━\n👨‍🏫 الأستاذ: ${t.name}\n📚 المادة: ${t.subjectName}\n🏫 القاعة: ${t.room?.name || t.roomName || 'غير محدد'}\n📅 الأيام: ${daysStr}\n⏰ التوقيت: ${timeStr}\n💰 قيمة الإيجار: ${t.rentAmount} ج.م (${periodStr})\n💳 حالة الدفع: ${paidStr}\n━━━━━━━━━━━━━━━━\n🌤️ أكاديمية سكاي (Sky Academy)`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
    }));
  };

  const filtered = rentalTeachers.filter(t =>
    !search.trim() ||
    t.name.includes(search) ||
    t.phone.includes(search) ||
    t.subjectName.includes(search) ||
    (t.room?.name || '').includes(search)
  );

  const unpaidCount = rentalTeachers.filter(t => !t.isPaid).length;
  const totalRent = rentalTeachers.reduce((s, t) => s + t.rentAmount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
            🏢 المدرسين بالإيجار
          </h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            إدارة المدرسين اللي بيأجروا قاعات السنتر — الأيام والإيجار وحالة الدفع
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>+ إضافة مدرس بالإيجار</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-orange)' }}>{rentalTeachers.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>إجمالي المدرسين المؤجرين</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--success-muted)' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)' }}>{rentalTeachers.filter(t => t.isPaid).length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>دفعوا الإيجار ✅</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center', background: 'var(--error-muted)' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--error)' }}>{unpaidCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>لسه ما دفعوش ❌</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{totalRent.toLocaleString('ar-EG')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>إجمالي الإيجارات (ج.م)</div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 16 }}>
        <input
          className="input"
          placeholder="🔍 ابحث باسم المدرس، المادة، أو القاعة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <p className="empty-state-text">
            {rentalTeachers.length === 0 ? 'ما فيش مدرسين بالإيجار مسجلين لحد دلوقتي' : 'لا يوجد نتائج مطابقة'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>اسم المدرس</th>
                <th>المادة</th>
                <th>القاعة المؤجرة</th>
                <th>الأيام والتوقيت</th>
                <th>الإيجار</th>
                <th>حالة الدفع</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }} dir="ltr">{t.phone}</div>
                  </td>
                  <td>
                    <span className="badge badge-orange">{t.subjectName}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>🏫 {t.room?.name || t.roomName || '—'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                      {t.days.length > 0 ? t.days.map(d => (
                        <span key={d} className="badge badge-secondary" style={{ fontSize: 11 }}>{d}</span>
                      )) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>غير محدد</span>}
                    </div>
                    {t.startTime && t.endTime && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>⏰ {t.startTime} - {t.endTime}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--accent-orange)', fontSize: 16 }}>{t.rentAmount} ج.م</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {t.rentPeriod === 'monthly' ? 'شهرياً' : 'للحصة'}
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => handleTogglePaid(t)}
                      className={`badge ${t.isPaid ? 'badge-success' : 'badge-danger'}`}
                      style={{ border: 'none', cursor: 'pointer', padding: '6px 12px', fontSize: 12, fontWeight: 700 }}
                    >
                      {t.isPaid ? '✅ دفع الإيجار' : '❌ لسه ما دفعش'}
                    </button>
                    {t.lastPaidDate && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        آخر دفع: {new Date(t.lastPaidDate).toLocaleDateString('ar-EG')}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => sendWhatsApp(t)}
                        title="واتساب"
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 32, height: 32, borderRadius: '50%',
                          background: '#25D366', color: 'white', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(t)}>✏️</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--error)' }}
                        onClick={() => handleDelete(t._id, t.name)}
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add / Edit */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28, position: 'relative' }}>
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: 16, left: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}
            >✕</button>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
              {editingId ? '✏️ تعديل مدرس بالإيجار' : '🏢 إضافة مدرس بالإيجار'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">👨‍🏫 اسم المدرس *</label>
                <input className="input" placeholder="مثال: أ. محمود أحمد" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>

              {/* Phone */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">📱 رقم الهاتف *</label>
                <input className="input" placeholder="01xxxxxxxxx" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" />
              </div>

              {/* Subject */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">📚 المادة / التخصص *</label>
                <input className="input" placeholder="مثال: رياضيات، انجليزي، كورة..." value={form.subjectName} onChange={e => setForm(p => ({ ...p, subjectName: e.target.value }))} />
              </div>

              {/* Room */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">🏫 القاعة المؤجرة</label>
                <select className="input" value={form.room} onChange={e => {
                  const selected = rooms.find(r => r._id === e.target.value);
                  setForm(p => ({ ...p, room: e.target.value, roomName: selected?.name || '' }));
                }}>
                  <option value="">-- اختر القاعة --</option>
                  {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>

              {/* Days */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">📅 الأيام اللي بيشتغل فيها</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', border: '2px solid',
                        borderColor: form.days.includes(day) ? 'var(--accent-orange)' : 'var(--border)',
                        background: form.days.includes(day) ? 'var(--accent-orange-muted)' : 'var(--bg-elevated)',
                        color: form.days.includes(day) ? 'var(--accent-orange)' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">⏰ من الساعة</label>
                  <input className="input" type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">⏰ لحد الساعة</label>
                  <input className="input" type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} />
                </div>
              </div>

              {/* Rent Amount & Period */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">💰 قيمة الإيجار (ج.م)</label>
                  <input className="input" type="number" min={0} value={form.rentAmount} onChange={e => setForm(p => ({ ...p, rentAmount: Number(e.target.value) }))} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">📆 نظام الإيجار</label>
                  <select className="input" value={form.rentPeriod} onChange={e => setForm(p => ({ ...p, rentPeriod: e.target.value as any }))}>
                    <option value="monthly">شهري</option>
                    <option value="per_session">لكل حصة</option>
                  </select>
                </div>
              </div>

              {/* Paid */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={form.isPaid}
                  onChange={e => setForm(p => ({ ...p, isPaid: e.target.checked }))}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-orange)' }}
                />
                <label htmlFor="isPaid" style={{ fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  ✅ الإيجار اتدفع
                </label>
              </div>

              {/* Notes */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">📝 ملاحظات (اختياري)</label>
                <textarea
                  className="input"
                  placeholder="أي ملاحظات إضافية..."
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ جاري الحفظ...' : editingId ? '💾 حفظ التعديلات' : '➕ إضافة المدرس'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
