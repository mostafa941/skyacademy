'use client';

import { useState, useEffect } from 'react';

interface OverviewProps {
  userRole: string;
  onNavigate: (section: string) => void;
}

export default function OverviewSection({ userRole, onNavigate }: OverviewProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل الإحصائيات...</p>
      </div>
    );
  }

  if (!stats) return null;

  const f = stats.finance || {};
  const isAdmin = userRole === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>لوحة التحكم الرئيسية</h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>ملخص الأداء والحسابات للأكاديمية</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isAdmin && <button className="btn btn-primary" onClick={() => onNavigate('income')}>💵 سجل الدخل</button>}
          <button className="btn btn-secondary" onClick={() => onNavigate('expenses')}>📤 تسجيل خرج</button>
        </div>
      </div>

      {/* Financial Cards (Admin Only) */}
      {isAdmin ? (
        <div className="card" style={{ border: '1px solid var(--accent-orange-border)', background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(255, 107, 0, 0.04) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>💰 الحسابات والمكاسب</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('income')}>تفاصيل الدخل ←</button>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('expenses')}>تفاصيل الخرج ←</button>
            </div>
          </div>

          {/* Daily Financial Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'var(--success-muted)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>☀️ دخل اليوم</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--success)' }}>
                {f.todayIncome?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>

            <div style={{ background: 'var(--error-muted)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>☀️ خرج اليوم</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--error)' }}>
                {f.todayExpenses?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>

            <div style={{ background: 'var(--accent-orange-muted)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid var(--accent-orange-border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>✨ مكسب اليوم</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent-orange)' }}>
                {f.netToday?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>
          </div>

          {/* Monthly & Total Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>دخل الشهر ({f.month})</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                {f.monthIncome?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>خرج الشهر ({f.month})</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--error)', marginTop: 4 }}>
                {f.monthExpenses?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>صافي ربح الشهر</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-gold)', marginTop: 4 }}>
                {f.netMonth?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي صافي الأرباح</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {f.netProfit?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-elevated)', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>لوحة الحسابات والدخل مغلقة</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>بيانات الدخل، الخرج، وصافي الأرباح تظهر فقط لحساب الإدارة (الأدمن).</p>
        </div>
      )}

      {/* Main Entities Counter Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="card" onClick={() => onNavigate('students')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36 }}>🎓</div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>إجمالي الطلاب</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalStudents || 0}</div>
          </div>
        </div>

        <div className="card" onClick={() => onNavigate('teachers')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36 }}>👨‍🏫</div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>المدرسين</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalTeachers || 0}</div>
          </div>
        </div>

        <div className="card" onClick={() => onNavigate('trainers')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36 }}>🏋️</div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>المدربين</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalTrainers || 0}</div>
          </div>
        </div>

        <div className="card" onClick={() => onNavigate('rooms')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36 }}>🏫</div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>القاعات</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalRooms || 0}</div>
          </div>
        </div>
      </div>

      {/* Attendance & Notes Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📅 معدل حضور الطلاب</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, background: 'var(--success-muted)', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--success)' }}>{stats.attendance?.present || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>حاضر</div>
            </div>
            <div style={{ flex: 1, background: 'var(--error-muted)', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--error)' }}>{stats.attendance?.absent || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>غائب</div>
            </div>
            <div style={{ flex: 1, background: 'var(--accent-orange-muted)', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-orange)' }}>{stats.attendance?.rate || 100}%</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>نسبة الحضور</div>
            </div>
          </div>
        </div>

        <div className="card" onClick={() => onNavigate('notes')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>📝 الملاحظات و To-Do</h3>
            <span className="badge badge-orange">{stats.uncompletedNotes || 0} معلقة</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            اضغط هنا للانتقال لقائمة المهام والملاحظات الخاصة بالأكاديمية
          </p>
        </div>
      </div>
    </div>
  );
}
