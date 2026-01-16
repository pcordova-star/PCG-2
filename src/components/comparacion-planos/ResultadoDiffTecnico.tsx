// src/components/comparacion-planos/ResultadoDiffTecnico.tsx
import { DiffTecnicoOutput } from "@/types/comparacion-planos";

interface Props {
  data: DiffTecnicoOutput;
}

export default function ResultadoDiffTecnico({ data }: Props) {
  if (!data) return <div>No hay datos de diferencias técnicas.</div>;
  
  return (
    <div>
      <h2>Diff Técnico</h2>
      <p className="text-sm italic my-2">{data.resumen}</p>
      <ul className="list-disc pl-5">
        {data.elementos.map((e, index) => (
          <li key={index}>
            <span className="font-semibold capitalize">{e.tipo}:</span> {e.descripcion}
          </li>
        ))}
      </ul>
    </div>
  );
}
