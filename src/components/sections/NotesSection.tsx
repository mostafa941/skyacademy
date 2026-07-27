'use client';

import { useState, useEffect, useCallback } from 'react';

interface NoteItem {
  _id: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
}

export default function NotesSection() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText }),
      });
      if (res.ok) {
        setNewText('');
        showToast('تم إضافة الملاحظة');
        loadNotes();
      }
    } catch {
      showToast('خطأ في الإضافة', 'error');
    }
  };

  // Toggle Note Status
  const handleToggleCompleted = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isCompleted: !currentStatus }),
      });
      if (res.ok) {
        loadNotes();
      }
    } catch {
      showToast('خطأ في التحديث', 'error');
    }
  };

  // Delete Note
  const handleDeleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم حذف الملاحظة');
        loadNotes();
      }
    } catch {
      showToast('خطأ في الحذف', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>📝 الملاحظات و قائمة المهام (To-Do)</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>تدوين المهام والتذكيرات للأكاديمية مع التاريخ والوقت</p>
        </div>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAddNote} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="✍️ اكتب ملاحظة جديدة أو مهمة للعمل..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
          + إضافة المهمة
        </button>
      </form>

      {/* Notes List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <p className="empty-state-text">لا يوجد ملاحظات مسجلة</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map((note) => (
            <div
              key={note._id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                opacity: note.isCompleted ? 0.6 : 1,
                borderRight: note.isCompleted ? '4px solid var(--success)' : '4px solid var(--accent-orange)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <input
                  type="checkbox"
                  checked={note.isCompleted}
                  onChange={() => handleToggleCompleted(note._id, note.isCompleted)}
                  style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--accent-orange)' }}
                />
                <div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: note.isCompleted ? 'line-through' : 'none',
                    color: note.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                  }}>
                    {note.text}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    ⏰ {new Date(note.createdAt).toLocaleString('ar-EG')}
                  </div>
                </div>
              </div>

              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteNote(note._id)}>
                🗑️ حذف
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
