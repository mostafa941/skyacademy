import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { role, email } = body;

    if (!role || !email) {
      return NextResponse.json({ error: 'الرجاء إدخال الإيميل واختيار نوع الحساب' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    let targetUser = null;

    if (role === 'admin') {
      // Find the admin user
      targetUser = await User.findOne({ role: 'admin' });
      if (!targetUser) {
        return NextResponse.json({ error: 'لا يوجد حساب أدمن في النظام' }, { status: 404 });
      }
      // Note: As requested, the admin's password is sent to the *provided* email, 
      // not necessarily the one in the database.
    } else if (role === 'secretary') {
      targetUser = await User.findOne({ email: cleanEmail, role: 'secretary' });
      if (!targetUser) {
        return NextResponse.json({ error: 'لم يتم العثور على حساب سكرتارية بهذا الإيميل' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'نوع الحساب غير صحيح' }, { status: 400 });
    }

    // Generate new random 8-character password
    const newPassword = Math.random().toString(36).slice(-8);

    // Save it to the database
    targetUser.password = newPassword;
    await targetUser.save();

    console.log(`[PASSWORD RESET] User: ${targetUser.name}, Role: ${targetUser.role}, New Password: ${newPassword}`);
    console.log(`[PASSWORD RESET] Sending to email: ${cleanEmail}`);

    // Set up nodemailer
    let transporter;
    
    // Check if real SMTP credentials exist in env
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Fallback to Ethereal Email for testing if no credentials are provided
      console.log('No SMTP credentials found in .env, generating test Ethereal account...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, 
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Sky Academy" <noreply@skyacademy.com>',
      to: cleanEmail,
      subject: 'إعادة تعيين كلمة المرور - Sky Academy',
      text: `مرحباً ${targetUser.name}،\n\nلقد تم إعادة تعيين كلمة المرور الخاصة بك بنجاح.\n\nكلمة المرور الجديدة: ${newPassword}\n\nيرجى تسجيل الدخول باستخدام هذه الكلمة وتغييرها إذا لزم الأمر.\n\nتحياتنا،\nSky Academy`,
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4f46e5;">إعادة تعيين كلمة المرور</h2>
        <p>مرحباً <strong>${targetUser.name}</strong>،</p>
        <p>لقد تم إعادة تعيين كلمة المرور الخاصة بك بنجاح.</p>
        <p>كلمة المرور الجديدة هي:</p>
        <div style="background: #f3f4f6; padding: 10px 15px; border-radius: 5px; display: inline-block; font-size: 18px; font-weight: bold; letter-spacing: 2px;">
          ${newPassword}
        </div>
        <p style="margin-top: 20px;">يرجى تسجيل الدخول باستخدام هذه الكلمة.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">هذه الرسالة تم توليدها تلقائياً من نظام Sky Academy.</p>
      </div>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    
    // URL to preview the email if using ethereal
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم إرسال كلمة المرور الجديدة إلى الإيميل المذكور بنجاح.' 
    });

  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور: ' + error.message }, { status: 500 });
  }
}
