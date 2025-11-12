"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { firebaseDb } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';

type Obra = {
  id: string;
  nombreFaena: string;
  mandanteRazonSocial?: string;
  mandanteRut?: string;
};

type EstadoGlobalDS44Obra =
  | "EN_IMPLEMENTACION"
  | "CUMPLE"
  | "CON_OBSERVACIONES"
  | "CRITICO";

type FichaDs44MandanteObra = {
    obraId: string;
    representanteLegal: string;
    responsableCoordinacionNombre: string;
    responsableCoordinacionCargo: string;
    responsableCoordinacionContacto: string;
    mutualidad: string;
    fechaInicioObra: string;
    fechaTerminoEstimado: string;
    existeReglamentoEspecial: boolean;
    existePlanUnicoSeguridad: boolean;
    existeProgramaCoordinacion: boolean;
    frecuenciaReunionesCoordinacion: string;
    mecanismosComunicacion: string;
    estadoGlobal: EstadoGlobalDS44Obra;
    observacionesGenerales: string;
    fechaUltimaRevision: string;
    revisadoPor: string;
    createdAt?: Date | null;
    updatedAt?: Date | null;
};


export default function DS44MandanteObraPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");

  const [ficha, setFicha] = useState<FichaDs44MandanteObra | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);

  // obraId viene del estado obraSeleccionadaId
  const obraId = obraSeleccionadaId;

  useEffect(() => {
    const cargarObras = async () => {
        try {
            const colRef = collection(firebaseDb, "obras");
            const snapshot = await getDocs(colRef);
            const data: Obra[] = snapshot.docs.map(doc => ({
                id: doc.id,
                nombreFaena: doc.data().nombreFaena ?? "",
            }));
            setObras(data);
            if(data.length > 0 && !obraSeleccionadaId) {
                setObraSeleccionadaId(data[0].id);
            }
        } catch (err) {
            console.error("Error cargando obras", err);
            setError("No se pudieron cargar las obras desde Firestore.");
        }
    }
    cargarObras();
  }, [obraSeleccionadaId]);

  useEffect(() => {
    const cargarFicha = async () => {
      if (!obraId) {
        setFicha(null);
        setCargandoFicha(false);
        return;
      }

      setCargandoFicha(true);
      setError(null);
      setMensajeOk(null);

      try {
        const fichaRef = doc(firebaseDb, "obras", obraId, "ds44MandanteObra", "ficha");
        const snap = await getDoc(fichaRef);

        if (snap.exists()) {
          const data = snap.data() as any;
          setFicha({
            obraId,
            representanteLegal: data.representanteLegal ?? "",
            responsableCoordinacionNombre: data.responsableCoordinacionNombre ?? "",
            responsableCoordinacionCargo: data.responsableCoordinacionCargo ?? "",
            responsableCoordinacionContacto: data.responsableCoordinacionContacto ?? "",
            mutualidad: data.mutualidad ?? "",
            fechaInicioObra: data.fechaInicioObra ?? "",
            fechaTerminoEstimado: data.fechaTerminoEstimado ?? "",
            existeReglamentoEspecial: data.existeReglamentoEspecial ?? false,
            existePlanUnicoSeguridad: data.existePlanUnicoSeguridad ?? false,
            existeProgramaCoordinacion: data.existeProgramaCoordinacion ?? false,
            frecuenciaReunionesCoordinacion: data.frecuenciaReunionesCoordinacion ?? "",
            mecanismosComunicacion: data.mecanismosComunicacion ?? "",
            estadoGlobal: data.estadoGlobal ?? "EN_IMPLEMENTACION",
            observacionesGenerales: data.observacionesGenerales ?? "",
            fechaUltimaRevision: data.fechaUltimaRevision ?? new Date().toISOString().slice(0,10),
            revisadoPor: data.revisadoPor ?? "",
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          });
        } else {
          // Si no existe, inicializa con valores vacíos
          setFicha({
            obraId,
            representanteLegal: "",
            responsableCoordinacionNombre: "",
            responsableCoordinacionCargo: "",
            responsableCoordinacionContacto: "",
            mutualidad: "",
            fechaInicioObra: "",
            fechaTerminoEstimado: "",
            existeReglamentoEspecial: false,
            existePlanUnicoSeguridad: false,
            existeProgramaCoordinacion: false,
            frecuenciaReunionesCoordinacion: "",
            mecanismosComunicacion: "",
            estadoGlobal: "EN_IMPLEMENTACION",
            observacionesGenerales: "",
            fechaUltimaRevision: new Date().toISOString().slice(0, 10),
            revisadoPor: "",
          });
        }
      } catch (err) {
        console.error(err);
        setError("Error al cargar la ficha DS44 Mandante / Obra.");
      } finally {
        setCargandoFicha(false);
      }
    };

    cargarFicha();
  }, [obraId]);
  
  const handleInputChange = (field: keyof FichaDs44MandanteObra, value: any) => {
    setFicha((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensajeOk(null);

    if (!obraId) {
      setError("Debes seleccionar una obra antes de guardar la ficha.");
      return;
    }

    if (!ficha) {
      setError("No se pudo cargar la ficha en memoria para guardar.");
      return;
    }
    
    if (!ficha.responsableCoordinacionNombre) {
      setError("Completa al menos el nombre del responsable de coordinación.");
      return;
    }

    try {
      setGuardando(true);

      const fichaRef = doc(firebaseDb, "obras", obraId, "ds44MandanteObra", "ficha");

      await setDoc(
        fichaRef,
        {
          ...ficha,
          obraId,
          createdAt: ficha.createdAt ? Timestamp.fromDate(ficha.createdAt) : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMensajeOk("Ficha DS44 Mandante / Obra guardada correctamente!");
      setTimeout(() => setMensajeOk(null), 4000);

    } catch (err) {
      console.error(err);
      setError("Error al guardar la ficha DS44 Mandante / Obra. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoFicha) {
      return (
          <div className="text-center p-8 text-muted-foreground">
              Cargando datos de la ficha...
          </div>
      );
  }
  
  if (!obraId) {
    return (
      <div className="space-y-8">
         <header className="space-y-2">
          <h1 className="text-3xl font-bold font-headline tracking-tight">DS44 – Mandante / Obra</h1>
          <p className="text-lg text-muted-foreground">
            Ficha global de cumplimiento de la obligación de coordinar las actividades preventivas en la obra, desde la perspectiva del mandante (DS44, Art. 3).
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Selección de Obra</CardTitle>
            <CardDescription>Seleccione la obra para la cual desea ver o editar la ficha DS44 global.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Cargando obras disponibles...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">DS44 – Mandante / Obra</h1>
        <p className="text-lg text-muted-foreground">
          Ficha global de cumplimiento de la obligación de coordinar las actividades preventivas en la obra, desde la perspectiva del mandante (DS44, Art. 3).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Selección de Obra</CardTitle>
          <CardDescription>Seleccione la obra para la cual desea ver o editar la ficha DS44 global.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="obra-select">Obra / Faena</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {obras.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.nombreFaena}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
     {ficha && (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>A. Datos de la Obra y del Mandante</CardTitle>
                     <CardDescription>
                        La Razón Social y el RUT del Mandante se gestionan desde el módulo de Obras.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label>Representante Legal</Label><Input value={ficha.representanteLegal} onChange={e => handleInputChange('representanteLegal', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Mutualidad</Label><Input value={ficha.mutualidad} onChange={e => handleInputChange('mutualidad', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Fecha de Inicio de Obra</Label><Input type="date" value={ficha.fechaInicioObra} onChange={e => handleInputChange('fechaInicioObra', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Fecha de Término Estimado</Label><Input type="date" value={ficha.fechaTerminoEstimado} onChange={e => handleInputChange('fechaTerminoEstimado', e.target.value)} /></div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>B. Responsable de Coordinación DS44</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label>Nombre</Label><Input value={ficha.responsableCoordinacionNombre} onChange={e => handleInputChange('responsableCoordinacionNombre', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Cargo</Label><Input value={ficha.responsableCoordinacionCargo} onChange={e => handleInputChange('responsableCoordinacionCargo', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Contacto (Teléfono / Email)</Label><Input value={ficha.responsableCoordinacionContacto} onChange={e => handleInputChange('responsableCoordinacionContacto', e.target.value)} /></div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>C. Documentos y Coordinación DS44</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2"><Checkbox id="reglamento" checked={ficha.existeReglamentoEspecial} onCheckedChange={c => handleInputChange('existeReglamentoEspecial', !!c)} /><Label htmlFor="reglamento">Existe Reglamento Especial de Faena</Label></div>
                        <div className="flex items-center space-x-2"><Checkbox id="plan" checked={ficha.existePlanUnicoSeguridad} onCheckedChange={c => handleInputChange('existePlanUnicoSeguridad', !!c)} /><Label htmlFor="plan">Existe Plan de Seguridad Coordinado</Label></div>
                        <div className="flex items-center space-x-2"><Checkbox id="programa" checked={ficha.existeProgramaCoordinacion} onCheckedChange={c => handleInputChange('existeProgramaCoordinacion', !!c)} /><Label htmlFor="programa">Existe Programa de Coordinación</Label></div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Frecuencia de Reuniones de Coordinación</Label><Input value={ficha.frecuenciaReunionesCoordinacion} onChange={e => handleInputChange('frecuenciaReunionesCoordinacion', e.target.value)} placeholder="Ej: Semanal, Quincenal" /></div>
                        <div className="space-y-2"><Label>Mecanismos de Comunicación</Label><Textarea value={ficha.mecanismosComunicacion} onChange={e => handleInputChange('mecanismosComunicacion', e.target.value)} placeholder="Ej: Correo, reuniones, actas..." /></div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>D. Estado Global y Observaciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Estado Global de Cumplimiento DS44</Label>
                            <Select value={ficha.estadoGlobal} onValueChange={v => handleInputChange('estadoGlobal', v as EstadoGlobalDS44Obra)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EN_IMPLEMENTACION">En implementación</SelectItem>
                                <SelectItem value="CUMPLE">Cumple</SelectItem>
                                <SelectItem value="CON_OBSERVACIONES">Cumple con observaciones</SelectItem>
                                <SelectItem value="CRITICO">Crítico</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Observaciones Generales</Label>
                            <Textarea value={ficha.observacionesGenerales} onChange={e => handleInputChange('observacionesGenerales', e.target.value)} />
                        </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Fecha de Última Revisión</Label>
                            <Input type="date" value={ficha.fechaUltimaRevision} onChange={e => handleInputChange('fechaUltimaRevision', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Revisado Por</Label>
                            <Input value={ficha.revisadoPor} onChange={e => handleInputChange('revisadoPor', e.target.value)} placeholder="Nombre del Prevencionista / Comité" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90" disabled={guardando}>
                    {guardando ? "Guardando..." : "Guardar Ficha DS44 de la Obra"}
                </Button>
                 <Button asChild variant="outline" className="w-full sm:w-auto" disabled={!obraId}>
                  <Link href={`/prevencion/ds44-mandante/${obraId}/imprimir`}>
                    Imprimir Ficha
                  </Link>
                </Button>
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                {mensajeOk && <p className="text-sm font-medium text-green-600">{mensajeOk}</p>}
            </div>
        </form>
      )}
    </div>
  );
}
