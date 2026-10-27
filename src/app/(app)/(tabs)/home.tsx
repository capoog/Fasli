import { useMe } from '@/lib/auth';
import { AdminHome } from '@/features/home/AdminHome';
import { ParentHome } from '@/features/home/ParentHome';
import { StudentHome } from '@/features/home/StudentHome';
import { TeacherHome } from '@/features/home/TeacherHome';

export default function Home() {
  const me = useMe();
  if (me.role === 'teacher') return <TeacherHome />;
  if (me.role === 'parent') return <ParentHome />;
  if (me.role === 'admin') return <AdminHome />;
  return <StudentHome />;
}
