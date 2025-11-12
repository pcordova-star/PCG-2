"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { firebaseDb } from "@/lib/firebaseClient";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";


// --- Tipos ---
type Obra = {
  id: string;
  nombreFaena: string;
};

type EstadoIngreso = "Pendiente" | "Aprobado" | "Rechazado";

type IngresoEmpresa = {
  id: string;
  obraId: string;
  fechaIngreso: string;
  razonSocial: string;
  rutEmpresa: string;
  representante: string;
  mutualidad: string;
  tipoTrabajo: string;
  cantidadTrabajadores: number;
  docContratoOC: boolean;
  docMutualAlDia: boolean;
  docListadoPersonal: boolean;
  docInduccionRealizada: boolean;
  docReglamentoFirmado: boolean;
  docMatrizRiesgos: boolean;
  estadoIngreso: EstadoIngreso;
  observaciones: string;
  createdAt?: Date | null;
};


const ESTADOS_INGRESO: EstadoIngreso[] = ["Pendiente", "Aprobado", "Rechazado"];

// --- Componentes Auxiliares ---
function EstadoBadge({ estado }: { estado: EstadoIngreso }) {
  const className = {
    "Aprobado": "bg-green-100 text-green-800 border-green-200",
    "Pendiente": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Rechazado": "bg-red-100 text-red-800 border-red-200",
  }[estado];
  return <Badge variant="outline" className={cn("font-semibold", className)}>{estado}</Badge>;
}

// --- Componente Principal ---
export default function IngresoEmpresaSubcontratistaPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
  const [ingresos, setIngresos] = useState<IngresoEmpresa[]>([]);

  // Estados del formulario
  const [razonSocial, setRazonSocial] = useState('');
  const [rutEmpresa, setRutEmpresa] = useState('');
  const [representante, setRepresentante] = useState('');
  const [mutualidad, setMutualidad] = useState('');
  const [tipoTrabajo, setTipoTrabajo] = useState('');
  const [cantidadTrabajadores, setCantidadTrabajadores] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [estadoIngreso, setEstadoIngreso] = useState<EstadoIngreso>('Pendiente');
  const [observaciones, setObservaciones] = useState('');

  const [docContratoOC, setDocContratoOC] = useState(false);
  const [docMutualAlDia, setDocMutualAlDia] = useState(false);
  const [docListadoPersonal, setDocListadoPersonal] = useState(false);
  const [docInduccionRealizada, setDocInduccionRealizada] = useState(false);
  const [docReglamentoFirmado, setDocReglamentoFirmado] = useState(false);
  const [docMatrizRiesgos, setDocMatrizRiesgos] = useState(false);
  
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  
  // Cargar Obras desde Firestore
  useEffect(() => {
    async function cargarObras() {
      try {
        const colRef = collection(firebaseDb, "obras");
        const snapshot = await getDocs(colRef);
        const data: Obra[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          nombreFaena: doc.data().nombreFaena ?? "",
        }));
        setObras(data);
        if (data.length > 0 && !obraSeleccionadaId) {
          setObraSeleccionadaId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar las obras.");
      }
    }
    cargarObras();
  }, [obraSeleccionadaId]);
  
  // Cargar ingresos en tiempo real
  useEffect(() => {
    if (!obraSeleccionadaId) {
      setIngresos([]);
      return;
    }

    const q = query(
      collection(firebaseDb, "obras", obraSeleccionadaId, "empresasSubcontratistasDs44"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: IngresoEmpresa[] = snapshot.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            obraId: d.obraId,
            rutEmpresa: d.rutEmpresa ?? "",
            razonSocial: d.razonSocial ?? "",
            representante: d.representante ?? "",
            mutualidad: d.mutualidad ?? "",
            tipoTrabajo: d.tipoTrabajo ?? "",
            cantidadTrabajadores: d.cantidadTrabajadores ?? 0,
            fechaIngreso: d.fechaIngreso ?? "",
            docContratoOC: !!d.docContratoOC,
            docMutualAlDia: !!d.docMutualAlDia,
            docListadoPersonal: !!d.docListadoPersonal,
            docInduccionRealizada: !!d.docInduccionRealizada,
            docReglamentoFirmado: !!d.docReglamentoFirmado,
            docMatrizRiesgos: !!d.docMatrizRiesgos,
            estadoIngreso: d.estadoIngreso ?? 'Pendiente',
            observaciones: d.observaciones ?? "",
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : null,
          };
        });
        setIngresos(data);
      },
      (error) => {
        console.error(error);
        setError("Error al cargar las empresas subcontratistas.");
      }
    );

    return () => unsubscribe();
  }, [obraSeleccionadaId]);


  const resetForm = () => {
    setRazonSocial('');
    setRutEmpresa('');
    setRepresentante('');
    setMutualidad('');
    setTipoTrabajo('');
    setCantidadTrabajadores('');
    setFechaIngreso(new Date().toISOString().split('T')[0]);
    setEstadoIngreso('Pendiente');
    setObservaciones('');
    setDocContratoOC(false);
    setDocMutualAlDia(false);
    setDocListadoPersonal(false);
    setDocInduccionRealizada(false);
    setDocReglamentoFirmado(false);
    setDocMatrizRiesgos(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensajeOk(null);

    if (!obraSeleccionadaId) {
      setError("Debes seleccionar una obra antes de registrar una empresa subcontratista.");
      return;
    }
    
    if (!razonSocial || !rutEmpresa) {
        setError("Razón Social y RUT de la empresa son obligatorios.");
        return;
    }

    try {
        setGuardando(true);
        await addDoc(
            collection(firebaseDb, "obras", obraSeleccionadaId, "empresasSubcontratistasDs44"),
            {
              obraId: obraSeleccionadaId,
              rutEmpresa,
              razonSocial,
              representante,
              mutualidad,
              tipoTrabajo,
              cantidadTrabajadores: Number(cantidadTrabajadores) || 0,
              fechaIngreso,
              docContratoOC,
              docMutualAlDia,
              docListadoPersonal,
              docInduccionRealizada,
              docReglamentoFirmado,
              docMatrizRiesgos,
              estadoIngreso,
              observaciones: observaciones || "",
              createdAt: serverTimestamp(),
            }
        );
        setMensajeOk("Empresa subcontratista registrada correctamente.");
        resetForm();
    } catch (err) {
        console.error(err);
        setError("Error al registrar la empresa subcontratista. Intenta nuevamente.");
    } finally {
        setGuardando(false);
    }
  };
  
  const countDocsOk = (ingreso: IngresoEmpresa) => {
    let count = 0;
    if (ingreso.docContratoOC) count++;
    if (ingreso.docMutualAlDia) count++;
    if (ingreso.docListadoPersonal) count++;
    if (ingreso.docInduccionRealizada) count++;
    if (ingreso.docReglamentoFirmado) count++;
    if (ingreso.docMatrizRiesgos) count++;
    return count;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Ingreso empresa subcontratista – DS44</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Este formulario guía al prevencionista en los requisitos de ingreso a obra según DS44. Los datos se guardan en Firestore.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Obra a Evaluar</CardTitle></CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="obra-select">Seleccione una obra</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccione una obra" /></SelectTrigger>
              <SelectContent>
                {obras.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Formulario de Ingreso de Empresa</CardTitle>
            <CardDescription>Complete los datos de la empresa y el checklist de requisitos documentales y de gestión.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. Datos de la Empresa y del Trabajo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2"><Label htmlFor="razonSocial">Razón Social*</Label><Input id="razonSocial" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="rutEmpresa">RUT Empresa*</Label><Input id="rutEmpresa" value={rutEmpresa} onChange={e => setRutEmpresa(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="representante">Representante Legal</Label><Input id="representante" value={representante} onChange={e => setRepresentante(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="mutualidad">Mutualidad*</Label><Input id="mutualidad" value={mutualidad} onChange={e => setMutualidad(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="tipoTrabajo">Tipo de Trabajo*</Label><Input id="tipoTrabajo" value={tipoTrabajo} onChange={e => setTipoTrabajo(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="cantidadTrabajadores">Nº aprox. de trabajadores</Label><Input id="cantidadTrabajadores" type="number" value={cantidadTrabajadores} onChange={e => setCantidadTrabajadores(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="fechaIngreso">Fecha de Ingreso*</Label><Input id="fechaIngreso" type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} /></div>
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Checklist de Requisitos DS44</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-center space-x-2"><Checkbox id="docContratoOC" checked={docContratoOC} onCheckedChange={c => setDocContratoOC(!!c)} /><Label htmlFor="docContratoOC">Contrato u orden de compra vigente</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docMutualAlDia" checked={docMutualAlDia} onCheckedChange={c => setDocMutualAlDia(!!c)} /><Label htmlFor="docMutualAlDia">Afiliación a mutual y cotizaciones al día</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docListadoPersonal" checked={docListadoPersonal} onCheckedChange={c => setDocListadoPersonal(!!c)} /><Label htmlFor="docListadoPersonal">Listado de personal que ingresará a la obra</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docInduccionRealizada" checked={docInduccionRealizada} onCheckedChange={c => setDocInduccionRealizada(!!c)} /><Label htmlFor="docInduccionRealizada">Inducción de seguridad realizada / programada</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docReglamentoFirmado" checked={docReglamentoFirmado} onCheckedChange={c => setDocReglamentoFirmado(!!c)} /><Label htmlFor="docReglamentoFirmado">Reglamento interno / especial entregado y firmado</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docMatrizRiesgos" checked={docMatrizRiesgos} onCheckedChange={c => setDocMatrizRiesgos(!!c)} /><Label htmlFor="docMatrizRiesgos">Matriz de riesgos / análisis de trabajo entregado</Label></div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Evaluación y Registro</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="estadoIngreso">Estado de Ingreso*</Label>
                  <Select value={estadoIngreso} onValueChange={(v) => setEstadoIngreso(v as EstadoIngreso)}>
                    <SelectTrigger id="estadoIngreso"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS_INGRESO.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea id="observaciones" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej: Falta documento de cotizaciones de mutualidad. Se rechaza ingreso hasta regularizar." />
                </div>
              </div>
            </div>
            
            {error && <p className="text-sm font-medium text-destructive mt-4">{error}</p>}
            {mensajeOk && <p className="text-sm font-medium text-green-600 mt-4">{mensajeOk}</p>}

            <Button type="submit" disabled={guardando} className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
                {guardando ? "Registrando..." : "Registrar Ingreso de Empresa"}
            </Button>
          </CardContent>
        </Card>
      </form>
      
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ingresos Registrados</CardTitle>
          <CardDescription>Empresas evaluadas para la obra "{obras.find(o => o.id === obraSeleccionadaId)?.nombreFaena}".</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Razón Social / RUT</TableHead>
                  <TableHead>Mutualidad</TableHead>
                  <TableHead>Trabajo</TableHead>
                  <TableHead className="text-center">Nº Trab.</TableHead>
                  <TableHead className="text-center">Docs OK</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingresos.length > 0 ? (
                  ingresos.map(ingreso => (
                    <TableRow key={ingreso.id}>
                      <TableCell className="whitespace-nowrap">{ingreso.fechaIngreso}</TableCell>
                      <TableCell>
                        <div className="font-medium">{ingreso.razonSocial}</div>
                        <div className="text-xs text-muted-foreground">{ingreso.rutEmpresa}</div>
                      </TableCell>
                      <TableCell>{ingreso.mutualidad}</TableCell>
                      <TableCell>{ingreso.tipoTrabajo}</TableCell>
                      <TableCell className="text-center">{ingreso.cantidadTrabajadores}</TableCell>
                      <TableCell className="text-center font-medium">{countDocsOk(ingreso)}/6</TableCell>
                      <TableCell><EstadoBadge estado={ingreso.estadoIngreso} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay ingresos de empresas registrados para esta obra.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
