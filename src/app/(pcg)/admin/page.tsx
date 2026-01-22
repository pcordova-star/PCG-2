import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Redirige al dashboard del superadministrador
  redirect('/admin/dashboard');
}

    