'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'admin' | 'teacher' | 'secretary' | 'student' | null;
type AuthMode = 'login' | 'register';

const roles = [
  {
    id: 'student' as Role,
    icon: '🎓',
    label: 'طالب',
    description: 'شاهد درجاتك وحضورك ومصاريفك',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #1e3a5f, #1e40af)',
    border: 'rgba(59, 130, 246, 0.4)',
  },
  {
    id: 'teacher' as Role,
    icon: '👨‍🏫',
    label: 'مدرس',
    description: 'تابع طلابك وأضف تقييماتهم',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #14532d, #15803d)',
    border: 'rgba(34, 197, 94, 0.4)',
  },
  {
    id: 'secretary' as Role,
    icon: '💼',
    label: 'سكرتيرة',
    description: 'أدر الطلاب والمصاريف والحضور',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #3b0764, #7e22ce)',
    border: 'rgba(168, 85, 247, 0.4)',
  },
  {
    id: 'admin' as Role,
    icon: '⚡',
    label: 'أدمن',
    description: 'التحكم الكامل في الأكاديمية',
    color: '#ff6b00',
    gradient: 'linear-gradient(135deg, #431407, #9a3412)',
    border: 'rgba(255, 107, 0, 0.4)',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pwaInstallEvent, setPwaInstallEvent] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', subjectName: '',
  });

  // Check existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            router.replace(`/dashboard/${data.user.role}`);
          }
        }
      } catch { /* no session */ }
    };
    checkSession();

    // PWA install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setPwaInstallEvent(e);
      setShowPwaBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [router]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setAuthMode('login');
    setForm({ name: '', email: '', phone: '', password: '', subjectName: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login'
        ? { role: selectedRole, email: form.email, password: form.password, phone: form.phone, name: form.name }
        : { role: selectedRole, name: form.name, email: form.email, phone: form.phone, subjectName: form.subjectName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'حدث خطأ', 'error');
        return;
      }

      showToast(authMode === 'login' ? `أهلاً بك، ${data.user.name}! 🎉` : 'تم إنشاء الحساب بنجاح! 🎉', 'success');
      setTimeout(() => {
        router.replace(`/dashboard/${data.user.role}`);
      }, 800);
    } catch {
      showToast('حدث خطأ في الاتصال', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePwaInstall = async () => {
    if (pwaInstallEvent) {
      pwaInstallEvent.prompt();
      const result = await pwaInstallEvent.userChoice;
      if (result.outcome === 'accepted') {
        setShowPwaBanner(false);
        showToast('تم تثبيت التطبيق بنجاح! 🚀', 'success');
      }
    }
  };

  const canRegister = selectedRole === 'teacher' || selectedRole === 'secretary';

  return (
    <main className="bg-grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border-orange)',
          borderRadius: 'var(--radius-xl)', padding: '12px 28px', marginBottom: 24,
          boxShadow: 'var(--shadow-orange)',
        }}>
          <span style={{ fontSize: 40 }}>🌤️</span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-orange)', letterSpacing: '-0.5px' }}>
              Sky Academy
            </div>
            <div style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>
              اسكاي اكاديمي
            </div>
          </div>
        </div>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          مرحباً بك في منصة الإدارة
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          اختر صفتك للدخول إلى لوحة التحكم الخاصة بك
        </p>
      </div>

      {/* Role Cards */}
      {!selectedRole && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20, width: '100%', maxWidth: 900,
        }}>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              style={{
                background: role.gradient,
                border: `2px solid ${role.border}`,
                borderRadius: 'var(--radius-xl)',
                padding: '32px 24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 12,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px) scale(1.02)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px ${role.color}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 52, lineHeight: 1 }}>{role.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{role.label}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{role.description}</div>
              <div style={{
                marginTop: 8, padding: '6px 18px',
                background: `${role.color}30`, border: `1px solid ${role.color}50`,
                borderRadius: 100, fontSize: 12, fontWeight: 600, color: role.color,
              }}>
                ادخل الآن ←
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Auth Form */}
      {selectedRole && (
        <div className="modal card-glass" style={{ maxWidth: 460, width: '100%', border: '1px solid var(--accent-orange-border)' }}>
          {/* Back button */}
          <button
            onClick={() => setSelectedRole(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Cairo', direction: 'rtl' }}
          >
            ← العودة للاختيار
          </button>

          {/* Role badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 36 }}>{roles.find(r => r.id === selectedRole)?.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                {authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {roles.find(r => r.id === selectedRole)?.label}
              </div>
            </div>
          </div>

          {/* Tab buttons for teacher/secretary */}
          {canRegister && (
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 24 }}>
              <button
                onClick={() => setAuthMode('login')}
                style={{
                  flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: authMode === 'login' ? 'var(--accent-orange)' : 'transparent',
                  color: authMode === 'login' ? '#fff' : 'var(--text-secondary)',
                  fontFamily: 'Cairo', fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                }}
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => setAuthMode('register')}
                style={{
                  flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: authMode === 'register' ? 'var(--accent-orange)' : 'transparent',
                  color: authMode === 'register' ? '#fff' : 'var(--text-secondary)',
                  fontFamily: 'Cairo', fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                }}
              >
                إنشاء حساب
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Admin: email + password */}
            {selectedRole === 'admin' && (
              <>
                <div className="input-group">
                  <label className="input-label">البريد الإلكتروني</label>
                  <input className="input" type="email" placeholder="admin@sky.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">كلمة المرور</label>
                  <input className="input" type="password" placeholder="••••••••" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} required />
                </div>
              </>
            )}

            {/* Student: phone only */}
            {selectedRole === 'student' && (
              <div className="input-group">
                <label className="input-label">رقم الهاتف المسجل</label>
                <input className="input" type="tel" placeholder="01xxxxxxxxx" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} required />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  رقم الهاتف الذي سجلته السكرتيرة عند إضافتك للأكاديمية
                </span>
              </div>
            )}

            {/* Teacher / Secretary: login by name + phone */}
            {(selectedRole === 'teacher' || selectedRole === 'secretary') && authMode === 'login' && (
              <>
                <div className="input-group">
                  <label className="input-label">الاسم (اختياري)</label>
                  <input className="input" type="text" placeholder="اسمك الكامل" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">رقم الهاتف</label>
                  <input className="input" type="tel" placeholder="01xxxxxxxxx" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} required />
                </div>
              </>
            )}

            {/* Teacher / Secretary: register */}
            {(selectedRole === 'teacher' || selectedRole === 'secretary') && authMode === 'register' && (
              <>
                <div className="input-group">
                  <label className="input-label">الاسم الكامل</label>
                  <input className="input" type="text" placeholder="اسمك الكامل" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">البريد الإلكتروني</label>
                  <input className="input" type="email" placeholder="example@email.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">رقم الهاتف</label>
                  <input className="input" type="tel" placeholder="01xxxxxxxxx" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} required />
                </div>
                {selectedRole === 'teacher' && (
                  <div className="input-group">
                    <label className="input-label">اسم المادة التي تدرسها</label>
                    <input className="input" type="text" placeholder="مثال: الرياضيات، الفيزياء..." value={form.subjectName}
                      onChange={e => setForm({ ...form, subjectName: e.target.value })} required />
                  </div>
                )}
              </>
            )}

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> جاري المعالجة...</> :
                authMode === 'login' ? '🔐 تسجيل الدخول' : '✨ إنشاء الحساب'}
            </button>
          </form>
        </div>
      )}

      {/* PWA Banner */}
      {showPwaBanner && (
        <div className="pwa-banner">
          <span style={{ fontSize: 28 }}>📱</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>ثبّت التطبيق</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>استخدم Sky Academy بدون متصفح</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={handlePwaInstall} className="btn btn-primary btn-sm">تثبيت</button>
            <button onClick={() => setShowPwaBanner(false)} className="btn btn-ghost btn-sm">لاحقاً</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Sky Academy © 2026 — جميع الحقوق محفوظة
      </p>
    </main>
  );
}
