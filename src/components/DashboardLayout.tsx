'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OverviewSection from './sections/OverviewSection';
import StudentsSection from './sections/StudentsSection';
import TeachersSection from './sections/TeachersSection';
import RoomsSection from './sections/RoomsSection';
import IncomeSection from './sections/IncomeSection';
import ExpensesSection from './sections/ExpensesSection';
import NotesSection from './sections/NotesSection';
import StudentsPaymentStatusSection from './sections/StudentsPaymentStatusSection';
import UsersSection from './sections/UsersSection';
import SettlementsSection from './sections/SettlementsSection';
import NotificationsPanel from './NotificationsPanel';

interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'admin' | 'secretary';
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'لوحة التحكم', icon: '📊' },
  { id: 'students', label: 'الطلاب', icon: '🎓' },
  { id: 'teachers', label: 'المدرسين', icon: '👨‍🏫' },
  { id: 'trainers', label: 'المدربين', icon: '🏋️' },
  { id: 'rooms', label: 'القاعات', icon: '🏫' },
  { id: 'income', label: 'الدخل', icon: '💵' },
  { id: 'expenses', label: 'الخرج', icon: '📤' },
  { id: 'settlements', label: 'التصفيات', icon: '⚖️' },
  { id: 'notes', label: 'الملاحظات', icon: '📝' },
  { id: 'paid_students', label: 'سجل المسددين', icon: '🟢' },
  { id: 'partial_students', label: 'عليهم مبالغ متبقية', icon: '🟡' },
  { id: 'unpaid_students', label: 'غير المسددين', icon: '🔴' },
];

export default function DashboardLayout({ role }: { children?: React.ReactNode; role: 'admin' | 'secretary' }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/');
          return;
        }
        const data = await res.json();
        if (!data.authenticated || data.user.role !== role) {
          router.replace('/');
          return;
        }
        setUser(data.user);
      } catch {
        router.replace('/');
      }
    }
    
    fetchUser();
  }, [role, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 44, height: 44, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري فتح لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', direction: 'rtl', background: 'var(--bg-dark)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span style={{ fontSize: 32 }}>🌤️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent-orange)' }}>Sky Academy</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>اسكاي اكاديمي</div>
          </div>
        </div>

        {/* User Info & Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            flex: 1, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
            padding: '14px 16px', border: '1px solid var(--border)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
              {user.name}
            </div>
            <div className="badge badge-orange" style={{ fontSize: 11 }}>
              {user.role === 'admin' ? '⚡ الأدمن (مدير النظام)' : '💼 سكرتارية الأكاديمية'}
            </div>
          </div>
          <NotificationsPanel />
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {navItems.filter(item => !(role === 'secretary' && item.id === 'income')).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setMobileOpen(false);
              }}
              className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          
          {/* Admin only users tab */}
          {user.role === 'admin' && (
            <button
              onClick={() => {
                setActiveSection('users');
                setMobileOpen(false);
              }}
              className={`sidebar-item ${activeSection === 'users' ? 'active' : ''}`}
            >
              <span style={{ fontSize: 20 }}>👥</span>
              <span>إدارة السكرتارية</span>
            </button>
          )}
        </nav>

        {/* Logout */}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button
            className="sidebar-item"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ color: 'var(--error)', width: '100%' }}
          >
            <span style={{ fontSize: 20 }}>🚪</span>
            <span>{loggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 80 }}>
          {/* Mobile Header Bar */}
          <div style={{
            display: 'none', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
          }} className="mobile-header">
            <button
              onClick={() => setMobileOpen(true)}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 18 }}
            >
              ☰
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <NotificationsPanel />
              <div style={{ fontWeight: 800, color: 'var(--accent-orange)', fontSize: 16 }}>Sky Academy 🌤️</div>
            </div>
          </div>

          {/* Dynamic Section Rendering */}
          {activeSection === 'overview' && <OverviewSection userRole={user.role} onNavigate={(sec) => setActiveSection(sec)} />}
          {activeSection === 'students' && <StudentsSection />}
          {activeSection === 'teachers' && <TeachersSection staffType="teacher" userRole={user.role} />}
          {activeSection === 'trainers' && <TeachersSection staffType="trainer" userRole={user.role} />}
          {activeSection === 'rooms' && <RoomsSection />}
          {activeSection === 'income' && <IncomeSection />}
          {activeSection === 'expenses' && <ExpensesSection userRole={user.role} />}
          {activeSection === 'settlements' && <SettlementsSection />}
          {activeSection === 'notes' && <NotesSection />}
          {activeSection === 'paid_students' && <StudentsPaymentStatusSection paymentStatus="paid" />}
          {activeSection === 'partial_students' && <StudentsPaymentStatusSection paymentStatus="partial" />}
          {activeSection === 'unpaid_students' && <StudentsPaymentStatusSection paymentStatus="unpaid" />}
          {activeSection === 'users' && user.role === 'admin' && <UsersSection userRole={user.role} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-nav">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 11 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
