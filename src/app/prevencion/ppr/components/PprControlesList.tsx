// src/app/prevencion/ppr/components/PprControlesList.tsx
import { IPERRegistro } from "@/types/pcg";

interface Props {
  iperData: IPERRegistro[];
}

export function PprControlesList({ iperData }: Props) {
  const controles = iperData.flatMap(iper => {
    const controlesGenerales = iper.medidasControlPropuestas ? iper.medidasControlPropuestas.split('\n') : [];
    if (iper.control_especifico_genero) {
      controlesGenerales.push(`(Enfoque de Género) ${iper.control_especifico_genero}`);
    }
    return controlesGenerales.map(control => ({
      peligro: iper.peligro,
      control: control,
      responsable: iper.responsableImplementacion || iper.responsable
    }));
  }).filter(c => c.control.trim() !== '');

  return (
    <div className="space-y-4">
      {controles.map((item, index) => (
        <div key={index} className="p-3 border rounded-md bg-muted/50">
          <p className="font-semibold text-sm">{item.control}</p>
          <div className="text-xs text-muted-foreground mt-1">
            <span>Peligro asociado: {item.peligro}</span> | <span>Responsable: {item.responsable || 'No asignado'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
