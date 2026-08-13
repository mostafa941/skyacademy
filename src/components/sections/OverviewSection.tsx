'use client';

import { useState, useEffect } from 'react';
import PDFReport from '../PDFReport';

interface OverviewProps {
  userRole: string;
  onNavigate: (section: string) => void;
}

export default function OverviewSection({ userRole, onNavigate }: OverviewProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPdf, setShowPdf] = useState(false);
  const [todayAbsent, setTodayAbsent] = useState<any[]>([]);

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
    async function loadTodayAbsent() {
      try {
        const today = new Date().toISOString().substring(0, 10);
        const res = await fetch(`/api/attendance?date=${today}`);
        if (res.ok) {
          const data = await res.json();
          const absentList = (data.attendance || []).filter((a: any) => a.status === 'absent' || a.status === 'excused');
          setTodayAbsent(absentList);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadStats();
    loadTodayAbsent();
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
              <button className="btn btn-primary btn-sm" onClick={() => setShowPdf(true)}>📄 تصدير التقرير المالي</button>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('income')}>تفاصيل الدخل ←</button>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('expenses')}>تفاصيل الخرج ←</button>
            </div>
          </div>

          {/* Daily Financial Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div onClick={() => onNavigate('income')} style={{ cursor: 'pointer', background: 'var(--success-muted)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>☀️ دخل اليوم</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--success)' }}>
                {f.todayIncome?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>

            <div onClick={() => onNavigate('expenses')} style={{ cursor: 'pointer', background: 'var(--error-muted)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>☀️ خرج اليوم</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--error)' }}>
                {f.todayExpenses?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>

            <div onClick={() => onNavigate('income')} style={{ cursor: 'pointer', background: 'var(--accent-orange-muted)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid var(--accent-orange-border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>✨ مكسب اليوم</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent-orange)' }}>
                {f.netToday?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>
          </div>

          {/* Monthly & Total Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div onClick={() => onNavigate('income')} style={{ cursor: 'pointer', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>دخل الشهر ({f.month})</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                {f.monthIncome?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>
            <div onClick={() => onNavigate('expenses')} style={{ cursor: 'pointer', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>خرج الشهر ({f.month})</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--error)', marginTop: 4 }}>
                {f.monthExpenses?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>
            <div onClick={() => onNavigate('income')} style={{ cursor: 'pointer', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>صافي ربح الشهر</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-gold)', marginTop: 4 }}>
                {f.netMonth?.toLocaleString('ar-EG') || 0} ج.م
              </div>
            </div>
            <div onClick={() => onNavigate('income')} style={{ cursor: 'pointer', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
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

      {/* Attendance, Notes & Today Absent Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📅 معدل حضور الطلاب (إجمالي)</h3>
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

      {/* Today's Absent Students Widget */}
      <div className="card" style={{ border: todayAbsent.length > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)', background: todayAbsent.length > 0 ? 'linear-gradient(135deg, var(--bg-card) 0%, rgba(239,68,68,0.03) 100%)' : 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontWeight: 800, fontSize: 18 }}>
            📋 غياب اليوم — {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {todayAbsent.filter((a: any) => a.status === 'absent').length > 0 && (
              <span className="badge badge-danger">{todayAbsent.filter((a: any) => a.status === 'absent').length} غائب</span>
            )}
            {todayAbsent.filter((a: any) => a.status === 'excused').length > 0 && (
              <span className="badge badge-orange">{todayAbsent.filter((a: any) => a.status === 'excused').length} مستأذن</span>
            )}
          </div>
        </div>
        {todayAbsent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--success)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700 }}>لا يوجد غياب مسجّل اليوم</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>جميع الطلاب المسجّل حضورهم اليوم حاضرون</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {todayAbsent.map((rec: any) => {
              const st = rec.student || {};
              const phone = st.parentPhone || st.phone || '';
              const waPhone = phone.startsWith('0') ? `+2${phone}` : phone;
              const statusAr = rec.status === 'absent' ? 'غائب' : 'مستأذن';
              const statusEmoji = rec.status === 'absent' ? '❌' : '⚠️';
              const absMsg = encodeURIComponent(`السلام عليكم، نود إعلامكم بأن ${st.name} كان ${rec.status === 'absent' ? 'غائباً' : 'مستأذناً'} اليوم بتاريخ ${new Date().toISOString().substring(0, 10)}. نرجو التواصل معنا. شكراً - أكاديمية سكاي`);
              return (
                <div key={rec._id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: rec.status === 'absent' ? 'var(--error-muted)' : 'var(--accent-orange-muted)',
                  border: `1px solid ${rec.status === 'absent' ? 'rgba(239,68,68,0.2)' : 'rgba(255,107,0,0.2)'}`,
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: 20 }}>{statusEmoji}</span>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{st.name || 'غير معروف'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {statusAr}{rec.notes ? ` — ${rec.notes}` : ''}
                    </div>
                  </div>
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}?text=${absMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 20,
                        background: '#25D366', color: 'white',
                        fontSize: 12, fontWeight: 700, textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(37,211,102,0.35)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span style={{ fontSize: 15 }}>📱</span> إشعار واتساب
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPdf && isAdmin && stats && (
        <PDFReport 
          title="التقرير المالي الشامل للأكاديمية" 
          subtitle={`لشهر ${stats.finance?.month}`}
          onClose={() => setShowPdf(false)}
        >
          <div style={{ marginBottom: 24 }}>
             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12 }}>ملخص إحصائيات الأكاديمية</h3>
             <table style={{ width: '100%', marginBottom: 24, borderCollapse: 'collapse' }}>
               <tbody>
                 <tr><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 'bold', width: '40%' }}>إجمالي الطلاب:</td><td style={{ border: '1px solid #ddd', padding: 8 }}>{stats.totalStudents}</td></tr>
                 <tr><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 'bold' }}>إجمالي المدرسين والمدربين:</td><td style={{ border: '1px solid #ddd', padding: 8 }}>{stats.totalTeachers + stats.totalTrainers}</td></tr>
                 <tr><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 'bold' }}>نسبة حضور الطلاب:</td><td style={{ border: '1px solid #ddd', padding: 8 }}>{stats.attendance?.rate || 100}%</td></tr>
               </tbody>
             </table>

             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12 }}>الحسابات المالية (لشهر {stats.finance?.month})</h3>
             <table style={{ width: '100%', marginBottom: 24, borderCollapse: 'collapse' }}>
               <tbody>
                 <tr><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 'bold', width: '40%' }}>إجمالي الدخل:</td><td style={{ border: '1px solid #ddd', padding: 8, color: 'green' }}>{stats.finance?.monthIncome?.toLocaleString('ar-EG')} ج.م</td></tr>
                 <tr><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 'bold' }}>إجمالي الخرج والمصروفات:</td><td style={{ border: '1px solid #ddd', padding: 8, color: 'red' }}>{stats.finance?.monthExpenses?.toLocaleString('ar-EG')} ج.م</td></tr>
                 <tr style={{ background: '#f5f5f5' }}><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 'bold', fontSize: '18px' }}>صافي ربح الشهر:</td><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 'bold', fontSize: '18px' }}>{stats.finance?.netMonth?.toLocaleString('ar-EG')} ج.م</td></tr>
               </tbody>
             </table>

             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12 }}>إجمالي الحسابات الشاملة (All-Time)</h3>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <tbody>
                 <tr style={{ background: '#f5f5f5' }}><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 'bold', width: '40%', fontSize: '18px' }}>إجمالي صافي الأرباح الكلي:</td><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 'bold', fontSize: '18px' }}>{stats.finance?.netProfit?.toLocaleString('ar-EG')} ج.م</td></tr>
               </tbody>
             </table>
          </div>
        </PDFReport>
      )}
    </div>
  );
}
