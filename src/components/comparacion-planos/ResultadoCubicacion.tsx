// src/components/comparacion-planos/ResultadoCubicacion.tsx
import { CubicacionDiferencialOutput } from "@/types/comparacion-planos";

interface Props {
  data: CubicacionDiferencialOutput;
}

export default function ResultadoCubicacion({ data }: Props) {
   if (!data) return <div>No hay datos de cubicación diferencial.</div>;

  return (
    <div>
      <h2>Cubicación Diferencial</h2>
      <ul className="list-disc pl-5">
        {data.partidas.map((p, i) => (
          <li key={i}>
            {p.partida}: {p.diferencia.toLocaleString('es-CL')} {p.unidad}
          </li>
        ))}
      </ul>
    </div>
  );
}
