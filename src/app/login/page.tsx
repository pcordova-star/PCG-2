import { redirect } from 'next/navigation';

// Redirige a la página de bienvenida principal que permite elegir el tipo de login.
export default function LoginPage() {
  redirect('/');
}
