// src/app/prevencion/formularios-generales/components/InvestigacionAccidentesTab.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ArbolCausasEditor } from './ArbolCausasEditor';
import { PlanAccionEditor } from './PlanAccionEditor';
import { generarInvestigacionAccidentePdf } from '@/lib/pdf/generarInvestigacionAccidentePdf';
import { firebaseDb } from '@/lib/firebaseClient';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { RegistroIncidente, Obra } from '@/types/pcg';
import { FileText } from 'lucide-react';

interface Props {
  obraId: string;
  investigaciones: RegistroIncidente[];
  loading: boolean;
  onUpdate: () => void;
}

const initialFormState: Omit<RegistroIncidente, 'id' | 'obraId' | 'obraNombre' | 'createdAt'> = {
  fecha: new Date().toISOString().slice(0, 10),
  lugar: "",
  tipoIncidente: "Accidente sin tiempo perdido",
  gravedad: "Leve",
  descripcionHecho: "",
  lesionDescripcion: "",
  parteCuerpoAfectada: "",
  agenteAccidente: "",
  mecanismoAccidente: "",
  diasReposoMedico: null,
  huboTiempoPerdido: false,
  esAccidenteGraveFatal: false,
  actoInseguro: "",
  condicionInsegura: "",
  causasInmediatas: "",
  causasBasicas: "",
  analisisIshikawa: "",
  analisis5Porques: "",
  medidasCorrectivas: "",
  responsableSeguimiento: "",
  plazoCierre: "",
  estadoCierre: "Abierto",
  metodoAnalisis: 'arbol_causas',
  arbolCausas: { habilitado: true, raizId: null, nodos: {} },
  medidasCorrectivasDetalladas: [],
};

export function InvestigacionAccidentesTab({ obraId, investigaciones, loading, onUpdate }: Props) {
  const [formState, setFormState] = useState(initialFormState);
  const [obra, setObra] = useState<Obra | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if(obraId) {
        const fetchObra = async () => {
            const obraRef = doc(firebaseDb, "obras", obraId);
            const obraSnap = await getDoc(obraRef);
            if(obraSnap.exists()) {
                setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
            }
        }
        fetchObra();
    }
  }, [obraId]);

  const handleInputChange = <K extends keyof typeof formState>(campo: K, valor: (typeof formState)[K]) => {
    setFormState(prev => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraId) {
      setError("Seleccione una obra.");
      return;
    }
    setError(null);
    try {
      await addDoc(collection(firebaseDb, "investigacionesIncidentes"), {
        ...formState,
        obraId,
        obraNombre: obra?.nombreFaena || "N/A",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setFormState(initialFormState);
      onUpdate();
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la investigación.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Registrar Nuevo Accidente</CardTitle>
          <CardDescription>Use este formulario para registrar accidentes que requieren un análisis con Árbol de Causas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Accidente</Label>
                <Select value={formState.tipoIncidente} onValueChange={v => handleInputChange('tipoIncidente', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Accidente sin tiempo perdido">Accidente sin tiempo perdido</SelectItem>
                    <SelectItem value="Accidente con tiempo perdido">Accidente con tiempo perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha del Suceso</Label>
                <Input type="date" value={formState.fecha} onChange={e => handleInputChange('fecha', e.target.value)} />
              </div>
            </div>

            <Separator />
            <h4 className="text-md font-semibold">Datos Específicos del Accidente</h4>
             <div className="space-y-2"><Label>Descripción del Hecho</Label><Textarea value={formState.descripcionHecho} onChange={e => handleInputChange('descripcionHecho', e.target.value)} /></div>
             <div className="space-y-2"><Label>Lesión Producida</Label><Textarea value={formState.lesionDescripcion} onChange={e => handleInputChange('lesionDescripcion', e.target.value)} rows={2} /></div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2"><Label>Parte del Cuerpo Afectada</Label><Input value={formState.parteCuerpoAfectada} onChange={e => handleInputChange('parteCuerpoAfectada', e.target.value)} /></div>
               <div className="space-y-2"><Label>Días de Reposo Médico</Label><Input type="number" value={formState.diasReposoMedico ?? ''} onChange={e => handleInputChange('diasReposoMedico', e.target.value === '' ? null : Number(e.target.value))} /></div>
             </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Agente del Accidente</Label><Input value={formState.agenteAccidente} onChange={e => handleInputChange('agenteAccidente', e.target.value)} /></div>
               <div className="space-y-2"><Label>Mecanismo del Accidente</Label><Input value={formState.mecanismoAccidente} onChange={e => handleInputChange('mecanismoAccidente', e.target.value)} /></div>
             </div>
             <div className="flex items-center space-x-2"><Switch id="grave-fatal" checked={formState.esAccidenteGraveFatal ?? false} onCheckedChange={c => handleInputChange('esAccidenteGraveFatal', c)} /><Label htmlFor="grave-fatal">¿Corresponde a accidente grave/fatal?</Label></div>
             
             <Separator/>
            <ArbolCausasEditor 
                value={formState.arbolCausas} 
                onChange={arbol => handleInputChange('arbolCausas', arbol)} 
            />

            <Separator/>
            <PlanAccionEditor 
                arbolCausas={formState.arbolCausas}
                medidas={formState.medidasCorrectivasDetalladas}
                onChange={medidas => handleInputChange('medidasCorrectivasDetalladas', medidas)}
            />
            
            <Button type="submit">Registrar Accidente</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Accidentes Registrados</CardTitle>
          <CardDescription>Accidentes que utilizan el método de Árbol de Causas.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p>Cargando...</p> : investigaciones.length === 0 ? <p className="text-muted-foreground text-sm">No hay accidentes registrados para esta obra.</p> : (
            <div className="space-y-3 max-h-[800px] overflow-y-auto">
              {investigaciones.map(inv => (
                <article key={inv.id} className="border p-3 rounded-lg text-sm space-y-2">
                    <div className="flex justify-between items-start">
                        <p className="font-semibold">{inv.descripcionHecho}</p>
                        <Badge variant="outline">Árbol de Causas</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{inv.fecha} - {inv.lugar}</p>
                     {obra && <Button size="sm" variant="secondary" onClick={() => generarInvestigacionAccidentePdf(inv, obra)}><FileText className="h-4 w-4 mr-2" />Generar Informe</Button>}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
