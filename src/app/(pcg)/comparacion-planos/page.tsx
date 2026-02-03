// src/app/comparacion-planos/page.tsx
import { redirect } from 'next/navigation';

// Redirige a la página de historial de planos, que actúa como la página principal del módulo.
export default function ComparacionPlanosPage() {
  redirect('/comparacion-planos/historial');
}
