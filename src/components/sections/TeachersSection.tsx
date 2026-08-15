'use client';

import { useState, useEffect, useCallback } from 'react';
import PDFReport from '../PDFReport';

interface TeacherStaff {
  id: string;
  name: string;
  phone: string;
  type: 'teacher' | 'trainer';
  subjectName: string;
  roomId: string;
  roomName: string;
  teacherPercentage: number;
  academyPercentage: number;
  balance: number;
  studentCount: number;
  totalAttendance: number;
  presentCount: number;
  absentCount: number;
  grades: string[];
}

interface RoomOption {
  _id: string;
  name: string;
}

interface TeachersSectionProps {
  staffType: 'teacher' | 'trainer';
  userRole: string;
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

export default function TeachersSection({ staffType, userRole }: TeachersSectionProps) {
  const [staffList, setStaffList] = useState<TeacherStaff[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Views
  const [currentView, setCurrentView] = useState<'list' | 'profile'>('list');
  const [selectedStaff, setSelectedStaff] = useState<TeacherStaff | null>(null);
  const [teacherStudents, setTeacherStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch] = useState('');

  // Profile stage navigation states
  const [profileView, setProfileView] = useState<'stages' | 'students'>('stages');
  const [selectedProfileStage, setSelectedProfileStage] = useState<'primary' | 'prep' | 'secondary' | ''>('');
  const [selectedProfileGrade, setSelectedProfileGrade] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().substring(0, 10));
  const [bulkAttendance, setBulkAttendance] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [showSingleAttModal, setShowSingleAttModal] = useState(false);
  const [singleAttForm, setSingleAttForm] = useState({
    studentId: '',
    studentName: '',
    status: 'present' as 'present' | 'absent' | 'excused',
    date: new Date().toISOString().substring(0, 10),
    notes: ''
  });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  // Student Payment Modal (Inside Teacher Profile)
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<any>(null);
  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentType: 'monthly' as 'session' | 'monthly',
    paymentReason: '',
    remainingAmount: 0,
    remainingReason: '',
    status: 'paid' as 'paid' | 'unpaid' | 'partial',
  });

  // Add Student/Trainee Modal (Inside Teacher/Trainer Profile)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentForm, setAddStudentForm] = useState({
    name: '',
    phone: '',
    parentPhone: '',
    monthlyFee: 0,
    paymentStatus: 'unpaid' as 'paid' | 'unpaid',
  });
  const [addingStudent, setAddingStudent] = useState(false);

  // Student Profile Modal
  const [showStudentProfileModal, setShowStudentProfileModal] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<any>(null);
  const [studentProfileData, setStudentProfileData] = useState<any[]>([]);
  const [loadingStudentProfile, setLoadingStudentProfile] = useState(false);

  const openStudentProfile = async (student: any) => {
    setSelectedStudentForProfile(student);
    setStudentProfileData([]);
    setShowStudentProfileModal(true);
    setLoadingStudentProfile(true);
    try {
      const res = await fetch(`/api/attendance?studentId=${student.id}`);
      if (res.ok) {
        const data = await res.json();
        setStudentProfileData(data.attendance || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudentProfile(false);
    }
  };

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Forms
  const [staffForm, setStaffForm] = useState({
    id: '',
    name: '',
    phone: '',
    subjectName: '',
    roomId: '',
    teacherPercentage: 60,
    academyPercentage: 40,
    balance: 0,
    grades: [] as string[],
  });

  const [attForm, setAttForm] = useState({ status: 'present' as 'present' | 'absent', date: new Date().toISOString().substring(0, 10), notes: '' });
  const [loanForm, setLoanForm] = useState({ amount: 500, reason: 'سلفة مالية', date: new Date().toISOString().substring(0, 10) });

  const labelTitle = staffType === 'teacher' ? 'المدرسين' : 'المدربين';
  const labelSingle = staffType === 'teacher' ? 'مدرس' : 'مدرب';
  const iconEmoji = staffType === 'teacher' ? '👨‍🏫' : '🏋️';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resSt, resRm] = await Promise.all([
        fetch(`/api/teachers?type=${staffType}`),
        fetch('/api/rooms'),
      ]);
      if (resSt.ok) {
        const d = await resSt.json();
        setStaffList(d.teachers || []);
        if (selectedStaff) {
          const updated = d.teachers.find((s: TeacherStaff) => s.id === selectedStaff.id);
          if (updated) setSelectedStaff(updated);
        }
      }
      if (resRm.ok) {
        const d = await resRm.json();
        setRooms(d.rooms || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [staffType, selectedStaff]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffType]); 

  const refreshList = async () => {
    try {
      const resSt = await fetch(`/api/teachers?type=${staffType}`);
      if (resSt.ok) {
        const d = await resSt.json();
        setStaffList(d.teachers || []);
        if (selectedStaff) {
          const updated = d.teachers.find((s: TeacherStaff) => s.id === selectedStaff.id);
          if (updated) setSelectedStaff(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTeacherStudents = async (teacherId: string) => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/teachers/${teacherId}/students`);
      if (res.ok) {
        const data = await res.json();
        const students = data.students || [];
        setTeacherStudents(students);
        if (staffType === 'trainer') {
          initializeBulkAttendance(null, students);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Save / Edit Staff
  const handleSaveStaff = async () => {
    if (!staffForm.name || !staffForm.phone || !staffForm.subjectName) {
      showToast('يرجى ملء الاسم ورقم الهاتف والمادة/التخصص', 'error');
      return;
    }

    const method = staffForm.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/teachers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...staffForm,
          type: staffType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(staffForm.id ? `تم تعديل ${labelSingle}` : `تم إضافة ${labelSingle} بنجاح`);
        setShowAddModal(false);
        refreshList();
      } else {
        showToast(data.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Delete Staff
  const handleDeleteStaff = async (id: string) => {
    if (!confirm(`هل تريد حذف هذا الـ ${labelSingle} نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/teachers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStaffList(staffList.filter(s => s.id !== id));
        showToast('تم الحذف بنجاح');
        if (selectedStaff?.id === id) setSelectedStaff(null);
        refreshList();
      } else {
        const d = await res.json();
        showToast(d.error || 'خطأ أثناء الحذف', 'error');
      }
    } catch {
      showToast('خطأ بالحذف', 'error');
    }
  };

  const handleSaveSingleAttendance = async () => {
    if (!singleAttForm.studentId) return;
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: singleAttForm.studentId,
          teacherId: selectedStaff?.id,
          status: singleAttForm.status,
          date: singleAttForm.date,
          notes: singleAttForm.notes,
        }),
      });
      if (res.ok) {
        showToast('تم تسجيل الحضور اليومي بنجاح');
        setShowSingleAttModal(false);
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل تسجيل الحضور', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء التسجيل', 'error');
    }
  };

  // Record Attendance for staff
  const handleSaveAttendance = async () => {
    if (!selectedStaff) return;
    try {
      const res = await fetch('/api/teachers/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedStaff.id,
          date: attForm.date,
          status: attForm.status,
          notes: attForm.notes,
        }),
      });
      if (res.ok) {
        showToast(`تم تسجيل حضور ${labelSingle}`);
        setShowAttModal(false);
        refreshList();
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  // Add Loan / Advance Payment
  const handleSaveLoan = async () => {
    if (!selectedStaff || !loanForm.amount) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: loanForm.amount,
          date: loanForm.date,
          reason: `سلفة ${labelSingle}: ${selectedStaff.name} - ${loanForm.reason}`,
          type: 'teacher_loan',
          teacherId: selectedStaff.id,
        }),
      });
      if (res.ok) {
        showToast(`تم تسجيل السلفة وتحديث رصيد الـ ${labelSingle}`);
        setShowLoanModal(false);
        refreshList();
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  const handleResetLoan = async () => {
    if (!selectedStaff || selectedStaff.balance >= 0) return;
    if (!confirm('هل أنت متأكد من إزالة السلفة وتصفير الرصيد؟')) return;
    
    try {
      const res = await fetch(`/api/teachers/${selectedStaff.id}/reset-loan`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'تم إزالة السلفة بنجاح');
        refreshList();
      } else {
        showToast(data.error || 'حدث خطأ أثناء إزالة السلفة', 'error');
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  const handleSaveStudentPayment = async () => {
    if (!selectedStudentForPay || !selectedStaff) return;
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentForPay.id,
          month: currentMonth,
          amount: payForm.amount,
          paymentType: payForm.paymentType,
          paymentReason: payForm.paymentReason,
          remainingAmount: payForm.remainingAmount,
          remainingReason: payForm.remainingReason,
          status: payForm.status,
        }),
      });
      if (res.ok) {
        showToast('تم تحديث حالة دفع الطالب');
        setShowPayModal(false);
        loadTeacherStudents(selectedStaff.id); // refresh students list
        refreshList(); // refresh teacher balance
      }
    } catch {
      showToast('خطأ في التحديث', 'error');
    }
  };

  // Add Student/Trainee inside teacher profile
  const handleAddStudent = async () => {
    if (!selectedStaff) return;
    if (!addStudentForm.name || !addStudentForm.phone) {
      showToast('يرجى إدخال اسم الطالب ورقم الفون على الأقل', 'error');
      return;
    }
    setAddingStudent(true);
    try {
      const isTrainer = staffType === 'trainer';
      const gradeValue = isTrainer ? 'متدرب' : selectedProfileGrade;
      const studentType = isTrainer ? 'trainee' : 'student';
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addStudentForm.name,
          phone: addStudentForm.phone,
          parentPhone: addStudentForm.parentPhone || addStudentForm.phone,
          subjectName: selectedStaff.subjectName,
          teacherId: selectedStaff.id,
          grade: gradeValue,
          monthlyFee: addStudentForm.monthlyFee,
          type: studentType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // If paid, register payment immediately
        if (addStudentForm.paymentStatus === 'paid' && addStudentForm.monthlyFee > 0) {
          const currentMonth = new Date().toISOString().substring(0, 7);
          await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: data.student._id,
              month: currentMonth,
              amount: addStudentForm.monthlyFee,
              paymentType: 'monthly',
              paymentReason: 'دفع عند التسجيل',
              remainingAmount: 0,
              remainingReason: '',
              status: 'paid',
            }),
          });
        }
        showToast(`تم إضافة ${isTrainer ? 'المتدرب' : 'الطالب'} بنجاح ✅`);
        setShowAddStudentModal(false);
        setAddStudentForm({ name: '', phone: '', parentPhone: '', monthlyFee: 0, paymentStatus: 'unpaid' });
        loadTeacherStudents(selectedStaff.id);
        refreshList();
      } else {
        showToast(data.error || 'حدث خطأ أثناء الإضافة', 'error');
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setAddingStudent(false);
    }
  };

  // Delete Student/Trainee from teacher profile
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!selectedStaff) return;
    const isTrainer = staffType === 'trainer';
    if (!confirm(`هل تريد حذف ${isTrainer ? 'المتدرب' : 'الطالب'} "${studentName}" نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/students?id=${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`تم حذف ${isTrainer ? 'المتدرب' : 'الطالب'} بنجاح`);
        loadTeacherStudents(selectedStaff.id);
        refreshList();
      } else {
        const d = await res.json();
        showToast(d.error || 'خطأ أثناء الحذف', 'error');
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const initializeBulkAttendance = (grade: string | null, students: any[]) => {
    const initialMap: Record<string, 'present' | 'absent' | 'excused'> = {};
    const filtered = grade ? students.filter(st => st.grade === grade) : students;
    filtered.forEach(st => {
      initialMap[st.id] = 'present';
    });
    setBulkAttendance(initialMap);
  };

  const handleSaveBulkAttendance = async () => {
    const studentsInGrade = staffType === 'trainer' ? teacherStudents : teacherStudents.filter(ts => ts.grade === selectedProfileGrade);
    if (studentsInGrade.length === 0) return;
    
    setSavingAttendance(true);
    try {
      const promises = studentsInGrade.map(st => {
        const status = bulkAttendance[st.id] || 'present';
        return fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: st.id,
            date: attendanceDate,
            status,
            notes: staffType === 'trainer' ? 'تسجيل جماعي من صفحة المدرب' : 'تسجيل جماعي من صفحة المدرس',
          }),
        });
      });
      
      const results = await Promise.all(promises);
      const allOk = results.every(res => res.ok);
      if (allOk) {
        showToast('تم حفظ حضور وغياب طلاب الصف بنجاح');
        loadTeacherStudents(selectedStaff!.id); // reload student counts/data
      } else {
        showToast('فشل حفظ بعض سجلات الحضور', 'error');
      }
    } catch (err) {
      showToast('خطأ بالخادم أثناء حفظ الحضور', 'error');
    } finally {
      setSavingAttendance(false);
    }
  };

  const isAdmin = userRole === 'admin';
  const filteredStaff = staffList.filter(s => s.name.includes(search) || s.phone.includes(search) || s.subjectName.includes(search));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {currentView === 'list' ? (
        <>
          {/* Header */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>
                {iconEmoji} إدارة {labelTitle}
              </h1>
              <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                متابعة {labelTitle}، الطلاب، الحضور والغياب، والحسابات
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => {
              setStaffForm({ id: '', name: '', phone: '', subjectName: '', roomId: '', teacherPercentage: 60, academyPercentage: 40, balance: 0, grades: [] });
              setShowAddModal(true);
            }}>
              + إضافة {labelSingle} جديد
            </button>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <input
              className="input"
              placeholder={`🔍 ابحث باسم ال${labelSingle}، رقم الهاتف، أو المادة...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Staff List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{iconEmoji}</div>
              <p className="empty-state-text">لا يوجد {labelTitle} مسجلين بعد</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>اسم {labelSingle}</th>
                    <th>المادة / التخصص</th>
                    <th>القاعة</th>
                    <th>عدد الطلاب</th>
                    {isAdmin && <th>نسبة {labelSingle} / الأكاديمية</th>}
                    {isAdmin && <th>الرصيد / السلف</th>}
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((st) => (
                    <tr key={st.id} style={{ cursor: 'pointer' }} onClick={() => { 
                      setSelectedStaff(st); 
                      setCurrentView('profile'); 
                      loadTeacherStudents(st.id); 
                    }}>
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ color: 'var(--text-primary)' }}>{st.name}</div>
                        <div dir="ltr" style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{st.phone}</div>
                      </td>
                      <td>
                        <span className="badge badge-orange">{st.subjectName}</span>
                      </td>
                      <td>🏫 {st.roomName}</td>
                      <td><strong style={{ color: 'var(--accent-orange)' }}>{st.studentCount} طالب</strong></td>
                      {isAdmin && (
                        <td>
                          <span style={{ color: 'var(--success)', fontWeight: 700 }}>{st.teacherPercentage}%</span> / <span style={{ color: 'var(--text-muted)' }}>{st.academyPercentage}%</span>
                        </td>
                      )}
                      {isAdmin && (
                        <td>
                          {st.balance < 0 ? (
                            <span style={{ color: 'var(--error)', fontWeight: 700 }}>سالف {-st.balance} ج.م</span>
                          ) : (
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>مستحق {st.balance} ج.م</span>
                          )}
                        </td>
                      )}
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedStaff(st); 
                          setCurrentView('profile'); 
                          setProfileView('stages');
                          setSelectedProfileStage('');
                          setSelectedProfileGrade('');
                          loadTeacherStudents(st.id); 
                        }}>
                          فتح الملف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* ================== PROFILE VIEW ================== */
        selectedStaff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' }}>
            {/* Header */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-icon" onClick={() => { setCurrentView('list'); setSelectedStaff(null); setTeacherStudents([]); }}>
                ←
              </button>
              <div>
                <h1 className="page-title" style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>ملف الـ {labelSingle}: {selectedStaff.name}</h1>
                <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>مادة: {selectedStaff.subjectName} — قاعة: {selectedStaff.roomName}</p>
              </div>
              <div style={{ marginRight: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => setShowAttModal(true)}>📅 تسجيل حضور</button>
                {isAdmin && <button className="btn btn-secondary" onClick={() => setShowLoanModal(true)}>💸 إضافة سلفة</button>}
                {isAdmin && selectedStaff?.balance < 0 && (
                  <button className="btn btn-ghost" style={{ color: 'var(--accent-orange)' }} onClick={handleResetLoan}>💸 إزالة السلفة</button>
                )}
                <button className="btn btn-secondary" onClick={() => setShowPdf(true)}>📄 تصدير PDF</button>
                <button className="btn btn-secondary" onClick={() => {
                  setStaffForm({
                    id: selectedStaff.id,
                    name: selectedStaff.name,
                    phone: selectedStaff.phone,
                    subjectName: selectedStaff.subjectName,
                    roomId: selectedStaff.roomId,
                    teacherPercentage: selectedStaff.teacherPercentage,
                    academyPercentage: selectedStaff.academyPercentage,
                    balance: selectedStaff.balance,
                    grades: selectedStaff.grades || [],
                  });
                  setShowAddModal(true);
                }}>✏️ تعديل</button>
                {isAdmin && (
                  <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDeleteStaff(selectedStaff.id)}>🗑️</button>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid-4">
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>عدد الطلاب الفعلي</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-orange)' }}>{teacherStudents.length} طلاب</div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>أيام الحضور</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{selectedStaff.presentCount} يوم</div>
              </div>
              {isAdmin && (
                <>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>النسبة المتفق عليها</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-gold)' }}>{selectedStaff.teacherPercentage}% لكم</div>
                  </div>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>الرصيد المالي الحالي</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: selectedStaff.balance < 0 ? 'var(--error)' : 'var(--success)' }}>
                      {selectedStaff.balance} ج.م
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Teacher's/Trainer's Students Table */}
            {staffType === 'trainer' ? (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>🏋️ قائمة متدربي المدرب ({teacherStudents.length}) ومتابعة الدفع</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setAddStudentForm({ name: '', phone: '', parentPhone: '', monthlyFee: 0, paymentStatus: 'unpaid' });
                    setShowAddStudentModal(true);
                  }}>➕ إضافة متدرب</button>
                </div>
                {loadingStudents ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ width: 30, height: 30 }} />
                  </div>
                ) : teacherStudents.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد متدربين مسجلين مع هذا الـ {labelSingle}</div>
                ) : (
                  <>
                  <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>اسم المتدرب</th>
                          <th>الدفع الفعلي / المطلوب</th>
                          <th>حالة الدفع (الشهر الحالي)</th>
                          <th>نظام الدفع</th>
                          <th>واتساب</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherStudents.map(ts => {
                          const waPhone = (ts.parentPhone || ts.phone || '').startsWith('0') ? `+2${ts.parentPhone || ts.phone}` : (ts.parentPhone || ts.phone || '');
                          return (
                          <tr key={ts.id}>
                            <td style={{ fontWeight: 700 }}>{ts.name}</td>
                            <td>
                              <strong style={{ color: 'var(--success)' }}>{ts.paymentAmount} ج.م</strong> 
                              <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span> 
                              {ts.monthlyFee} ج.م
                            </td>
                            <td>
                              {ts.paymentStatus === 'paid' ? (
                                <span className="badge badge-success">تم الدفع</span>
                              ) : ts.paymentStatus === 'partial' ? (
                                <span className="badge badge-orange">جزئي (متبقي {ts.remainingAmount})</span>
                              ) : (
                                <span className="badge badge-danger">لم يدفع</span>
                              )}
                            </td>
                            <td>
                              {ts.paymentType === 'session' ? (
                                <span className="badge badge-info">بالحصة ⏱️</span>
                              ) : (
                                <span className="badge badge-secondary">بالشهر 📅</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {waPhone ? (
                                  <a
                                    href={`https://wa.me/${waPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`مراسلة ${ts.name} على واتساب`}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: 32, height: 32, borderRadius: '50%',
                                      background: '#25D366', color: 'white',
                                      textDecoration: 'none',
                                      boxShadow: '0 2px 6px rgba(37,211,102,0.4)',
                                      transition: 'transform 0.15s, box-shadow 0.15s'
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.15)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'; }}
                                  >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                  </a>
                                ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  title="تسجيل الحضور اليومي"
                                  style={{ padding: '6px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => {
                                    setSingleAttForm({
                                      studentId: ts.id,
                                      studentName: ts.name,
                                      status: 'present',
                                      date: new Date().toISOString().substring(0, 10),
                                      notes: ''
                                    });
                                    setShowSingleAttModal(true);
                                  }}
                                >
                                  📅
                                </button>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                  setSelectedStudentForPay(ts);
                                  setPayForm({
                                    amount: ts.monthlyFee,
                                    paymentType: ts.paymentType || 'monthly',
                                    paymentReason: ts.paymentType === 'session' ? 'دفع حصة' : 'اشتراك شهري',
                                    remainingAmount: 0,
                                    remainingReason: '',
                                    status: 'paid'
                                  });
                                  setShowPayModal(true);
                                }}>
                                  تسجيل دفع
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--error)', padding: '4px 8px', fontSize: 16 }}
                                  title={staffType === 'trainer' ? 'حذف المتدرب' : 'حذف الطالب'}
                                  onClick={() => handleDeleteStudent(ts.id, ts.name)}
                                >
                                  🗑️
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  title="ملف الطالب"
                                  onClick={() => openStudentProfile(ts)}
                                  style={{ padding: '4px 8px', fontSize: 14 }}
                                >
                                  📄 ملف
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Bulk Attendance Section for Trainer */}
                  <div style={{ padding: 20, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      📅 تسجيل حضور وغياب المتدربين دفعة واحدة
                    </h3>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: 13 }}>تاريخ الحصة *</label>
                        <input className="input" type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} style={{ padding: '8px 12px', fontSize: 14 }} />
                      </div>
                    </div>
                    
                    <div className="table-wrapper" style={{ maxHeight: 250, overflowY: 'auto', marginBottom: 16 }}>
                      <table style={{ background: 'var(--bg-card)' }}>
                        <thead>
                          <tr>
                            <th>اسم المتدرب</th>
                            <th>تحديد الحالة اليومية</th>
                            <th>واتساب ولي الأمر</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacherStudents.map(st => {
                            const waPhone = (st.parentPhone || st.phone || '').startsWith('0') ? `+2${st.parentPhone || st.phone}` : (st.parentPhone || st.phone || '');
                            const attStatus = bulkAttendance[st.id] || 'present';
                            const absMsg = encodeURIComponent(`السلام عليكم، نود إعلامكم بأن ${st.name} كان${attStatus === 'absent' ? ' غائباً' : ' مستأذناً'} اليوم بتاريخ ${attendanceDate} في حصة التدريب. نرجو التواصل معنا. شكراً - أكاديمية سكاي`);
                            return (
                            <tr key={st.id} style={{ background: attStatus === 'absent' ? 'rgba(239,68,68,0.05)' : attStatus === 'excused' ? 'rgba(255,107,0,0.05)' : 'transparent', transition: 'background 0.2s' }}>
                              <td style={{ fontWeight: 700 }}>{st.name}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 14 }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="radio" name={`bulk-att-${st.id}`} checked={bulkAttendance[st.id] === 'present'} onChange={() => setBulkAttendance({ ...bulkAttendance, [st.id]: 'present' })} />
                                    حاضر ✅
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="radio" name={`bulk-att-${st.id}`} checked={bulkAttendance[st.id] === 'absent'} onChange={() => setBulkAttendance({ ...bulkAttendance, [st.id]: 'absent' })} />
                                    غائب ❌
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="radio" name={`bulk-att-${st.id}`} checked={bulkAttendance[st.id] === 'excused'} onChange={() => setBulkAttendance({ ...bulkAttendance, [st.id]: 'excused' })} />
                                    مستأذن ⚠️
                                  </label>
                                </div>
                              </td>
                              <td>
                                {waPhone ? (
                                  <a
                                    href={attStatus !== 'present' ? `https://wa.me/${waPhone}?text=${absMsg}` : `https://wa.me/${waPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={attStatus !== 'present' ? `إرسال إشعار غياب لولي أمر ${st.name}` : `مراسلة ولي أمر ${st.name}`}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 5,
                                      padding: '5px 10px', borderRadius: 20,
                                      background: attStatus !== 'present' ? '#25D366' : '#e8f5e9',
                                      color: attStatus !== 'present' ? 'white' : '#25D366',
                                      fontSize: 13, fontWeight: 700, textDecoration: 'none',
                                      border: '1px solid #25D366',
                                      boxShadow: attStatus !== 'present' ? '0 2px 8px rgba(37,211,102,0.4)' : 'none',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.05)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'; }}
                                  >
                                    <span style={{ fontSize: 16 }}>📱</span>
                                    {attStatus !== 'present' ? 'إرسال إشعار غياب' : 'مراسلة'}
                                  </a>
                                ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>لا يوجد رقم</span>}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <button className="btn btn-primary" onClick={handleSaveBulkAttendance} disabled={savingAttendance || teacherStudents.length === 0}>
                      {savingAttendance ? 'جاري حفظ سجلات الحضور...' : 'حفظ سجل حضور وغياب المتدربين'}
                    </button>
                  </div>
                  </>
                )}
              </div>
            ) : (
              // Teacher view: Stage and Grade selection or grade student table
              profileView === 'stages' ? (
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>🏫 اختر المرحلة العمرية والدراسية لمتابعة الحضور والغياب والطلاب</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    {/* Primary Card */}
                    {(selectedStaff.grades || []).some(g => primaryGrades.includes(g)) && (
                      <div 
                        className="card card-hover" 
                        style={{ cursor: 'pointer', padding: 20, border: selectedProfileStage === 'primary' ? '2px solid var(--accent-orange)' : '1px solid var(--border)', background: 'var(--bg-elevated)', textAlign: 'center', transition: 'all 0.2s' }} 
                        onClick={() => setSelectedProfileStage('primary')}
                      >
                        <span style={{ fontSize: 40 }}>🎒</span>
                        <h4 style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>المرحلة الابتدائية</h4>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>الصفوف من أولى ابتدائي لغاية سادسة</p>
                      </div>
                    )}

                    {/* Prep Card */}
                    {(selectedStaff.grades || []).some(g => prepGrades.includes(g)) && (
                      <div 
                        className="card card-hover" 
                        style={{ cursor: 'pointer', padding: 20, border: selectedProfileStage === 'prep' ? '2px solid var(--accent-orange)' : '1px solid var(--border)', background: 'var(--bg-elevated)', textAlign: 'center', transition: 'all 0.2s' }} 
                        onClick={() => setSelectedProfileStage('prep')}
                      >
                        <span style={{ fontSize: 40 }}>🏫</span>
                        <h4 style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>المرحلة الإعدادية</h4>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>الصفوف من أولى إعدادي لغاية تالتة إعدادي</p>
                      </div>
                    )}

                    {/* Secondary Card */}
                    {(selectedStaff.grades || []).some(g => secondaryGrades.includes(g)) && (
                      <div 
                        className="card card-hover" 
                        style={{ cursor: 'pointer', padding: 20, border: selectedProfileStage === 'secondary' ? '2px solid var(--accent-orange)' : '1px solid var(--border)', background: 'var(--bg-elevated)', textAlign: 'center', transition: 'all 0.2s' }} 
                        onClick={() => setSelectedProfileStage('secondary')}
                      >
                        <span style={{ fontSize: 40 }}>🎓</span>
                        <h4 style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>المرحلة الثانوية</h4>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>الصفوف من أولى ثانوي لغاية تالتة ثانوي</p>
                      </div>
                    )}

                    {!(selectedStaff.grades || []).length && (
                      <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
                        ⚠️ لم يتم ربط المدرس بأي مرحلة أو صف دراسي بعد. يرجى الضغط على زر "تعديل" وتحديد صفوف المدرس.
                      </div>
                    )}
                  </div>

                  {selectedProfileStage && (
                    <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>اختر الصف الدراسي:</h4>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {(selectedStaff.grades || [])
                          .filter(g => {
                            if (selectedProfileStage === 'primary') return primaryGrades.includes(g);
                            if (selectedProfileStage === 'prep') return prepGrades.includes(g);
                            if (selectedProfileStage === 'secondary') return secondaryGrades.includes(g);
                            return false;
                          })
                          .map(grade => (
                            <button
                              key={grade}
                              className="btn btn-secondary"
                              onClick={() => {
                                setSelectedProfileGrade(grade);
                                setProfileView('students');
                                initializeBulkAttendance(grade, teacherStudents);
                              }}
                            >
                              {grade}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Students List and Bulk Attendance for selected grade
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 800 }}>👨‍🎓 طلاب {selectedProfileGrade} للمدرس ({teacherStudents.filter(ts => ts.grade === selectedProfileGrade).length} طلاب)</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        setAddStudentForm({ name: '', phone: '', parentPhone: '', monthlyFee: 0, paymentStatus: 'unpaid' });
                        setShowAddStudentModal(true);
                      }}>➕ إضافة طالب</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setProfileView('stages'); setSelectedProfileGrade(''); }}>
                        ← عودة للمراحل التعليمية
                      </button>
                    </div>
                  </div>
                  {loadingStudents ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div className="spinner" style={{ width: 30, height: 30 }} />
                    </div>
                  ) : teacherStudents.filter(ts => ts.grade === selectedProfileGrade).length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد طلاب مسجلين في هذا الصف مع المدرس</div>
                  ) : (
                    <>
                      <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                        <table>
                          <thead>
                            <tr>
                              <th>اسم الطالب</th>
                              <th>الدفع الفعلي / المطلوب</th>
                              <th>حالة الدفع (الشهر الحالي)</th>
                              <th>نظام الدفع</th>
                              <th>واتساب</th>
                              <th>الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teacherStudents.filter(ts => ts.grade === selectedProfileGrade).map(ts => {
                              const waPhone = (ts.parentPhone || ts.phone || '').startsWith('0') ? `+2${ts.parentPhone || ts.phone}` : (ts.parentPhone || ts.phone || '');
                              return (
                              <tr key={ts.id}>
                                <td style={{ fontWeight: 700 }}>{ts.name}</td>
                                <td>
                                  <strong style={{ color: 'var(--success)' }}>{ts.paymentAmount} ج.م</strong> 
                                  <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span> 
                                  {ts.monthlyFee} ج.م
                                </td>
                                <td>
                                  {ts.paymentStatus === 'paid' ? (
                                    <span className="badge badge-success">تم الدفع</span>
                                  ) : ts.paymentStatus === 'partial' ? (
                                    <span className="badge badge-orange">جزئي (متبقي {ts.remainingAmount})</span>
                                  ) : (
                                    <span className="badge badge-danger">لم يدفع</span>
                                  )}
                                </td>
                                <td>
                                  {ts.paymentType === 'session' ? (
                                    <span className="badge badge-info">بالحصة ⏱️</span>
                                  ) : (
                                    <span className="badge badge-secondary">بالشهر 📅</span>
                                  )}
                                </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                      {waPhone ? (
                                        <a
                                          href={`https://wa.me/${waPhone}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title={`مراسلة ${ts.name} على واتساب`}
                                          style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: '#25D366', color: 'white',
                                            textDecoration: 'none',
                                            boxShadow: '0 2px 6px rgba(37,211,102,0.4)',
                                            transition: 'transform 0.15s, box-shadow 0.15s'
                                          }}
                                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.15)'; }}
                                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'; }}
                                        >
                                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        </a>
                                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                      
                                      <button 
                                        className="btn btn-secondary btn-sm"
                                        title="تسجيل الحضور اليومي"
                                        style={{ padding: '6px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => {
                                          setSingleAttForm({
                                            studentId: ts.id,
                                            studentName: ts.name,
                                            status: 'present',
                                            date: new Date().toISOString().substring(0, 10),
                                            notes: ''
                                          });
                                          setShowSingleAttModal(true);
                                        }}
                                      >
                                        📅
                                      </button>
                                    </div>
                                  </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => {
                                      setSelectedStudentForPay(ts);
                                      setPayForm({
                                        amount: ts.monthlyFee,
                                        paymentType: ts.paymentType || 'monthly',
                                        paymentReason: ts.paymentType === 'session' ? 'دفع حصة' : 'اشتراك شهري',
                                        remainingAmount: 0,
                                        remainingReason: '',
                                        status: 'paid'
                                      });
                                      setShowPayModal(true);
                                    }}>
                                      تسجيل دفع
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      style={{ color: 'var(--error)', padding: '4px 8px', fontSize: 16 }}
                                      title="حذف الطالب"
                                      onClick={() => handleDeleteStudent(ts.id, ts.name)}
                                    >
                                      🗑️
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      title="ملف الطالب"
                                      onClick={() => openStudentProfile(ts)}
                                      style={{ padding: '4px 8px', fontSize: 14 }}
                                    >
                                      📄 ملف
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Bulk Attendance Section */}
                      <div style={{ padding: 20, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          📅 تسجيل حضور وغياب الصف دفعة واحدة
                        </h3>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label" style={{ fontSize: 13 }}>تاريخ الحصة *</label>
                            <input className="input" type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} style={{ padding: '8px 12px', fontSize: 14 }} />
                          </div>
                        </div>
                        
                        <div className="table-wrapper" style={{ maxHeight: 250, overflowY: 'auto', marginBottom: 16 }}>
                          <table style={{ background: 'var(--bg-card)' }}>
                            <thead>
                              <tr>
                                <th>اسم الطالب</th>
                                <th>تحديد الحالة اليومية</th>
                                <th>واتساب ولي الأمر</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherStudents.filter(ts => ts.grade === selectedProfileGrade).map(st => {
                                const waPhone = (st.parentPhone || st.phone || '').startsWith('0') ? `+2${st.parentPhone || st.phone}` : (st.parentPhone || st.phone || '');
                                const attStatus = bulkAttendance[st.id] || 'present';
                                const absMsg = encodeURIComponent(`السلام عليكم، نود إعلامكم بأن ${st.name} كان${attStatus === 'absent' ? ' غائباً' : ' مستأذناً'} اليوم بتاريخ ${attendanceDate} في حصة المادة. نرجو التواصل معنا. شكراً - أكاديمية سكاي`);
                                return (
                                <tr key={st.id} style={{ background: attStatus === 'absent' ? 'rgba(239,68,68,0.05)' : attStatus === 'excused' ? 'rgba(255,107,0,0.05)' : 'transparent', transition: 'background 0.2s' }}>
                                  <td style={{ fontWeight: 700 }}>{st.name}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 14 }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                                        <input type="radio" name={`bulk-att-${st.id}`} checked={bulkAttendance[st.id] === 'present'} onChange={() => setBulkAttendance({ ...bulkAttendance, [st.id]: 'present' })} />
                                        حاضر ✅
                                      </label>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                                        <input type="radio" name={`bulk-att-${st.id}`} checked={bulkAttendance[st.id] === 'absent'} onChange={() => setBulkAttendance({ ...bulkAttendance, [st.id]: 'absent' })} />
                                        غائب ❌
                                      </label>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                                        <input type="radio" name={`bulk-att-${st.id}`} checked={bulkAttendance[st.id] === 'excused'} onChange={() => setBulkAttendance({ ...bulkAttendance, [st.id]: 'excused' })} />
                                        مستأذن ⚠️
                                      </label>
                                    </div>
                                  </td>
                                  <td>
                                    {waPhone ? (
                                      <a
                                        href={attStatus !== 'present' ? `https://wa.me/${waPhone}?text=${absMsg}` : `https://wa.me/${waPhone}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={attStatus !== 'present' ? `إرسال إشعار غياب لولي أمر ${st.name}` : `مراسلة ولي أمر ${st.name}`}
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', gap: 5,
                                          padding: '5px 10px', borderRadius: 20,
                                          background: attStatus !== 'present' ? '#25D366' : '#e8f5e9',
                                          color: attStatus !== 'present' ? 'white' : '#25D366',
                                          fontSize: 13, fontWeight: 700, textDecoration: 'none',
                                          border: '1px solid #25D366',
                                          boxShadow: attStatus !== 'present' ? '0 2px 8px rgba(37,211,102,0.4)' : 'none',
                                          transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.05)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'; }}
                                      >
                                        <span style={{ fontSize: 16 }}>📱</span>
                                        {attStatus !== 'present' ? 'إرسال إشعار غياب' : 'مراسلة'}
                                      </a>
                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>لا يوجد رقم</span>}
                                  </td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        
                        <button className="btn btn-primary" onClick={handleSaveBulkAttendance} disabled={savingAttendance || teacherStudents.filter(ts => ts.grade === selectedProfileGrade).length === 0}>
                          {savingAttendance ? 'جاري حفظ سجلات الحضور...' : 'حفظ سجل حضور وغياب الصف'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            )}
          </div>
        )
      )}

      {/* Modals are kept below for both views */}
      
      {/* Modal: Add / Edit Staff */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {staffForm.id ? `✏️ تعديل بيانات ${labelSingle}` : `${iconEmoji} إضافة ${labelSingle} جديد`}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">الاسم كامل *</label>
                <input className="input" placeholder="اسم المدرس/المدرب" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">رقم الهاتف *</label>
                  <input className="input" placeholder="01xxxxxxxxx" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">{staffType === 'trainer' ? 'التدريب *' : 'المادة / التخصص *'}</label>
                  <input className="input" placeholder={staffType === 'trainer' ? "مثال: كاراتيه، جمباز..." : "مثال: لغة عربية، فيزياء..."} value={staffForm.subjectName} onChange={(e) => setStaffForm({ ...staffForm, subjectName: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">القاعة الدراسية</label>
                <select className="input" value={staffForm.roomId} onChange={(e) => setStaffForm({ ...staffForm, roomId: e.target.value })}>
                  <option value="">اختر القاعة...</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {staffType === 'teacher' && (
                <div className="input-group">
                  <label className="input-label">المراحل والصفوف الدراسية التي يُدرسها المدرس *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    {/* Primary */}
                    <div>
                      <strong style={{ display: 'block', marginBottom: 4, color: 'var(--accent-orange)' }}>🎒 المرحلة الابتدائية</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {primaryGrades.map(g => (
                          <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={staffForm.grades.includes(g)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStaffForm({ ...staffForm, grades: [...staffForm.grades, g] });
                                } else {
                                  setStaffForm({ ...staffForm, grades: staffForm.grades.filter(x => x !== g) });
                                }
                              }}
                            />
                            {g.replace('الصف ', '')}
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Prep */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      <strong style={{ display: 'block', marginBottom: 4, color: 'var(--accent-gold)' }}>🏫 المرحلة الإعدادية</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {prepGrades.map(g => (
                          <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={staffForm.grades.includes(g)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStaffForm({ ...staffForm, grades: [...staffForm.grades, g] });
                                } else {
                                  setStaffForm({ ...staffForm, grades: staffForm.grades.filter(x => x !== g) });
                                }
                              }}
                            />
                            {g.replace('الصف ', '')}
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Secondary */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      <strong style={{ display: 'block', marginBottom: 4, color: 'var(--success)' }}>🎓 المرحلة الثانوية</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {secondaryGrades.map(g => (
                          <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={staffForm.grades.includes(g)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStaffForm({ ...staffForm, grades: [...staffForm.grades, g] });
                                } else {
                                  setStaffForm({ ...staffForm, grades: staffForm.grades.filter(x => x !== g) });
                                }
                              }}
                            />
                            {g.replace('الصف ', '')}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">نسبة الـ {labelSingle} (%)</label>
                    <input className="input" type="number" value={staffForm.teacherPercentage} onChange={(e) => {
                      const val = +e.target.value;
                      setStaffForm({ ...staffForm, teacherPercentage: val, academyPercentage: 100 - val });
                    }} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">نسبة الأكاديمية (%)</label>
                    <input className="input" type="number" value={staffForm.academyPercentage} readOnly style={{ opacity: 0.8 }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={handleSaveStaff} style={{ flex: 1 }}>حفظ البيانات</button>
                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttModal && selectedStaff && (
        <div className="modal-backdrop" onClick={() => setShowAttModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📅 حضور الـ {labelSingle}: {selectedStaff.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">التاريخ</label>
                <input className="input" type="date" value={attForm.date} onChange={(e) => setAttForm({ ...attForm, date: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">الحالة</label>
                <select className="input" value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value as any })}>
                  <option value="present">حاضر ✅</option>
                  <option value="absent">غائب ❌</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveAttendance} style={{ flex: 1 }}>حفظ الحضور</button>
                <button className="btn btn-ghost" onClick={() => setShowAttModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Modal */}
      {showLoanModal && selectedStaff && (
        <div className="modal-backdrop" onClick={() => setShowLoanModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>💸 تسجيل سلفة للـ {labelSingle}: {selectedStaff.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">مبلغ السلفة (ج.م) *</label>
                <input className="input" type="number" value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: +e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">التاريخ</label>
                <input className="input" type="date" value={loanForm.date} onChange={(e) => setLoanForm({ ...loanForm, date: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">ملاحظات / السبب</label>
                <input className="input" placeholder="سبب السلفة..." value={loanForm.reason} onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveLoan} style={{ flex: 1 }}>تسجيل السلفة</button>
                <button className="btn btn-ghost" onClick={() => setShowLoanModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Payment Modal inside Teacher Profile */}
      {showPayModal && selectedStudentForPay && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>💰 دفع مصاريف: {selectedStudentForPay.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">نظام الدفع</label>
                <select className="input" value={payForm.paymentType} onChange={(e) => setPayForm({ ...payForm, paymentType: e.target.value as any })}>
                  <option value="monthly">اشتراك شهري 📅</option>
                  <option value="session">دفع بالحصة ⏱️</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">حالة الدفع</label>
                <select className="input" value={payForm.status} onChange={(e) => setPayForm({ ...payForm, status: e.target.value as any })}>
                  <option value="paid">تم الدفع بالكامل ✅</option>
                  <option value="partial">دفع جزئي (متبقي فلوس) ⚠️</option>
                  <option value="unpaid">لم يدفع ❌</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">المبلغ المدفوع (ج.م)</label>
                <input className="input" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: +e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">سبب الدفع / ملاحظة</label>
                <input className="input" placeholder="مثال: اشتراك شهر يوليو أو حصة المراجعة" value={payForm.paymentReason} onChange={(e) => setPayForm({ ...payForm, paymentReason: e.target.value })} />
              </div>

              {payForm.status === 'partial' && (
                <>
                  <div className="input-group">
                    <label className="input-label">المبلغ المتبقي (ج.م)</label>
                    <input className="input" type="number" value={payForm.remainingAmount} onChange={(e) => setPayForm({ ...payForm, remainingAmount: +e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">سبب المبلغ المتبقي</label>
                    <input className="input" placeholder="مثال: سداد باقي المبلغ الأسبوع القادم" value={payForm.remainingReason} onChange={(e) => setPayForm({ ...payForm, remainingReason: e.target.value })} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveStudentPayment} style={{ flex: 1 }}>حفظ الدفع</button>
                <button className="btn btn-ghost" onClick={() => setShowPayModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Modal */}
      {showStudentProfileModal && selectedStudentForProfile && (
        <div className="modal-backdrop" onClick={() => setShowStudentProfileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>📄 ملف {staffType === 'trainer' ? 'المتدرب' : 'الطالب'}: {selectedStudentForProfile.name}</h2>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {selectedStudentForProfile.grade} — المادة: {selectedStudentForProfile.subjectName}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowStudentProfileModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Payment Summary */}
              <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>💰 الحالة المالية ({selectedStudentForProfile.paymentType === 'session' ? 'بالحصة' : 'بالشهر'})</h3>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>المطلوب</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{selectedStudentForProfile.monthlyFee} ج.م</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>المدفوع (الفعلي)</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{selectedStudentForProfile.paymentAmount} ج.م</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>حالة الدفع</div>
                    <div style={{ marginTop: 4 }}>
                      {selectedStudentForProfile.paymentStatus === 'paid' ? (
                        <span className="badge badge-success">تم الدفع ✅</span>
                      ) : selectedStudentForProfile.paymentStatus === 'partial' ? (
                        <span className="badge badge-orange">دفع جزئي (متبقي {selectedStudentForProfile.remainingAmount}) ⚠️</span>
                      ) : (
                        <span className="badge badge-danger">لم يدفع ❌</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Summary & List */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📅 سجل الحضور والغياب</h3>
                
                {loadingStudentProfile ? (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                  </div>
                ) : studentProfileData.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                    لا يوجد سجل حضور لهذا الطالب حتى الآن.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <div className="badge badge-success" style={{ fontSize: 14, padding: '6px 12px' }}>
                        ✅ حاضر: {studentProfileData.filter(a => a.status === 'present').length} أيام
                      </div>
                      <div className="badge badge-danger" style={{ fontSize: 14, padding: '6px 12px' }}>
                        ❌ غائب: {studentProfileData.filter(a => a.status === 'absent').length} أيام
                      </div>
                      <div className="badge badge-orange" style={{ fontSize: 14, padding: '6px 12px' }}>
                        ⚠️ مستأذن: {studentProfileData.filter(a => a.status === 'excused').length} أيام
                      </div>
                    </div>

                    <div className="table-wrapper" style={{ maxHeight: 300, overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>التاريخ</th>
                            <th>الحالة</th>
                            <th>ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentProfileData.map((record: any) => (
                            <tr key={record._id}>
                              <td style={{ fontWeight: 600 }}>{record.date}</td>
                              <td>
                                {record.status === 'present' ? <span className="badge badge-success">حاضر ✅</span> :
                                 record.status === 'absent' ? <span className="badge badge-danger">غائب ❌</span> :
                                 <span className="badge badge-orange">مستأذن ⚠️</span>}
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                {record.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', gap: 12 }}>
                {(() => {
                  const pPhone = selectedStudentForProfile.parentPhone || selectedStudentForProfile.phone || '';
                  const waPhone = pPhone.startsWith('0') ? `+2${pPhone}` : pPhone;
                  if (!waPhone) return null;
                  return (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ background: '#25D366', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}
                    >
                      <span>📱</span> مراسلة ولي الأمر عبر واتساب
                    </a>
                  );
                })()}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Add Student/Trainee Modal inside Teacher Profile */}
      {showAddStudentModal && selectedStaff && (
        <div className="modal-backdrop" onClick={() => setShowAddStudentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              {staffType === 'trainer' ? '🏋️ إضافة متدرب جديد' : '👨‍🎓 إضافة طالب جديد'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {staffType === 'trainer'
                ? `المدرب: ${selectedStaff.name} | التخصص: ${selectedStaff.subjectName}`
                : `المدرس: ${selectedStaff.name} | المادة: ${selectedStaff.subjectName} | الصف: ${selectedProfileGrade}`
              }
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">الاسم كامل *</label>
                <input
                  className="input"
                  placeholder={staffType === 'trainer' ? 'اسم المتدرب' : 'اسم الطالب'}
                  value={addStudentForm.name}
                  onChange={(e) => setAddStudentForm({ ...addStudentForm, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">رقم الفون *</label>
                  <input
                    className="input"
                    placeholder="01xxxxxxxxx"
                    value={addStudentForm.phone}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, phone: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">رقم فون ولي الأمر</label>
                  <input
                    className="input"
                    placeholder="01xxxxxxxxx"
                    value={addStudentForm.parentPhone}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, parentPhone: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">المصاريف الشهرية (ج.م)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={addStudentForm.monthlyFee}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, monthlyFee: +e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">حالة الدفع</label>
                  <select
                    className="input"
                    value={addStudentForm.paymentStatus}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, paymentStatus: e.target.value as any })}
                  >
                    <option value="unpaid">لم يدفع بعد ❌</option>
                    <option value="paid">دفع الآن ✅</option>
                  </select>
                </div>
              </div>

              {/* Auto-filled info display */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 12, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>📋 بيانات تُضاف تلقائياً:</div>
                <div>🧑‍🏫 المدرس/المدرب: <strong style={{ color: 'var(--accent-orange)' }}>{selectedStaff.name}</strong></div>
                <div>📚 المادة/التخصص: <strong style={{ color: 'var(--accent-orange)' }}>{selectedStaff.subjectName}</strong></div>
                {staffType === 'teacher' && selectedProfileGrade && (
                  <div>🏫 الصف الدراسي: <strong style={{ color: 'var(--accent-orange)' }}>{selectedProfileGrade}</strong></div>
                )}
                {staffType === 'trainer' && (
                  <div>🏋️ النوع: <strong style={{ color: 'var(--accent-orange)' }}>متدرب</strong></div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleAddStudent}
                  disabled={addingStudent}
                  style={{ flex: 1 }}
                >
                  {addingStudent ? 'جاري الإضافة...' : `✅ إضافة ${staffType === 'trainer' ? 'المتدرب' : 'الطالب'}`}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowAddStudentModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPdf && selectedStaff && (
        <PDFReport 
          title={`تقرير ${labelSingle}: ${selectedStaff.name}`} 
          subtitle={`المادة: ${selectedStaff.subjectName} | القاعة: ${selectedStaff.roomName}`}
          onClose={() => setShowPdf(false)}
        >
          <div style={{ marginBottom: 24 }}>
             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12 }}>البيانات الأساسية</h3>
             <table style={{ width: '100%', marginBottom: 16 }}>
               <tbody>
                 <tr><td style={{ padding: 4, fontWeight: 'bold', width: '30%' }}>رقم الهاتف:</td><td style={{ padding: 4 }}>{selectedStaff.phone}</td></tr>
                 <tr><td style={{ padding: 4, fontWeight: 'bold' }}>عدد الطلاب المسجلين:</td><td style={{ padding: 4 }}>{teacherStudents.length} طالب</td></tr>
               </tbody>
             </table>

             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12 }}>الحضور والغياب</h3>
             <p>إجمالي الحضور: {selectedStaff.presentCount} يوم</p>

             {isAdmin && (
               <>
                 <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 12, marginTop: 24 }}>النسب المالية والحسابات</h3>
                 <p>نسبة أرباح {labelSingle}: {selectedStaff.teacherPercentage}%</p>
                 <p>نسبة أرباح الأكاديمية: {selectedStaff.academyPercentage}%</p>
                 <p>الرصيد المالي الحالي: <strong style={{ color: selectedStaff.balance < 0 ? 'red' : 'green' }}>{selectedStaff.balance} ج.م</strong></p>
               </>
             )}
          </div>
        </PDFReport>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      {showSingleAttModal && (
        <div className="modal-backdrop" onClick={() => setShowSingleAttModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>تسجيل الحضور اليومي</h2>
              <button className="btn-close" onClick={() => setShowSingleAttModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-orange)' }}>
                  الطالب: {singleAttForm.studentName}
                </h3>
              </div>
              <div className="form-group">
                <label>التاريخ اليومي</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={singleAttForm.date}
                  onChange={e => setSingleAttForm({ ...singleAttForm, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>حالة الحضور</label>
                <div style={{ display: 'flex', gap: 15, justifyContent: 'center', margin: '15px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                    <input 
                      type="radio" 
                      name="single-att-status" 
                      checked={singleAttForm.status === 'present'} 
                      onChange={() => setSingleAttForm({ ...singleAttForm, status: 'present' })} 
                    />
                    حاضر ✅
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                    <input 
                      type="radio" 
                      name="single-att-status" 
                      checked={singleAttForm.status === 'absent'} 
                      onChange={() => setSingleAttForm({ ...singleAttForm, status: 'absent' })} 
                    />
                    غائب ❌
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                    <input 
                      type="radio" 
                      name="single-att-status" 
                      checked={singleAttForm.status === 'excused'} 
                      onChange={() => setSingleAttForm({ ...singleAttForm, status: 'excused' })} 
                    />
                    مستأذن ⚠️
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>ملاحظات (اختياري)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="سبب الغياب أو التأخير..."
                  value={singleAttForm.notes}
                  onChange={e => setSingleAttForm({ ...singleAttForm, notes: e.target.value })}
                />
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleSaveSingleAttendance}
              >
                حفظ الحضور
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
