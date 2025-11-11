export default function PrevencionPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-4xl font-bold font-headline tracking-tight">Módulo de Prevención de Riesgos</h1>
      <p className="text-lg text-muted-foreground">
        Es un módulo que se contratará por separado. Usará las mismas obras como unidad base, pero su código estará separado de Operaciones.
      </p>
      <p className="text-foreground mt-4">
        Este módulo se centrará en la gestión de la seguridad y salud ocupacional. Se integrará con el módulo de Obras para asociar la documentación y los procedimientos de seguridad a cada proyecto específico, garantizando el cumplimiento normativo y un entorno de trabajo seguro.
      </p>
    </div>
  );
}
