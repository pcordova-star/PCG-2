// src/app/(pcg)/control-acceso/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { Obra, AccesoRegistro } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';

export default function ControlAccesoAdminPage() {
  const { companyId, role } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState('');
  const [registros, setRegistros] = useState<AccesoRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState('');
  const { toast } = useToast();

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
      const obrasList = snapshot.docs.map(doc => ({ id: doc.id, nombreFaena: doc.data().nombreFaena } as Obra));
      setObras(obrasList);
      if (obrasList.length > 0) {
        setSelectedObraId(obrasList[0].id);
      }
    };
    fetchObras();
  }, [companyId, role]);

  useEffect(() => {
    if (selectedObraId) {
      const publicAppUrl = 'https://pcgoperacion.com';
      setQrUrl(`${publicAppUrl}/public/control-acceso/${selectedObraId}`);
      
      setLoading(true);
      const q = query(
        collection(firebaseDb, "controlAcceso"),
        where("obraId", "==", selectedObraId),
        orderBy("createdAt", "desc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as AccesoRegistro));
        setRegistros(data);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setRegistros([]);
      setQrUrl('');
      setLoading(false);
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
          <p className="text-muted-foreground">Genera QR de auto-registro y revisa los ingresos a faena.</p>
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

        <Card className="lg:col-span-2">
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
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                ) : registros.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">No hay registros para esta obra.</TableCell></TableRow>
                ) : (
                  registros.map((reg) => (
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
  );
}
