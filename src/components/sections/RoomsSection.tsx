'use client';

import { useState, useEffect, useCallback } from 'react';

interface RoomSchedule {
  teacher?: string;
  teacherName?: string;
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

interface Teacher {
  id: string;
  name: string;
  subjectName: string;
}

export default function RoomsSection() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form
  const [roomForm, setRoomForm] = useState({
    id: '',
    name: '',
    capacity: 30,
    notes: '',
  });

  // Schedule slot form
  const [slotForm, setSlotForm] = useState({
    teacherId: '',
    teacherName: '',
    subjectName: '',
    dayOfWeek: 'السبت',
    startTime: '14:00',
    endTime: '16:00',
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRm, resTe] = await Promise.all([fetch('/api/rooms'), fetch('/api/teachers')]);
      if (resRm.ok) {
        const d = await resRm.json();
        setRooms(d.rooms || []);
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

  // Save Room
  const handleSaveRoom = async () => {
    if (!roomForm.name) {
      showToast('يرجى كِتابة اسم القاعة', 'error');
      return;
    }

    const method = roomForm.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/rooms', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(roomForm.id ? 'تم تعديل القاعة' : 'تم إضافة القاعة بنجاح');
        setShowAddModal(false);
        loadData();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Delete Room
  const handleDeleteRoom = async (id: string) => {
    if (!confirm('هل تريد حذف هذه القاعة؟')) return;
    try {
      const res = await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم حذف القاعة');
        setShowDetailModal(false);
        loadData();
      }
    } catch {
      showToast('خطأ بالحذف', 'error');
    }
  };

  // Add Schedule Slot to selected Room
  const handleAddSlot = async () => {
    if (!selectedRoom || !slotForm.teacherName) return;
    const slotToSave = {
      teacher: slotForm.teacherId || undefined,
      teacherName: slotForm.teacherName,
      subjectName: slotForm.subjectName,
      dayOfWeek: slotForm.dayOfWeek,
      startTime: slotForm.startTime,
      endTime: slotForm.endTime,
    };
    const newSchedule = [...(selectedRoom.schedule || []), slotToSave];
    try {
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRoom._id, schedule: newSchedule }),
      });
      if (res.ok) {
        showToast('تم إضافة الموعد للجدول');
        setSelectedRoom({ ...selectedRoom, schedule: newSchedule });
        setSlotForm({ teacherId: '', teacherName: '', subjectName: '', dayOfWeek: 'السبت', startTime: '14:00', endTime: '16:00' });
        loadData();
      }
    } catch {
      showToast('خطأ في إضافة الموعد', 'error');
    }
  };

  // Delete Schedule Slot
  const handleDeleteSlot = async (index: number) => {
    if (!selectedRoom) return;
    const newSchedule = selectedRoom.schedule.filter((_, i) => i !== index);
    try {
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRoom._id, schedule: newSchedule }),
      });
      if (res.ok) {
        showToast('تم حذف الموعد');
        setSelectedRoom({ ...selectedRoom, schedule: newSchedule });
        loadData();
      }
    } catch {
      showToast('خطأ بالحذف', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>🏫 إدارة القاعات والمواعيد</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>إضافة القاعات والمدرسين الشارحين فيها وجدول المواعيد</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setRoomForm({ id: '', name: '', capacity: 30, notes: '' });
          setShowAddModal(true);
        }}>
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
            <div className="card" key={room._id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-orange)' }}>🏫 {room.name}</h3>
                <span className="badge badge-info">سعة {room.capacity} طالب</span>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                👨‍🏫 عدد حصص الجدول: {room.schedule?.length || 0}
              </div>

              {room.notes && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📝 {room.notes}</div>
              )}

              <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedRoom(room); setShowDetailModal(true); }} style={{ marginTop: 8 }}>
                📋 جدول ومواعيد القاعة
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Room */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {roomForm.id ? '✏️ تعديل القاعة' : '🏫 إضافة قاعة جديدة'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">اسم القاعة *</label>
                <input className="input" placeholder="مثال: قاعة 1 (المتفوقين)" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">سعة القاعة (عدد الطلاب)</label>
                <input className="input" type="number" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: +e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">ملاحظات</label>
                <input className="input" placeholder="مثال: تحتوي على داتا شو ومكيف..." value={roomForm.notes} onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })} />
              </div>
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
          <div className="modal card-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>🏫 {selectedRoom.name}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>السعة: {selectedRoom.capacity} طالب</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteRoom(selectedRoom._id)}>
                🗑️ حذف القاعة
              </button>
            </div>

            {/* Schedule List */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12 }}>📅 المدرسين والمواعيد في هذه القاعة</h4>
              {selectedRoom.schedule && selectedRoom.schedule.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedRoom.schedule.map((slot, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>👨‍🏫 {slot.teacherName} ({slot.subjectName})</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🗓️ {slot.dayOfWeek} — من {slot.startTime} إلى {slot.endTime}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteSlot(idx)}>
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>لا يوجد مواعيد مسجلة لهذه القاعة بعد</div>
              )}
            </div>

            {/* Add Schedule Slot */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 10 }}>+ إضافة موعد ومدرس للقاعة</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="input-group">
                    <label className="input-label">المدرس *</label>
                    <select className="input" value={slotForm.teacherId} onChange={(e) => {
                      const t = teachers.find(x => x.id === e.target.value);
                      setSlotForm({ ...slotForm, teacherId: e.target.value, teacherName: t?.name || '', subjectName: t?.subjectName || '' });
                    }}>
                      <option value="">اختر المدرس...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.subjectName})</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">اليوم *</label>
                    <select className="input" value={slotForm.dayOfWeek} onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: e.target.value })}>
                      {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="input-group">
                    <label className="input-label">من الساعة</label>
                    <input className="input" type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">إلى الساعة</label>
                    <input className="input" type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} />
                  </div>
                </div>

                <button className="btn btn-primary btn-sm" onClick={handleAddSlot}>إضافة الموعد للجدول</button>
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
