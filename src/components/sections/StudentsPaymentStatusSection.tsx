'use client';

import { useState, useEffect, useCallback } from 'react';
import { openStudentWhatsAppReport, AttendanceRecord } from '@/lib/whatsapp';

interface Student {
  id: string;
  name: string;
  phone: string;
  parentPhone: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  monthlyFee: number;
  notes?: string;
  grades?: Array<{ title: string; score: number; maxScore: number; date?: string }>;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  paymentAmount: number;
  paymentType?: 'session' | 'monthly';
  paymentReason?: string;
  remainingAmount: number;
  remainingReason?: string;
  totalAttendance?: number;
  presentCount?: number;
  absentCount?: number;
  excusedCount?: number;
  attendanceHistory?: AttendanceRecord[];
  type?: 'student' | 'trainee';
}

interface StudentsPaymentStatusSectionProps {
  paymentStatus: 'paid' | 'partial' | 'unpaid';
}

const primaryGrades = [
  'الصف الأول الابتدائي',
  'الصف الثاني الابتدائي',
  'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف السادس الابتدائي',
];
const prepGrades = [
  'الصف الأول الإعدادي',
  'الصف الثاني الإعدادي',
  'الصف الثالث الإعدادي',
];
const secondaryGrades = [
  'الصف الأول الثانوي',
  'الصف الثاني الثانوي',
  'الصف الثالث الثانوي',
];

export default function StudentsPaymentStatusSection({ paymentStatus }: StudentsPaymentStatusSectionProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  
  // Tabs & Stage selections
  const [activeTab, setActiveTab] = useState<'student' | 'trainee'>('student');
  const [selectedStage, setSelectedStage] = useState<'primary' | 'prep' | 'secondary'>('secondary');
  const [selectedGrade, setSelectedGrade] = useState('الصف الأول الثانوي');

  const getTitle = () => {
    if (paymentStatus === 'paid') return '🟢 سجل المدفوعين (الذين سددوا)';
    if (paymentStatus === 'partial') return '🟡 سجل المتأخرين (الذين عليهم مبالغ)';
    return '🔴 سجل غير المسددين (الذين لم يدفعوا)';
  };

  const getSubtitle = () => {
    if (paymentStatus === 'paid') return 'عرض الطلاب والمتدربين الذين دفعوا بالكامل للشهر الحالي';
    if (paymentStatus === 'partial') return 'عرض الطلاب والمتدربين الذين سددوا دفعات جزئية وعليهم مستحقات';
    return 'عرض الطلاب والمتدربين الذين لم يقوموا بأي عمليات سداد للشهر الحالي';
  };

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?type=${activeTab}&month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedMonth]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Handle stage default grade update
  const handleStageChange = (stage: 'primary' | 'prep' | 'secondary') => {
    setSelectedStage(stage);
    if (stage === 'primary') setSelectedGrade('الصف الأول الابتدائي');
    else if (stage === 'prep') setSelectedGrade('الصف الأول الإعدادي');
    else if (stage === 'secondary') setSelectedGrade('الصف الأول الثانوي');
  };

  // Filter students
  const filteredStudents = students.filter(st => {
    // 1. Filter by paymentStatus prop
    if (st.paymentStatus !== paymentStatus) return false;

    // 2. Filter by type (student vs trainee)
    if ((st.type || 'student') !== activeTab) return false;

    // 3. Filter by Grade (if Student)
    if (activeTab === 'student' && st.grade !== selectedGrade) return false;

    // 4. Search query
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      return (
        st.name.toLowerCase().includes(query) ||
        st.phone.includes(query) ||
        st.parentPhone.includes(query) ||
        st.subjectName.toLowerCase().includes(query) ||
        st.teacherName.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>{getTitle()}</h1>
        <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{getSubtitle()}</p>
      </div>

      {/* Tabs (Student vs Trainee) and Month Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${activeTab === 'student' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('student')}
          >
            🎓 الطلاب التعليميين
          </button>
          <button
            className={`btn ${activeTab === 'trainee' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('trainee')}
          >
            🏋️ المتدربين الرياضيين
          </button>
        </div>
        
        <div className="input-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}>
          <label className="input-label" style={{ marginBottom: 0 }}>اختر الشهر (المخزون القديم):</label>
          <input 
            type="month" 
            className="input" 
            style={{ width: 'auto' }}
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
          />
        </div>
      </div>

      {/* Stage and Grade selector for students */}
      {activeTab === 'student' && (
        <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">المرحلة العمرية / الدراسية:</label>
            <select className="input" value={selectedStage} onChange={(e) => handleStageChange(e.target.value as any)}>
              <option value="primary">الابتدائية 🎒</option>
              <option value="prep">الإعدادية 🏫</option>
              <option value="secondary">الثانوية 🎓</option>
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">الصف الدراسي:</label>
            <select className="input" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
              {selectedStage === 'primary' && primaryGrades.map(g => <option key={g} value={g}>{g}</option>)}
              {selectedStage === 'prep' && prepGrades.map(g => <option key={g} value={g}>{g}</option>)}
              {selectedStage === 'secondary' && secondaryGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="card" style={{ padding: 16 }}>
        <input
          className="input"
          placeholder={activeTab === 'student' ? "🔍 ابحث باسم الطالب، رقم الفون، المادة، أو المدرس..." : "🔍 ابحث باسم المتدرب، رقم الفون، التخصص، أو المدرب..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Results Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{activeTab === 'student' ? '🎓' : '🏋️'}</div>
          <p className="empty-state-text">لا يوجد نتائج مطابقة لهذه الشروط</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{activeTab === 'student' ? 'اسم الطالب' : 'اسم المتدرب'}</th>
                <th>{activeTab === 'student' ? 'المادة والمدرس' : 'التخصص والمدرب'}</th>
                <th>رقم الهاتف</th>
                <th>قيمة الاشتراك</th>
                <th>حالة الدفع</th>
                {paymentStatus === 'partial' && <th>المتبقي</th>}
                <th>تقرير واتساب</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((st) => (
                <tr key={st.id}>
                  <td style={{ fontWeight: 700 }}>
                    <div>{st.name}</div>
                    {activeTab === 'student' && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{st.grade}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{st.subjectName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {st.type === 'trainee' ? `🏋️ ${st.teacherName}` : `👨‍🏫 ${st.teacherName}`}
                    </div>
                  </td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{st.parentPhone || st.phone}</td>
                  <td>{st.monthlyFee} ج.م</td>
                  <td>
                    {st.paymentStatus === 'paid' ? (
                      <span className="badge badge-success">تم الدفع بالكامل</span>
                    ) : st.paymentStatus === 'partial' ? (
                      <span className="badge badge-orange">دفع جزئي</span>
                    ) : (
                      <span className="badge badge-danger">لم يسدد بعد</span>
                    )}
                  </td>
                  {paymentStatus === 'partial' && (
                    <td style={{ fontWeight: 700, color: 'var(--error)' }}>{st.remainingAmount} ج.م</td>
                  )}
                  <td>
                    <button
                      className="btn btn-sm"
                      title="إرسال التقرير الشامل على واتساب"
                      onClick={() => openStudentWhatsAppReport(st)}
                      style={{
                        background: '#25D366',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <span>📱</span> إرسال التقرير
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
