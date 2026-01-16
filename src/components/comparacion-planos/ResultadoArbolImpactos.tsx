// src/components/comparacion-planos/ResultadoArbolImpactos.tsx
import { ArbolImpactosOutput } from "@/types/comparacion-planos";

interface Props {
  data: ArbolImpactosOutput;
}

export default function ResultadoArbolImpactos({ data }: Props) {
  if (!data) return <div>No hay datos de árbol de impactos.</div>;

  return (
    <div>
      <h2>Árbol de Impactos</h2>
      <pre className="bg-slate-100 p-4 rounded-md text-xs whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
