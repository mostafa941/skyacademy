import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const role = (searchParams.get('role') || 'secretary') as UserRole;

    const users = await User.find({ role }).sort({ createdAt: -1 }).select('-password');
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
