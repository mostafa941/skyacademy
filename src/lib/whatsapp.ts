export interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'excused';
  subjectName?: string;
  notes?: string;
}

export interface WhatsAppStudentReportData {
  name: string;
  type?: 'student' | 'trainee';
  phone?: string;
  parentPhone?: string;
  subjectName?: string;
  teacherName?: string;
  grade?: string;
  monthlyFee?: number;
  // Attendance stats
  totalAttendance?: number;
  presentCount?: number;
  absentCount?: number;
  excusedCount?: number;
  attendanceHistory?: AttendanceRecord[];
  // Payment
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  paymentAmount?: number;
  paymentType?: 'session' | 'monthly';
  paymentReason?: string;
  remainingAmount?: number;
  remainingReason?: string;
  month?: string;
  // Grades & Notes
  grades?: Array<{ title: string; score: number; maxScore: number; date?: string }>;
  notes?: string;
}

export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    return '2' + clean;
  }
  if (!clean.startsWith('2') && clean.length === 10) {
    return '20' + clean;
  }
  return clean;
}

export function generateStudentWhatsAppReport(st: WhatsAppStudentReportData): string {
  const isTrainee = st.type === 'trainee';
  const roleLabel = isTrainee ? 'المتدرب' : 'الطالب';
  const mentorLabel = isTrainee ? 'المدرب' : 'المدرس';
  const fieldLabel = isTrainee ? 'التخصص / اللعبة' : 'المادة';
  const currentMonth = st.month || new Date().toISOString().substring(0, 7);

  // Attendance calculations
  const present = st.presentCount || 0;
  const absent = st.absentCount || 0;
  const excused = st.excusedCount || 0;
  const total = (st.totalAttendance !== undefined && st.totalAttendance >= present + absent + excused)
    ? st.totalAttendance
    : present + absent + excused;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
  const rateEmoji = attendanceRate >= 85 ? '🌟 ممتاز' : attendanceRate >= 65 ? '👍 جيد' : attendanceRate >= 50 ? '⚠️ مقبول' : '❗ يحتاج متابعة';

  // Payment status text
  const payTypeStr = st.paymentType === 'session' ? 'دفع بالحصة ⏱️' : 'اشتراك شهري 📅';
  let payStatusStr = '';
  if (st.paymentStatus === 'paid') {
    payStatusStr = `✅ تم سداد المصاريف بالكامل (${st.paymentAmount ?? st.monthlyFee ?? 0} ج.م)`;
    if (st.paymentReason) {
      payStatusStr += ` — (${st.paymentReason})`;
    }
  } else if (st.paymentStatus === 'partial') {
    payStatusStr = `⚠️ سداد جزئي (المدفوع: ${st.paymentAmount || 0} ج.م | المتبقي: ${st.remainingAmount || 0} ج.م)`;
    if (st.remainingReason) {
      payStatusStr += `\n   سبب المتبقي: ${st.remainingReason}`;
    }
  } else {
    payStatusStr = `❌ لم يتم السداد بعد (المبلغ المطلوب: ${st.monthlyFee || 0} ج.م)`;
  }

  // Attendance history details (up to 15 recent sessions)
  let attendanceHistoryText = '';
  if (st.attendanceHistory && st.attendanceHistory.length > 0) {
    const historyLines = st.attendanceHistory.slice(0, 15).map(att => {
      const icon = att.status === 'present' ? '✅ حاضر' : att.status === 'absent' ? '❌ غائب' : '⚠️ مستأذن';
      const sub = att.subjectName ? ` [${att.subjectName}]` : '';
      const note = att.notes ? ` (${att.notes})` : '';
      return `• ${att.date} : ${icon}${sub}${note}`;
    });
    attendanceHistoryText = `\n\n🗓️ *سجل وتواريخ الأيام والحصص:*\n` + historyLines.join('\n');
    if (st.attendanceHistory.length > 15) {
      attendanceHistoryText += `\n• ... (و ${st.attendanceHistory.length - 15} حصص سابقة)`;
    }
  }

  // Grades text
  let gradesText = '';
  if (st.grades && st.grades.length > 0) {
    const gradeLines = st.grades.map(g => {
      const datePart = g.date ? ` (${g.date})` : '';
      return `• ${g.title}: ${g.score}/${g.maxScore}${datePart}`;
    });
    gradesText = `\n\n⭐ *سجل الدرجات والاختبارات:*\n` + gradeLines.join('\n');
  }

  // Notes
  const notesText = st.notes?.trim() ? `\n\n📝 *ملاحظات:* ${st.notes.trim()}` : '';

  // Construct full message
  const message = 
`${isTrainee ? '🏋️' : '🎓'} *تقرير متابعة ${roleLabel}: ${st.name}*
━━━━━━━━━━━━━━━━━━━━
📚 *${fieldLabel}:* ${st.subjectName || 'غير محدد'}
👨‍🏫 *${mentorLabel}:* ${st.teacherName || 'غير محدد'}
${!isTrainee && st.grade ? `🏫 *الصف الدراسي:* ${st.grade}\n` : ''}📅 *تقرير شهر:* ${currentMonth}
━━━━━━━━━━━━━━━━━━━━

📊 *تقرير الحضور والغياب:*
• نسبة الحضور: *${attendanceRate}%* (${rateEmoji})
• إجمالي الحصص المسجلة: ${total} حصة
• عدد مرات الحضور: ${present} حصة ✅
• عدد مرات الغياب: ${absent} حصة ❌
${excused > 0 ? `• عدد مرات الاستئذان: ${excused} حصة ⚠️\n` : ''}${attendanceHistoryText}

💰 *الموقف المالي والمصاريف:*
• نظام الدفع: ${payTypeStr}
• قيمة الاشتراك: ${st.monthlyFee || 0} ج.م
• حالة السداد لشهر (${currentMonth}):
  ${payStatusStr}${gradesText}${notesText}

━━━━━━━━━━━━━━━━━━━━
🌤️ *أكاديمية سكاي (Sky Academy)*
لأي استفسار يسعدنا تواصلكم معنا دائماً.`;

  return message;
}

export function getWhatsAppReportUrl(st: WhatsAppStudentReportData): string {
  const phone = formatWhatsAppPhone(st.parentPhone || st.phone);
  const message = generateStudentWhatsAppReport(st);
  if (!phone) return '';
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

export function openStudentWhatsAppReport(st: WhatsAppStudentReportData): void {
  const phone = formatWhatsAppPhone(st.parentPhone || st.phone);
  const message = generateStudentWhatsAppReport(st);
  if (!phone) {
    alert('لا يوجد رقم هاتف مسجل لهذا الطالب أو ولي الأمر');
    return;
  }
  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/** Generates a brief details message for the student/trainee */
export function generateStudentWhatsAppDetails(st: WhatsAppStudentReportData): string {
  const isTrainee = st.type === 'trainee';
  const roleLabel = isTrainee ? 'المتدرب' : 'الطالب';
  const mentorLabel = isTrainee ? 'المدرب' : 'المدرس';
  const fieldLabel = isTrainee ? 'التخصص / اللعبة' : 'المادة';

  let payStatusStr = '';
  if (st.paymentStatus === 'paid') {
    payStatusStr = `✅ تم السداد بالكامل (${st.paymentAmount ?? st.monthlyFee ?? 0} ج.م)`;
  } else if (st.paymentStatus === 'partial') {
    payStatusStr = `⚠️ سداد جزئي — المدفوع: ${st.paymentAmount || 0} ج.م | المتبقي: ${st.remainingAmount || 0} ج.م`;
  } else if (st.paymentStatus === 'unpaid') {
    payStatusStr = `❌ لم يتم السداد (${st.monthlyFee || 0} ج.م)`;
  } else {
    payStatusStr = 'غير محدد';
  }

  const gradeLine = !isTrainee && st.grade ? `🏫 *الصف:* ${st.grade}\n` : '';
  const currentMonth = st.month || new Date().toISOString().substring(0, 7);

  const message =
`${isTrainee ? '🏋️' : '🎓'} *تفاصيل ${roleLabel}: ${st.name}*
━━━━━━━━━━━━━━━━━━━━
📚 *${fieldLabel}:* ${st.subjectName || 'غير محدد'}
👨‍🏫 *${mentorLabel}:* ${st.teacherName || 'غير محدد'}
${gradeLine}📱 *الهاتف:* ${st.phone || 'غير محدد'}
${st.parentPhone ? `📱 *هاتف ولي الأمر:* ${st.parentPhone}\n` : ''}💰 *قيمة الاشتراك:* ${st.monthlyFee || 0} ج.م
📅 *شهر:* ${currentMonth}
💳 *حالة السداد:* ${payStatusStr}
${st.notes?.trim() ? `📝 *ملاحظات:* ${st.notes.trim()}\n` : ''}━━━━━━━━━━━━━━━━━━━━
🌤️ *أكاديمية سكاي (Sky Academy)*`;

  return message;
}

/** Opens a WhatsApp chat with a brief details message — uses any available phone number */
export function openStudentWhatsAppDetails(st: WhatsAppStudentReportData): void {
  const phone = formatWhatsAppPhone(st.parentPhone || st.phone);
  const message = generateStudentWhatsAppDetails(st);
  if (!phone) {
    alert('لا يوجد رقم هاتف مسجل لهذا الطالب أو ولي الأمر');
    return;
  }
  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
