// src/app/(pcg)/control-acceso/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { ArrowLeft, Download, Eye, Loader2 } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { Obra, AccesoRegistro, InduccionContextualRegistro } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';

export default function ControlAccesoAdminPage() {
  const { companyId, role } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState('');
  
  const [registrosAcceso, setRegistrosAcceso] = useState<AccesoRegistro[]>([]);
  const [registrosInduccion, setRegistrosInduccion] = useState<InduccionContextualRegistro[]>([]);
  
  const [loadingAcceso, setLoadingAcceso] = useState(true);
  const [loadingInduccion, setLoadingInduccion] = useState(true);
  const [qrUrl, setQrUrl] = useState('');
  const { toast } = useToast();

  const [selectedInduccion, setSelectedInduccion] = useState<InduccionContextualRegistro | null>(null);

  useEffect(() => {
    if (!companyId && role !== 'superadmin') return;
    const fetchObras = async () => {
      let q;
      const obrasRef = collection(firebaseDb, "obras");
      if (role === 'superadmin') {
        q = query(obrasRef, orderBy("nombreFaena"));
      } else {
        q = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
      }
      const snapshot = await getDocs(q);
      const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
      setObras(obrasList);
      if (obrasList.length > 0 && !selectedObraId) {
        setSelectedObraId(obrasList[0].id);
      }
    };
    fetchObras();
  }, [companyId, role, selectedObraId]);

  useEffect(() => {
    if (selectedObraId) {
      setQrUrl(`https://pcgoperacion.com/public/control-acceso/${selectedObraId}`);
      
      setLoadingAcceso(true);
      const qAcceso = query(
        collection(firebaseDb, "controlAcceso"),
        where("obraId", "==", selectedObraId),
        orderBy("createdAt", "desc")
      );
      const unsubAcceso = onSnapshot(qAcceso, (snapshot) => {
        setRegistrosAcceso(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccesoRegistro)));
        setLoadingAcceso(false);
      });

      setLoadingInduccion(true);
      const qInduccion = query(
        collection(firebaseDb, "registrosInduccionContextual"),
        where("obraId", "==", selectedObraId),
        orderBy("createdAt", "desc")
      );
      const unsubInduccion = onSnapshot(qInduccion, (snapshot) => {
        setRegistrosInduccion(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InduccionContextualRegistro)));
        setLoadingInduccion(false);
      });

      return () => {
        unsubAcceso();
        unsubInduccion();
      };
    } else {
      setRegistrosAcceso([]);
      setRegistrosInduccion([]);
      setQrUrl('');
      setLoadingAcceso(false);
      setLoadingInduccion(false);
    }
  }, [selectedObraId]);
  
  const downloadQrCode = () => {
    toast({
      title: "Cómo descargar el QR",
      description: "Haz clic derecho sobre el código QR y selecciona 'Guardar imagen como...' para descargarlo.",
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Control de Acceso a Obra</h1>
          <p className="text-muted-foreground">Genera QR de auto-registro, revisa ingresos a faena y audita las inducciones de IA.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Generador de QR</CardTitle>
            <CardDescription>Selecciona una obra para generar el código QR de auto-registro para visitas y proveedores.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div className="w-full max-w-[250px] space-y-2 mb-4">
              <Label htmlFor="obra-select">Obra</Label>
              <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccione obra..." /></SelectTrigger>
                <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {qrUrl && (
              <>
                <div className="p-4 bg-white rounded-lg border">
                  <QRCode id="qr-code-svg" value={qrUrl} size={200} />
                </div>
                <p className="text-xs text-muted-foreground mt-2 break-all">{qrUrl}</p>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={downloadQrCode} disabled={!selectedObraId} className="w-full">
              <Download className="mr-2 h-4 w-4"/> Instrucciones de Descarga
            </Button>
          </CardFooter>
        </Card>

        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Registros de Inducción Contextual (IA)</CardTitle>
                    <CardDescription>Auditoría de las últimas micro-inducciones generadas por la IA para esta obra.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>RUT</TableHead>
                                <TableHead>Tarea Declarada</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingInduccion ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : registrosInduccion.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No hay registros de inducción para esta obra.</TableCell></TableRow>
                            ) : (
                                registrosInduccion.map((reg) => (
                                    <TableRow key={reg.id}>
                                        <TableCell>{reg.fechaConfirmacion?.toDate().toLocaleDateString('es-CL') || 'Pendiente'}</TableCell>
                                        <TableCell className="font-medium">{reg.persona?.nombre || 'N/A'}</TableCell>
                                        <TableCell>{reg.persona?.rut || 'N/A'}</TableCell>
                                        <TableCell className="text-xs italic">"{reg.contexto?.descripcionTarea || 'N/A'}"</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => setSelectedInduccion(reg)}>
                                                <Eye className="mr-2 h-4 w-4"/> Ver Inducción
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Registros de Ingreso</CardTitle>
                    <CardDescription>Listado de las últimas personas que han ingresado a la obra seleccionada.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>RUT</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead className="text-right">Archivo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingAcceso ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : registrosAcceso.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">No hay registros para esta obra.</TableCell></TableRow>
                            ) : (
                            registrosAcceso.map((reg) => (
                                <TableRow key={reg.id}>
                                <TableCell>{reg.createdAt.toDate().toLocaleDateString('es-CL')}</TableCell>
                                <TableCell className="font-medium">{reg.nombre}</TableCell>
                                <TableCell>{reg.rut}</TableCell>
                                <TableCell>{reg.empresa}</TableCell>
                                <TableCell>{reg.motivo}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                    <a href={reg.archivoUrl} target="_blank" rel="noopener noreferrer">Ver</a>
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>

       <Dialog open={!!selectedInduccion} onOpenChange={() => setSelectedInduccion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de la Inducción</DialogTitle>
            <DialogDescription>
              Este fue el texto exacto que se le presentó al usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 text-sm">
            <p><strong>Usuario:</strong> {selectedInduccion?.persona?.nombre}</p>
            <p><strong>Fecha:</strong> {selectedInduccion?.fechaConfirmacion?.toDate().toLocaleString('es-CL')}</p>
            <p><strong>Tarea declarada:</strong> "{selectedInduccion?.contexto?.descripcionTarea}"</p>
            <div className="mt-4 p-4 bg-muted rounded-md border text-muted-foreground whitespace-pre-wrap">
              {selectedInduccion?.inductionText}
            </div>
             {selectedInduccion?.audioUrl && (
                <div className="mt-4">
                    <Label>Audio de la Inducción</Label>
                    <audio controls src={selectedInduccion.audioUrl} className="w-full mt-1">
                        Tu navegador no soporta el audio.
                    </audio>
                </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
