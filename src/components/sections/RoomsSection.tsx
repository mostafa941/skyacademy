'use client';

import { useState, useEffect, useCallback } from 'react';

interface RoomSchedule {
  teacher?: string;
  teacherName?: string;
  teacherType?: 'teacher' | 'trainer';
  subjectName?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface Room {
  _id: string;
  name: string;
  capacity: number;
  notes?: string;
  schedule: RoomSchedule[];
}

interface TeacherOption {
  id: string;
  name: string;
  subjectName: string;
  type: 'teacher' | 'trainer';
}

const DAYS_OF_WEEK = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const EG_HOURS = [
  { label: '12:00 ص', value: '00:00' },
  { label: '1:00 ص', value: '01:00' },
  { label: '2:00 ص', value: '02:00' },
  { label: '3:00 ص', value: '03:00' },
  { label: '4:00 ص', value: '04:00' },
  { label: '5:00 ص', value: '05:00' },
  { label: '6:00 ص', value: '06:00' },
  { label: '7:00 ص', value: '07:00' },
  { label: '8:00 ص', value: '08:00' },
  { label: '9:00 ص', value: '09:00' },
  { label: '10:00 ص', value: '10:00' },
  { label: '11:00 ص', value: '11:00' },
  { label: '12:00 ظ', value: '12:00' },
  { label: '1:00 م', value: '13:00' },
  { label: '2:00 م', value: '14:00' },
  { label: '3:00 م', value: '15:00' },
  { label: '4:00 م', value: '16:00' },
  { label: '5:00 م', value: '17:00' },
  { label: '6:00 م', value: '18:00' },
  { label: '7:00 م', value: '19:00' },
  { label: '8:00 م', value: '20:00' },
  { label: '9:00 م', value: '21:00' },
  { label: '10:00 م', value: '22:00' },
  { label: '11:00 م', value: '23:00' },
];

function formatTime(val: string) {
  if (!val) return val;
  const [hStr, mStr] = val.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  let period = 'ص';
  if (h === 0) { h = 12; period = 'ص'; }
  else if (h === 12) { period = 'ظ'; }
  else if (h > 12) { h = h - 12; period = 'م'; }
  return `${h}:${m} ${period}`;
}

export default function RoomsSection() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form
  const [roomForm, setRoomForm] = useState({ id: '', name: '', capacity: 30, notes: '' });

  // Schedule slot form — multi-day + type filter
  const [staffTypeFilter, setStaffTypeFilter] = useState<'teacher' | 'trainer'>('teacher');
  const [slotForm, setSlotForm] = useState({
    teacherId: '',
    teacherName: '',
    teacherType: 'teacher' as 'teacher' | 'trainer',
    subjectName: '',
    days: [] as string[],
    startTime: '14:00',
    endTime: '16:00',
  });

  // Students per teacher in this room
  const [roomStudents, setRoomStudents] = useState<Record<string, any[]>>({});

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRm, resTe] = await Promise.all([fetch('/api/rooms'), fetch('/api/teachers')]);
      if (resRm.ok) { const d = await resRm.json(); setRooms(d.rooms || []); }
      if (resTe.ok) { const d = await resTe.json(); setTeachers(d.teachers || []); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadRoomStudents = async (room: Room) => {
    const teacherIds = [...new Set(room.schedule.map(s => s.teacher).filter(Boolean))] as string[];
    const results: Record<string, any[]> = {};
    await Promise.all(teacherIds.map(async (tid) => {
      try {
        const res = await fetch(`/api/teachers/${tid}/students`);
        if (res.ok) { const d = await res.json(); results[tid] = d.students || []; }
      } catch {}
    }));
    setRoomStudents(results);
  };

  const handleSaveRoom = async () => {
    if (!roomForm.name) { showToast('يرجى كِتابة اسم القاعة', 'error'); return; }
    const method = roomForm.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/rooms', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roomForm) });
      const data = await res.json();
      if (res.ok) { showToast(roomForm.id ? 'تم تعديل القاعة' : 'تم إضافة القاعة بنجاح'); setShowAddModal(false); loadData(); }
      else showToast(data.error || 'حدث خطأ', 'error');
    } catch { showToast('خطأ بالخادم', 'error'); }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('هل تريد حذف هذه القاعة؟')) return;
    try {
      const res = await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
      if (res.ok) { showToast('تم حذف القاعة'); setShowDetailModal(false); loadData(); }
    } catch { showToast('خطأ بالحذف', 'error'); }
  };

  const handleAddSlot = async () => {
    if (!selectedRoom || !slotForm.teacherName || slotForm.days.length === 0) {
      showToast('يرجى اختيار المدرس/المدرب والأيام على الأقل', 'error'); return;
    }
    const newSlots: RoomSchedule[] = slotForm.days.map(day => ({
      teacher: slotForm.teacherId || undefined,
      teacherName: slotForm.teacherName,
      teacherType: slotForm.teacherType,
      subjectName: slotForm.subjectName,
      dayOfWeek: day,
      startTime: slotForm.startTime,
      endTime: slotForm.endTime,
    }));
    const newSchedule = [...(selectedRoom.schedule || []), ...newSlots];
    try {
      const res = await fetch('/api/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedRoom._id, schedule: newSchedule }) });
      if (res.ok) {
        showToast(`تم إضافة ${slotForm.days.length} موعد للجدول`);
        const updatedRoom = { ...selectedRoom, schedule: newSchedule };
        setSelectedRoom(updatedRoom);
        setSlotForm({ teacherId: '', teacherName: '', teacherType: staffTypeFilter, subjectName: '', days: [], startTime: '14:00', endTime: '16:00' });
        loadData();
        loadRoomStudents(updatedRoom);
      }
    } catch { showToast('خطأ في إضافة الموعد', 'error'); }
  };

  const handleDeleteSlot = async (index: number) => {
    if (!selectedRoom) return;
    const newSchedule = selectedRoom.schedule.filter((_, i) => i !== index);
    try {
      const res = await fetch('/api/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedRoom._id, schedule: newSchedule }) });
      if (res.ok) {
        showToast('تم حذف الموعد');
        const updatedRoom = { ...selectedRoom, schedule: newSchedule };
        setSelectedRoom(updatedRoom);
        loadData();
        loadRoomStudents(updatedRoom);
      }
    } catch { showToast('خطأ بالحذف', 'error'); }
  };

  const toggleDay = (day: string) => {
    setSlotForm(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };

  const filteredTeachers = teachers.filter(t => t.type === staffTypeFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>🏫 إدارة القاعات والمواعيد</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>إضافة القاعات والمدرسين والمدربين وجدول المواعيد</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setRoomForm({ id: '', name: '', capacity: 30, notes: '' }); setShowAddModal(true); }}>
          + إضافة قاعة جديدة
        </button>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏫</div>
          <p className="empty-state-text">لا يوجد قاعات مسجلة بعد</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {rooms.map((room) => (
            <div className="card" key={room._id} style={{ display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}
              onClick={() => { setSelectedRoom(room); setShowDetailModal(true); loadRoomStudents(room); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-orange)' }}>🏫 {room.name}</h3>
                <span className="badge badge-info">سعة {room.capacity} طالب</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>👨‍🏫 عدد المواعيد: {room.schedule?.length || 0}</div>
              {room.schedule && room.schedule.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {[...new Set(room.schedule.map(s => s.teacherName))].map((name, i) => (
                    <span key={i} className="badge badge-orange" style={{ fontSize: 11 }}>{name}</span>
                  ))}
                </div>
              )}
              {room.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📝 {room.notes}</div>}
              <div style={{ fontSize: 12, color: 'var(--accent-orange)', fontWeight: 600 }}>📋 اضغط للتفاصيل الكاملة</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Room */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{roomForm.id ? '✏️ تعديل القاعة' : '🏫 إضافة قاعة جديدة'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group"><label className="input-label">اسم القاعة *</label><input className="input" placeholder="مثال: قاعة 1 (المتفوقين)" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">سعة القاعة</label><input className="input" type="number" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: +e.target.value })} /></div>
              <div className="input-group"><label className="input-label">ملاحظات</label><input className="input" placeholder="مثال: تحتوي على داتا شو ومكيف..." value={roomForm.notes} onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={handleSaveRoom} style={{ flex: 1 }}>حفظ القاعة</button>
                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detailed Room Schedule */}
      {showDetailModal && selectedRoom && (
        <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="modal card-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 660, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>🏫 {selectedRoom.name}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>السعة: {selectedRoom.capacity} طالب | {selectedRoom.schedule?.length || 0} موعد مسجل</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteRoom(selectedRoom._id)}>🗑️ حذف</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDetailModal(false)}>✕</button>
              </div>
            </div>

            {/* Current Schedule */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>📅 المدرسين/المدربين والمواعيد</h4>
              {selectedRoom.schedule && selectedRoom.schedule.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedRoom.schedule.map((slot, idx) => {
                    const students = slot.teacher ? (roomStudents[slot.teacher] || []) : [];
                    const isTrainer = slot.teacherType === 'trainer';
                    return (
                      <div key={idx} style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: 'var(--accent-orange)', fontSize: 14 }}>
                              {isTrainer ? '🏋️' : '👨‍🏫'} {slot.teacherName}
                              <span className={`badge ${isTrainer ? 'badge-info' : 'badge-orange'}`} style={{ marginRight: 8, fontSize: 11 }}>{isTrainer ? 'مدرب' : 'مدرس'}</span>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                              📚 {slot.subjectName || '—'} &nbsp;|&nbsp; 🗓️ {slot.dayOfWeek} &nbsp;|&nbsp; ⏰ {formatTime(slot.startTime)} → {formatTime(slot.endTime)}
                            </div>
                            {students.length > 0 && (
                              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                <span>👥 {isTrainer ? 'المتدربين' : 'الطلاب'} ({students.length}):</span>
                                {students.slice(0, 4).map((s: any, i: number) => (
                                  <span key={i} style={{ background: 'var(--bg-card)', padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text-primary)' }}>{s.name}</span>
                                ))}
                                {students.length > 4 && <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>+{students.length - 4} آخرين</span>}
                              </div>
                            )}
                          </div>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)', flexShrink: 0 }} onClick={() => handleDeleteSlot(idx)}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>لا يوجد مواعيد مسجلة لهذه القاعة بعد</div>
              )}
            </div>

            {/* Add Schedule Slot */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid var(--border)' }}>
              <h4 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>+ إضافة موعد جديد للقاعة</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Type selector */}
                <div className="input-group">
                  <label className="input-label">النوع *</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['teacher', 'trainer'] as const).map(t => (
                      <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, border: `2px solid ${staffTypeFilter === t ? 'var(--accent-orange)' : 'var(--border)'}`, background: staffTypeFilter === t ? 'var(--accent-orange-muted)' : 'transparent', fontWeight: 600, fontSize: 14, transition: 'all 0.15s', userSelect: 'none' }}>
                        <input type="radio" name="staff-type" checked={staffTypeFilter === t} onChange={() => { setStaffTypeFilter(t); setSlotForm(f => ({ ...f, teacherId: '', teacherName: '', teacherType: t, subjectName: '' })); }} style={{ display: 'none' }} />
                        {t === 'teacher' ? '👨‍🏫 مدرس' : '🏋️ مدرب'}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Staff Selection */}
                <div className="input-group">
                  <label className="input-label">{staffTypeFilter === 'teacher' ? 'المدرس *' : 'المدرب *'}</label>
                  <select className="input" value={slotForm.teacherId} onChange={(e) => {
                    const t = filteredTeachers.find(x => x.id === e.target.value);
                    setSlotForm(f => ({ ...f, teacherId: e.target.value, teacherName: t?.name || '', teacherType: staffTypeFilter, subjectName: t?.subjectName || '' }));
                  }}>
                    <option value="">{staffTypeFilter === 'teacher' ? 'اختر المدرس...' : 'اختر المدرب...'}</option>
                    {filteredTeachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.subjectName})</option>)}
                  </select>
                  {filteredTeachers.length === 0 && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>لا يوجد {staffTypeFilter === 'teacher' ? 'مدرسين' : 'مدربين'} مسجلين</div>}
                </div>

                {/* Days multi-select */}
                <div className="input-group">
                  <label className="input-label">الأيام * (اختر يوم أو أكثر)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {DAYS_OF_WEEK.map(day => (
                      <label key={day} onClick={() => toggleDay(day)} style={{ cursor: 'pointer', padding: '6px 14px', borderRadius: 20, border: `2px solid ${slotForm.days.includes(day) ? 'var(--accent-orange)' : 'var(--border)'}`, background: slotForm.days.includes(day) ? 'var(--accent-orange-muted)' : 'transparent', fontWeight: slotForm.days.includes(day) ? 700 : 400, fontSize: 13, transition: 'all 0.15s', userSelect: 'none', color: slotForm.days.includes(day) ? 'var(--accent-orange)' : 'var(--text-primary)' }}>
                        {slotForm.days.includes(day) ? '✓ ' : ''}{day}
                      </label>
                    ))}
                  </div>
                  {slotForm.days.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--accent-orange)', marginTop: 6, fontWeight: 600 }}>
                      ✔ الأيام المختارة ({slotForm.days.length}): {slotForm.days.join(' ، ')}
                    </div>
                  )}
                </div>

                {/* Egyptian 12-hour time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">من الساعة</label>
                    <select className="input" value={slotForm.startTime} onChange={(e) => setSlotForm(f => ({ ...f, startTime: e.target.value }))}>
                      {EG_HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">إلى الساعة</label>
                    <select className="input" value={slotForm.endTime} onChange={(e) => setSlotForm(f => ({ ...f, endTime: e.target.value }))}>
                      {EG_HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={handleAddSlot}>
                  ✅ إضافة الموعد{slotForm.days.length > 1 ? ` (${slotForm.days.length} أيام)` : ''}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowDetailModal(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
