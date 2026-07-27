'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [selectedRole, setSelectedRole] = useState<'admin' | 'secretary'>('admin');
  const [password, setPassword] = useState('');

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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const identifier = selectedRole === 'admin' ? 'admin@sky.com' : 'secretary@sky.com';
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> جاري الدخول...</> : '🔑 دخول النظام'}
          </button>
        </form>
      </div>

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
