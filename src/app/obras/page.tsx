// src/app/obras/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { firebaseDb } from "../../lib/firebaseClient";

type Obra = {
  id: string;
  nombreFaena: string;
  direccion: string;
  clienteEmail: string;
};

export default function ObrasPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [obras, setObras] = useState<Obra[]>([]);
  const [cargandoObras, setCargandoObras] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombreFaena: "",
    direccion: "",
    clienteEmail: "",
  });

  // 1) Si no hay usuario, redirigir a /login
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // 2) Cargar obras desde Firestore solo si hay usuario
  useEffect(() => {
    if (!user) return; // si no hay usuario, no intento leer nada

    async function cargarObras() {
      try {
        setCargandoObras(true);
        setError(null);

        const colRef = collection(firebaseDb, "obras");
        const snapshot = await getDocs(colRef);

        const data: Obra[] = snapshot.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            nombreFaena: d.nombreFaena ?? "",
            direccion: d.direccion ?? "",
            clienteEmail: d.clienteEmail ?? "",
          };
        });

        setObras(data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar las obras desde el servidor.");
      } finally {
        setCargandoObras(false);
      }
    }

    cargarObras();
  }, [user]);

  // Mientras AuthContext todavía está resolviendo el usuario
  if (loading) {
    return (
      <p className="text-sm text-slate-600">
        Cargando sesión...
      </p>
    );
  }

  // Si ya sabemos que NO hay usuario, mostramos algo mínimo
  // (igual el useEffect de arriba hará router.replace("/login"))
  if (!user) {
    return (
      <p className="text-sm text-slate-600">
        Redirigiendo a login...
      </p>
    );
  }

  // 3) Crear nueva obra en Firestore
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const { nombreFaena, direccion, clienteEmail } = form;

    if (!nombreFaena.trim() || !direccion.trim() || !clienteEmail.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clienteEmail)) {
      setError("El email del cliente no tiene un formato válido.");
      return;
    }

    try {
      const colRef = collection(firebaseDb, "obras");
      const docRef = await addDoc(colRef, {
        nombreFaena: nombreFaena.trim(),
        direccion: direccion.trim(),
        clienteEmail: clienteEmail.trim(),
        creadoEn: new Date().toISOString(),
      });

      const nuevaObra: Obra = {
        id: docRef.id,
        nombreFaena: nombreFaena.trim(),
        direccion: direccion.trim(),
        clienteEmail: clienteEmail.trim(),
      };

      setObras((prev) => [nuevaObra, ...prev]);

      setForm({
        nombreFaena: "",
        direccion: "",
        clienteEmail: "",
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo crear la obra. Intenta nuevamente.");
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">
          Gestión de Obras - PCG 2.0
        </h2>
        <p className="text-sm text-slate-600">
          Módulo base común de faenas. Aquí se crean las obras a las que luego
          se asocian Operaciones y Prevención de Riesgos.
        </p>
      </header>

      {/* Mensajes de error y estado */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {cargandoObras && (
        <p className="text-sm text-slate-500">Cargando obras...</p>
      )}

      {/* Formulario creación obra */}
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border bg-white p-4 shadow-sm text-sm"
      >
        <h3 className="text-base font-semibold text-slate-900">
          Crear nueva obra/faena
        </h3>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-700">
              Nombre de la faena
            </label>
            <input
              type="text"
              className="w-full rounded-lg border px-2 py-1.5 text-sm"
              value={form.nombreFaena}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nombreFaena: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="text-xs text-slate-700">Dirección</label>
            <input
              type="text"
              className="w-full rounded-lg border px-2 py-1.5 text-sm"
              value={form.direccion}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, direccion: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-700">
              Email del cliente (login cliente futuro)
            </label>
            <input
              type="email"
              className="w-full rounded-lg border px-2 py-1.5 text-sm"
              value={form.clienteEmail}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, clienteEmail: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-slate-900 px-4 py-2 text-xs font-medium hover:bg-slate-900 hover:text-white transition"
          >
            Crear obra
          </button>
        </div>
      </form>

      {/* Listado de obras */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-3">
          Obras registradas
        </h3>

        {obras.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay obras registradas aún.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Nombre faena
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Dirección
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Email cliente
                  </th>
                </tr>
              </thead>
              <tbody>
                {obras.map((obra) => (
                  <tr key={obra.id} className="border-t">
                    <td className="px-3 py-2">{obra.nombreFaena}</td>
                    <td className="px-3 py-2">{obra.direccion}</td>
                    <td className="px-3 py-2">{obra.clienteEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
