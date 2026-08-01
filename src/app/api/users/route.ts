import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'secretary')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    
    let query: any = {};
    if (role) {
      query.role = role;
    } else if (currentUser.role === 'secretary') {
      // Secretary can only see secretaries (and maybe themselves)
      query.role = 'secretary';
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'secretary')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { name, phone, email, password, role } = body;

    if (!name || !phone || !password) {
      return NextResponse.json({ error: 'الاسم ورقم الهاتف وكلمة المرور مطلوبة' }, { status: 400 });
    }

    // Secretary cannot create admin accounts
    const assignedRole = (currentUser.role === 'secretary' || role !== 'admin') ? 'secretary' : 'admin';

    // Check if phone or email already exists
    const exists = await User.findOne({ $or: [{ phone }, ...(email ? [{ email }] : [])] });
    if (exists) {
      return NextResponse.json({ error: 'رقم الهاتف أو البريد الإلكتروني مسجل بالفعل' }, { status: 400 });
    }

    const user = await User.create({
      name,
      phone,
      email: email || undefined,
      password,
      role: assignedRole,
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await connectToDatabase();

    const body = await req.json();
    const { id, password, name, phone, email } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Permission check
    if (currentUser.role !== 'admin') {
      // Secretary can only edit their own account or other secretaries (if allowed, let's allow editing themselves or other secretaries)
      if (userToUpdate.role === 'admin') {
        return NextResponse.json({ error: 'غير مصرح بتعديل حساب الأدمن' }, { status: 403 });
      }
    }

    if (password) userToUpdate.password = password;
    if (name) userToUpdate.name = name;
    if (phone) userToUpdate.phone = phone;
    if (email !== undefined) userToUpdate.email = email;

    await userToUpdate.save();

    return NextResponse.json({ success: true, user: userToUpdate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح (صلاحيات مدير فقط)' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const currentUserId = (currentUser as any).userId || (currentUser as any)._id?.toString();

    if (userToDelete.role === 'admin' && userToDelete._id.toString() === currentUserId) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الشخصي' }, { status: 400 });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}