'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [selectedRole, setSelectedRole] = useState<'admin' | 'secretary'>('admin');
  const [identifier, setIdentifier] = useState('admin@sky.com');
  const [password, setPassword] = useState('');

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Forms
  const [forgotForm, setForgotForm] = useState({ role: 'admin', email: '' });
  const [signupForm, setSignupForm] = useState({ name: '', phone: '', email: '', password: '' });

  // Check existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            router.replace(`/dashboard/${data.user.role}`);
            return;
          }
        }
      } catch {
        /* no active session */
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    if (selectedRole === 'admin') {
      if (!identifier || identifier === 'secretary@sky.com') setIdentifier('admin@sky.com');
    } else {
      if (identifier === 'admin@sky.com') setIdentifier('');
    }
  }, [selectedRole]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'حدث خطأ أثناء الدخول', 'error');
        return;
      }

      showToast(`أهلاً بك، ${data.user.name}! 🎉`, 'success');
      setTimeout(() => {
        router.replace(`/dashboard/${data.user.role}`);
      }, 700);
    } catch {
      showToast('حدث خطأ في الاتصال بالسيرفر', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'حدث خطأ أثناء إنشاء الحساب', 'error');
        return;
      }

      showToast(`تم إنشاء حساب السكرتيرة بنجاح!`, 'success');
      setTimeout(() => {
        router.replace(`/dashboard/secretary`);
      }, 700);
    } catch {
      showToast('حدث خطأ في الاتصال بالسيرفر', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forgotForm),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'حدث خطأ', 'error');
        return;
      }

      showToast(data.message || 'تم إرسال كلمة المرور بنجاح!', 'success');
      setShowForgotModal(false);
    } catch {
      showToast('حدث خطأ في الاتصال بالسيرفر', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 44, height: 44, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border-orange)',
          borderRadius: 'var(--radius-xl)', padding: '12px 28px', marginBottom: 20,
          boxShadow: 'var(--shadow-orange)',
        }}>
          <span style={{ fontSize: 38 }}>🌤️</span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent-orange)' }}>
              Sky Academy
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>
              اسكاي اكاديمي
            </div>
          </div>
        </div>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          نظام إدارة الأكاديمية
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          تسجيل الدخول كأدمن أو سكرتيرة للمتابعة والتحكم
        </p>
      </div>

      {/* Auth Form */}
      <div className="modal card-glass" style={{ maxWidth: 420, width: '100%', border: '1px solid var(--accent-orange-border)', padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 32 }}>🔐</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              تسجيل الدخول
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              الأدمن / السكرتارية
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">الدخول كـ</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className={`btn ${selectedRole === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
                onClick={() => setSelectedRole('admin')}
              >
                👨‍💼 أدمن
              </button>
              <button
                type="button"
                className={`btn ${selectedRole === 'secretary' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
                onClick={() => setSelectedRole('secretary')}
              >
                👩‍💻 سكرتيرة
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">الإيميل أو رقم الهاتف</label>
            <input
              className="input"
              type="text"
              placeholder="example@sky.com أو 01xxxxxxxxx"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">كلمة المرور</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); setForgotForm({...forgotForm, role: selectedRole}); }} style={{ fontSize: 13, color: 'var(--accent-orange)' }}>هل نسيت كلمة السر؟</a>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> جاري الدخول...</> : '🔑 دخول النظام'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ليس لديك حساب؟ </span>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowSignupModal(true); }} style={{ fontSize: 13, color: 'var(--accent-orange)', fontWeight: 'bold' }}>إنشاء حساب سكرتيرة</a>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="modal card-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🔑 استعادة كلمة المرور</h2>
            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">نوع الحساب</label>
                <select className="input" value={forgotForm.role} onChange={e => setForgotForm({ ...forgotForm, role: e.target.value })}>
                  <option value="admin">أدمن</option>
                  <option value="secretary">سكرتيرة</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{forgotForm.role === 'admin' ? 'أدخل إيميل جديد لإرسال كلمة السر إليه' : 'أدخل الإيميل المسجل مسبقاً'}</label>
                <input className="input" type="email" required placeholder="example@email.com" value={forgotForm.email} onChange={e => setForgotForm({ ...forgotForm, email: e.target.value })} />
                {forgotForm.role === 'admin' && <p style={{ fontSize: 11, color: 'var(--accent-orange)', marginTop: 4 }}>تحذير: سيتم إرسال الباسورد الجديد إلى هذا الإيميل لتتمكن من الدخول.</p>}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>إرسال الباسورد</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForgotModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="modal-backdrop" onClick={() => setShowSignupModal(false)}>
          <div className="modal card-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>👩‍💻 إنشاء حساب سكرتيرة</h2>
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">الاسم بالكامل</label>
                <input className="input" required placeholder="مثال: منى أحمد" value={signupForm.name} onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">رقم الهاتف</label>
                <input className="input" required placeholder="01xxxxxxxxx" value={signupForm.phone} onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">الإيميل</label>
                <input className="input" type="email" required placeholder="secretary@sky.com" value={signupForm.email} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">كلمة المرور</label>
                <input className="input" type="password" required placeholder="••••••••" value={signupForm.password} onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>إنشاء الحساب والدخول</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowSignupModal(false)}>إلغاء</button>
              </div>
            </form>
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
