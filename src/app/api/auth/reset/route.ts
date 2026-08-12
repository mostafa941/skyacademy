import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { role, email, action, otp, newPassword } = body;

    // action can be: 'sendOtp', 'verifyOtp', 'resetPassword'
    const currentAction = action || 'sendOtp';

    if (!role) {
      return NextResponse.json({ error: 'الرجاء اختيار نوع الحساب' }, { status: 400 });
    }

    let targetUser = null;
    let searchEmail = email?.trim().toLowerCase();

    if (role === 'admin') {
      targetUser = await User.findOne({ role: 'admin' });
      if (!targetUser) {
        return NextResponse.json({ error: 'لا يوجد حساب أدمن في النظام' }, { status: 404 });
      }
    } else if (role === 'secretary') {
      if (!searchEmail) {
         return NextResponse.json({ error: 'الرجاء إدخال الإيميل' }, { status: 400 });
      }
      targetUser = await User.findOne({ email: searchEmail, role: 'secretary' });
      if (!targetUser) {
        return NextResponse.json({ error: 'لم يتم العثور على حساب سكرتارية بهذا الإيميل' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'نوع الحساب غير صحيح' }, { status: 400 });
    }

    if (currentAction === 'sendOtp') {
      // Generate OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
      targetUser.resetOtp = generatedOtp;
      targetUser.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      await targetUser.save();

      // Force email to be loul17111999@gmail.com as requested
      const targetEmail = 'loul17111999@gmail.com';
      
      // Send email
      let transporter;
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
        to: targetEmail,
        subject: 'رمز التحقق لإعادة تعيين كلمة المرور - Sky Academy',
        text: `مرحباً ${targetUser.name}،\n\nرمز التحقق (OTP) الخاص بك هو: ${generatedOtp}\n\nهذا الرمز صالح لمدة 15 دقيقة.\n\nتحياتنا،\nSky Academy`,
        html: `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4f46e5;">رمز التحقق (OTP)</h2>
          <p>مرحباً <strong>${targetUser.name}</strong>،</p>
          <p>لقد طلبت إعادة تعيين كلمة المرور. رمز التحقق الخاص بك هو:</p>
          <div style="background: #f3f4f6; padding: 10px 15px; border-radius: 5px; display: inline-block; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
            ${generatedOtp}
          </div>
          <p style="margin-top: 20px;">هذا الرمز صالح لمدة 15 دقيقة.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">هذه الرسالة تم توليدها تلقائياً من نظام Sky Academy.</p>
        </div>`,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("OTP Message sent: %s", info.messageId);
      if (info.messageId && nodemailer.getTestMessageUrl(info)) {
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }

      return NextResponse.json({ 
        success: true, 
        message: 'تم إرسال رمز التحقق OTP بنجاح.' 
      });

    } else if (currentAction === 'verifyOtp') {
      if (!otp) return NextResponse.json({ error: 'الرجاء إدخال رمز التحقق' }, { status: 400 });
      if (targetUser.resetOtp !== otp) return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 });
      if (!targetUser.resetOtpExpiry || targetUser.resetOtpExpiry < new Date()) {
        return NextResponse.json({ error: 'انتهت صلاحية رمز التحقق' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'رمز التحقق صحيح' });

    } else if (currentAction === 'resetPassword') {
      if (!otp || !newPassword) return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
      if (targetUser.resetOtp !== otp) return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 });
      if (!targetUser.resetOtpExpiry || targetUser.resetOtpExpiry < new Date()) {
        return NextResponse.json({ error: 'انتهت صلاحية رمز التحقق' }, { status: 400 });
      }
      
      targetUser.password = newPassword;
      targetUser.resetOtp = undefined;
      targetUser.resetOtpExpiry = undefined;
      await targetUser.save();

      return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
    }

  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'حدث خطأ: ' + error.message }, { status: 500 });
  }
}
