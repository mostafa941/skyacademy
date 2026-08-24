import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentUserServer } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SecretaryDashboard() {
  const user = await getCurrentUserServer();
  
  if (!user || user.role !== 'secretary') {
    redirect('/');
  }

  const mappedUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as 'admin' | 'secretary',
  };

  return <DashboardLayout role="secretary" initialUser={mappedUser} />;
}
