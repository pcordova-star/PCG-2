// src/app/checklists-operacionales/respuestas/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Eye } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OperationalChecklistRecord, Obra } from '@/types/pcg';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function OperationalChecklistRecordsPage() {
    const { user, companyId } = useAuth();
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('__all__');
    const [records, setRecords] = useState<OperationalChecklistRecord[]>([]);
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        if (!companyId) return;

        const obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId));
        const unsubObras = onSnapshot(obrasQuery, (snapshot) => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
        });
        return () => unsubObras();
    }, [companyId]);

    useEffect(() => {
        if (!companyId) {
             setRecords([]);
             setLoading(false);
             return;
        };

        setLoading(true);
        let recordsQuery;
        
        const baseQuery = collection(firebaseDb, "operationalChecklistRecords");
        const companyFilter = where("companyId", "==", companyId);

        if(selectedObraId === '__all__') {
             recordsQuery = query(
                baseQuery,
                companyFilter,
                orderBy("filledAt", "desc")
            );
        } else {
            recordsQuery = query(
                baseQuery,
                companyFilter,
                where("obraId", "==", selectedObraId),
                orderBy("filledAt", "desc")
            );
        }

        const unsubscribe = onSnapshot(recordsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OperationalChecklistRecord));
            setRecords(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching records: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [companyId, selectedObraId]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/checklists-operacionales">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registros de Checklists Operacionales</h1>
          <p className="text-muted-foreground">
            Historial de todos los formularios completados.
          </p>
        </div>
      </header>
       <Card>
        <CardHeader>
          <CardTitle>Filtro por Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Label>Filtrar por obra</Label>
            <Select value={selectedObraId} onValueChange={(val) => setSelectedObraId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las obras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las obras</SelectItem>
                {obras.map(obra => (
                  <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Historial de Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No se han completado formularios que coincidan con el filtro.</p>
            </div>
          ) : (
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nombre Formulario</TableHead>
                  <TableHead>Completado Por</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(record => (
                  <TableRow key={record.id}>
                    <TableCell>{record.filledAt.toDate().toLocaleString('es-CL')}</TableCell>
                    <TableCell className="font-medium">{record.templateTitleSnapshot}</TableCell>
                    <TableCell>{record.filledByEmail}</TableCell>
                    <TableCell>{record.header?.sector || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/checklists-operacionales/respuestas/${record.id}`}>
                           <Eye className="mr-2 h-4 w-4" /> Ver Detalle
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

    </div>
  );
}
