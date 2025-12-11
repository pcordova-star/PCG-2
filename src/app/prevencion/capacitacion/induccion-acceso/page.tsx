"use client";

import { useState, useRef, useEffect } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDocs, collection, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QrCode } from "lucide-react";
import { InduccionAccesoFaena } from "@/lib/prevencionEventos";
import { useAuth } from "@/context/AuthContext";
import { Label } from "@/components/ui/label";


// --- Tipos y Datos ---
type ObraCapacitacion = {
  id: string;
  nombreFaena: string;
};


// --- Componente Principal ---
export default function InduccionAccesoPage() {
  const { companyId, role } = useAuth();
  const [obras, setObras] = useState<ObraCapacitacion[]>([]);
  const [obraId, setObraId] = useState("");

  const [inducciones, setInducciones] = useState<InduccionAccesoFaena[]>([]);
  const [cargandoInducciones, setCargandoInducciones] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!companyId && role !== 'superadmin') return;

    let q;
    const obrasRef = collection(firebaseDb, "obras");
    if(role === 'superadmin') {
      q = query(obrasRef, orderBy("nombreFaena"));
    } else {
      q = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const obrasData: ObraCapacitacion[] = snapshot.docs.map(doc => ({
        id: doc.id,
        nombreFaena: doc.data().nombreFaena ?? "",
      }));
      setObras(obrasData);
      if (obrasData.length > 0 && !obraId) {
        setObraId(obrasData[0].id);
      }
    }, (err) => {
      console.error("Error fetching obras:", err);
      setError("No se pudieron cargar las obras.");
    });
    
    return () => unsub();
  }, [companyId, role]);

  useEffect(() => {
    if (!obraId) {
      setInducciones([]);
      return;
    }
    setCargandoInducciones(true);
    
    const q = query(
        collection(firebaseDb, "induccionesAccesoFaena"), 
        where("obraId", "==", obraId), 
        orderBy("createdAt", "desc")
    );
      
    const unsub = onSnapshot(q, (snapshot) => {
      const data: InduccionAccesoFaena[] = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...(d as any),
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
          }
      });
      setInducciones(data);
      setCargandoInducciones(false);
    }, (err) => {
        console.error("Error fetching inducciones:", err);
        setError("No se pudieron cargar los registros de inducción.");
        setCargandoInducciones(false);
    });
    
    return () => unsub();
  }, [obraId]);

  const obraSeleccionada = obras.find(o => o.id === obraId);

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Inducción de acceso a faena – Visitas
        </h1>
        <p className="text-lg text-muted-foreground">
          Este formulario está pensado para que personas externas (visitas,
          proveedores, inspectores, etc.) puedan realizar la inducción básica
          de acceso a la obra desde su teléfono, mediante un código QR.
        </p>
      </header>

        <Card>
          <CardHeader>
            <CardTitle>Selección de Obra y Generación de QR</CardTitle>
            <CardDescription>
              Seleccione una obra para generar el código QR que da acceso al formulario público de inducción.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="space-y-2 flex-grow">
              <Label htmlFor="obra-select">Obra / Faena</Label>
              <Select value={obraId} onValueChange={setObraId}>
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
            <Button asChild variant="outline" disabled={!obraId}>
              <Link href={`/prevencion/obras/${obraId}/qr-induccion`} target="_blank">
                <QrCode className="mr-2 h-4 w-4" />
                Generar QR de esta Obra
              </Link>
            </Button>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Inducción Guardados</CardTitle>
          <CardDescription>
            Inducciones guardadas para la obra: {obraSeleccionada?.nombreFaena ?? "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargandoInducciones ? (
            <p>Cargando registros...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : inducciones.length === 0 ? (
            <p>No hay inducciones registradas para esta obra.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inducciones.map((induccion) => (
                  <TableRow key={induccion.id}>
                    <TableCell>{induccion.fechaIngreso}</TableCell>
                    <TableCell>{induccion.nombreCompleto}</TableCell>
                    <TableCell>{induccion.rut}</TableCell>
                    <TableCell>{induccion.empresa}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(induccion.origenRegistro === 'qr' ? 'text-blue-600 border-blue-200 bg-blue-50' : '')}>
                          {induccion.origenRegistro ?? 'panel'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/prevencion/induccion-acceso-faena/${induccion.id}/imprimir`}>
                          Ver / Imprimir Ficha
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
