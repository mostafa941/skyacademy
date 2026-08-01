'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserItem {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'admin' | 'secretary';
  createdAt: string;
}

interface UsersSectionProps {
  userRole: string;
}

export default function UsersSection({ userRole }: UsersSectionProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Forms
  const [userForm, setUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'secretary' as 'admin' | 'secretary',
  });

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    password: '',
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('تم إضافة الحساب بنجاح');
        setShowAddModal(false);
        setUserForm({ name: '', phone: '', email: '', password: '', role: 'secretary' });
        loadUsers();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ بالاتصال بالخادم', 'error');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('تم تحديث البيانات بنجاح');
        setShowEditModal(false);
        setSelectedUser(null);
        setEditForm({ id: '', name: '', phone: '', email: '', password: '' });
        loadUsers();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ بالاتصال بالخادم', 'error');
    }
  };

  const handleDeleteUser = async (id: string, role: string) => {
    if (role === 'admin') {
      showToast('لا يمكن حذف حساب الأدمن', 'error');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا الحساب (السكرتيرة)؟ لن يمكنها الدخول للنظام بعد الآن.')) return;
    
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('تم حذف الحساب بنجاح');
        loadUsers();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ بالاتصال بالخادم', 'error');
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>👥 إدارة المستخدمين</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>إضافة سكرتارية وتغيير كلمات المرور</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + إضافة مستخدم جديد
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p className="empty-state-text">لا يوجد مستخدمين مسجلين</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الدور</th>
                <th>الهاتف</th>
                <th>البريد الإلكتروني</th>
                <th>تاريخ الإنشاء</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td style={{ fontWeight: 700 }}>{user.name}</td>
                  <td>
                    {user.role === 'admin' ? (
                      <span className="badge badge-orange">مدير النظام</span>
                    ) : (
                      <span className="badge badge-info">سكرتارية</span>
                    )}
                  </td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{user.phone}</td>
                  <td>{user.email || '-'}</td>
                  <td>{new Date(user.createdAt).toISOString().substring(0, 10)}</td>
                  <td>
                    {/* Admins can edit anyone, secretaries can only edit themselves or other secretaries */}
                    {(isAdmin || user.role === 'secretary') && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => {
                          setSelectedUser(user);
                          setEditForm({
                            id: user._id,
                            name: user.name,
                            phone: user.phone,
                            email: user.email || '',
                            password: '', // blank password, only update if typed
                          });
                          setShowEditModal(true);
                        }}
                      >
                        ✏️ تعديل / كلمة المرور
                      </button>
                    )}
                    
                    {isAdmin && user.role !== 'admin' && (
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: 'var(--error)' }}
                        onClick={() => handleDeleteUser(user._id, user.role)}
                      >
                        🗑️ حذف
                      </button>
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
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>+ إضافة مستخدم جديد</h2>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">الاسم الكامل *</label>
                <input className="input" required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">رقم الهاتف *</label>
                <input className="input" required value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">البريد الإلكتروني (اختياري)</label>
                <input className="input" type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">كلمة المرور *</label>
                <input className="input" type="password" required minLength={4} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
              </div>
              {isAdmin && (
                <div className="input-group">
                  <label className="input-label">الدور / الصلاحية *</label>
                  <select className="input" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})}>
                    <option value="secretary">سكرتارية</option>
                    <option value="admin">أدمن (مدير عام)</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>حفظ الحساب</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal card-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>✏️ تعديل الحساب: {selectedUser.name}</h2>
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">الاسم الكامل *</label>
                <input className="input" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">رقم الهاتف *</label>
                <input className="input" required value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">البريد الإلكتروني (اختياري)</label>
                <input className="input" type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">كلمة المرور الجديدة (اتركها فارغة إذا لا تريد التغيير)</label>
                <input className="input" type="password" minLength={4} value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>حفظ التعديلات</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
