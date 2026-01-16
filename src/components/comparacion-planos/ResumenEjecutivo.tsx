// src/components/comparacion-planos/ResumenEjecutivo.tsx
import { ComparacionPlanosOutput } from "@/types/comparacion-planos";

interface Props {
  data: ComparacionPlanosOutput;
}

export default function ResumenEjecutivo({ data }: Props) {
  if (!data) return null;

  const { diffTecnico, cubicacionDiferencial, arbolImpactos } = data;

  return (
    <div>
      <h2>Resumen Ejecutivo del Análisis</h2>
      <div>Cambios detectados: {diffTecnico?.elementos?.length || 0}</div>
      <div>Partidas modificadas: {cubicacionDiferencial?.partidas?.length || 0}</div>
      <div>Especialidades afectadas: {arbolImpactos?.impactos?.length || 0}</div>
      <div>Severidad global: … (placeholder)</div>

      <hr className="my-4" />

      <div>
        <h3>Resumen Diff Técnico</h3>
        <p>{diffTecnico?.resumen || "No disponible."}</p>
      </div>

      <hr className="my-4" />

      <div>
        <h3>Resumen Cubicación Diferencial</h3>
        <p>{cubicacionDiferencial?.resumen || "No disponible."}</p>
      </div>

      <hr className="my-4" />

      <div>
        <h3>Resumen Árbol de Impactos</h3>
        <p>El análisis de impacto identificó {arbolImpactos?.impactos?.length || 0} cadenas de impacto principales.</p>
      </div>
    </div>
  );
}
