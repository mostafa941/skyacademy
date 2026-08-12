'use client';

import { useState, useEffect, useCallback } from 'react';

interface AppNotification {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLink?: string;
  actionLabel?: string;
  timestamp: string;
}

export default function NotificationsSection() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const countByType = (type: string) => notifications.filter(n => n.type === type).length;

  const filtered = notifications.filter(n => filter === 'all' ? true : n.type === filter);

  const getTypeStyle = (type: string) => {
    if (type === 'error') return { bg: 'rgba(239,68,68,0.1)', border: 'var(--error, #ef4444)', icon: '🔴', label: 'خطأ / تنبيه عاجل' };
    if (type === 'warning') return { bg: 'var(--accent-orange-muted)', border: 'var(--accent-orange)', icon: '⚠️', label: 'تحذير' };
    return { bg: 'var(--bg-elevated)', border: '#3b82f6', icon: 'ℹ️', label: 'معلومة' };
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
            🔔 الإشعارات والتنبيهات
          </h1>
          <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            متابعة جميع التنبيهات النظامية والتحذيرات الهامة
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchNotifications} disabled={loading}>
          {loading ? '⏳ جاري التحديث...' : '🔄 تحديث الإشعارات'}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <div className="card" style={{ textAlign: 'center', padding: '16px 12px', borderTop: '3px solid var(--border)' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{notifications.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>إجمالي الإشعارات</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px 12px', borderTop: '3px solid var(--error, #ef4444)' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--error, #ef4444)' }}>{countByType('error')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>🔴 أخطاء عاجلة</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px 12px', borderTop: '3px solid var(--accent-orange)' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-orange)' }}>{countByType('warning')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>⚠️ تحذيرات</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px 12px', borderTop: '3px solid #3b82f6' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#3b82f6' }}>{countByType('info')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>ℹ️ معلومات</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10, flexWrap: 'wrap' }}>
        {(
          [
            { key: 'all' as const, label: 'الكل', count: notifications.length },
            { key: 'error' as const, label: '🔴 أخطاء', count: countByType('error') },
            { key: 'warning' as const, label: '⚠️ تحذيرات', count: countByType('warning') },
            { key: 'info' as const, label: 'ℹ️ معلومات', count: countByType('info') },
          ]
        ).map(tab => (
          <button
            key={tab.key}
            className={`btn ${filter === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                marginRight: 6,
                background: filter === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)',
                borderRadius: 100,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 800,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل الإشعارات...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <p className="empty-state-text">
            {filter === 'all' ? 'لا توجد إشعارات حالياً ✅' : 'لا توجد إشعارات في هذه الفئة'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            آخر تحديث: {lastRefreshed.toLocaleTimeString('ar-EG')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(notif => {
            const s = getTypeStyle(notif.type);
            return (
              <div
                key={notif.id}
                className="card"
                style={{
                  padding: 16,
                  background: s.bg,
                  borderRight: `5px solid ${s.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{notif.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                    </div>
                  </div>
                  {notif.timestamp && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      🕐 {formatTime(notif.timestamp)}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, paddingRight: 28 }}>
                  {notif.message}
                </div>
                {notif.actionLink && (
                  <div style={{ paddingRight: 28 }}>
                    <a
                      href={notif.actionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 12, padding: '5px 12px', display: 'inline-block' }}
                    >
                      💬 {notif.actionLabel || 'اتخاذ إجراء'}
                    </a>
                  </div>
                )}
              </div>
            );
          })}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 8 }}>
            آخر تحديث: {lastRefreshed.toLocaleTimeString('ar-EG')} — إجمالي: {filtered.length} إشعار
          </p>
        </div>
      )}
    </div>
  );
}
