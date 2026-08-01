'use client';

import { useState, useEffect, useRef } from 'react';

export interface AppNotification {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLink?: string;
  actionLabel?: string;
  timestamp: string;
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initially
    fetchNotifications();

    // Close on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.length;

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button 
        onClick={() => {
          if (!isOpen) fetchNotifications();
          setIsOpen(!isOpen);
        }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: -2,
            right: -2,
            background: 'var(--error)',
            color: 'white',
            fontSize: 10,
            fontWeight: 'bold',
            borderRadius: '50%',
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 50,
          left: 0,
          width: 350,
          maxHeight: 500,
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 100,
          padding: 16,
          direction: 'rtl'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
            الإشعارات والتنبيهات
          </h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }}></div>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
              لا توجد إشعارات حالياً ✅
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.map(notif => (
                <div key={notif.id} style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  background: notif.type === 'error' ? 'var(--error-light)' : notif.type === 'warning' ? 'var(--accent-orange-muted)' : 'var(--bg-elevated)',
                  borderLeft: `4px solid ${notif.type === 'error' ? 'var(--error)' : notif.type === 'warning' ? 'var(--accent-orange)' : 'var(--info)'}`
                }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4, color: 'var(--text-primary)' }}>
                    {notif.type === 'error' ? '🔴' : notif.type === 'warning' ? '⚠️' : 'ℹ️'} {notif.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                    {notif.message}
                  </div>
                  {notif.actionLink && (
                    <a 
                      href={notif.actionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 11, padding: '4px 10px', display: 'inline-block' }}
                    >
                      💬 {notif.actionLabel || 'اتخاذ إجراء'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
