"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, updateDoc, collectionGroup, query, where, orderBy } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Company } from '@/types/pcg';

type Obra = {
  id: string;
  nombreFaena: string;
  direccion?: string;
  estado?: 'Activa' | 'Terminada' | 'Pausada' | 'Inactiva';
  creadoEn: { toDate: () => Date };
  companyId: string;
  companyName?: string;
};

export default function AdminGlobalObrasPage() {
  const { customClaims, loading: authLoading } = useAuth();
  const router = useRouter();

  const [obras, setObras] = useState<Obra[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  useEffect(() => {
    if (authLoading) return;
    if (customClaims?.role !== 'SUPER_ADMIN') {
      // Idealmente, esto se manejaría con middleware o en el layout,
      // pero por seguridad lo dejamos aquí también.
      router.replace('/dashboard');
    }
  }, [customClaims, authLoading, router]);
  
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Obtener todas las compañías para mapear nombres
        const companiesQuery = query(collection(firebaseDb, 'companies'));
        const companiesSnapshot = await getDocs(companiesQuery);
        const companiesData = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
        setCompanies(companiesData);
        const companyMap = new Map(companiesData.map(c => [c.id, c.nombre]));

        // 2. Usar collectionGroup para obtener todas las obras
        const obrasQuery = query(collectionGroup(firebaseDb, 'obras'), orderBy('creadoEn', 'desc'));
        const obrasSnapshot = await getDocs(obrasQuery);
        const obrasData = obrasSnapshot.docs.map(doc => {
          const companyId = doc.ref.parent.parent!.id;
          return {
            id: doc.id,
            companyId: companyId,
            companyName: companyMap.get(companyId) || 'Empresa Desconocida',
            ...doc.data()
          } as Obra;
        });
        setObras(obrasData);
      } catch (err) {
        console.error("Error fetching global obras:", err);
        setError("No se pudieron cargar todas las obras. Revisa los permisos de Firestore.");
      } finally {
        setLoading(false);
      }
    };
    
    if (customClaims?.role === 'SUPER_ADMIN') {
        fetchAllData();
    }

  }, [customClaims]);

  const obrasFiltradas = useMemo(() => {
    return obras.filter(obra => {
      const matchNombre = filtroNombre === '' || obra.nombreFaena.toLowerCase().includes(filtroNombre.toLowerCase());
      const matchEstado = filtroEstado === 'Todos' || obra.estado === filtroEstado;
      return matchNombre && matchEstado;
    });
  }, [obras, filtroNombre, filtroEstado]);

  const handleEstadoChange = async (obraId: string, companyId: string, nuevoEstado: Obra['estado']) => {
    try {
      const obraRef = doc(firebaseDb, "companies", companyId, "obras", obraId);
      await updateDoc(obraRef, { estado: nuevoEstado });
      setObras(prevObras => prevObras.map(o => o.id === obraId ? { ...o, estado: nuevoEstado } : o));
    } catch (err) {
      console.error("Error updating obra state:", err);
      setError("No se pudo actualizar el estado de la obra.");
    }
  };
  
  if (authLoading || customClaims?.role !== 'SUPER_ADMIN') {
    return (
        <div className="flex justify-center items-center h-full">
            <p>Verificando permisos...</p>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Panel Global de Obras</h1>
        <p className="text-muted-foreground">Supervisa y gestiona todas las obras registradas en la plataforma.</p>
      </header>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
           <CardDescription>
            Usa los filtros para encontrar obras específicas en todo el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
            <Input 
                placeholder="Buscar por nombre de obra..."
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
            />
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="md:w-[200px]">
                    <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Todos">Todos los estados</SelectItem>
                    <SelectItem value="Activa">Activa</SelectItem>
                    <SelectItem value="Inactiva">Inactiva</SelectItem>
                    <SelectItem value="Terminada">Terminada</SelectItem>
                    <SelectItem value="Pausada">Pausada</SelectItem>
                </SelectContent>
            </Select>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Todas las Obras</CardTitle>
          <CardDescription>
            {loading ? "Cargando obras..." : `Mostrando ${obrasFiltradas.length} de ${obras.length} obras.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Obra</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creada En</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : obrasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No hay obras que coincidan con los filtros.</TableCell>
                  </TableRow>
                ) : (
                  obrasFiltradas.map((obra) => (
                    <TableRow key={obra.id}>
                      <TableCell className="font-medium">{obra.nombreFaena}</TableCell>
                      <TableCell>{obra.companyName}</TableCell>
                      <TableCell>{obra.direccion || 'N/A'}</TableCell>
                      <TableCell>
                          <Badge variant={obra.estado === 'Activa' ? 'default' : 'secondary'}>
                            {obra.estado || 'No definido'}
                          </Badge>
                      </TableCell>
                      <TableCell>{obra.creadoEn ? obra.creadoEn.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" disabled>Ver Detalle</Button>
                            {obra.estado === 'Activa' ? (
                                <Button variant="destructive" size="sm" onClick={() => handleEstadoChange(obra.id, obra.companyId, 'Inactiva')}>
                                    Desactivar
                                </Button>
                            ) : (
                                 <Button variant="default" size="sm" onClick={() => handleEstadoChange(obra.id, obra.companyId, 'Activa')}>
                                    Activar
                                </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
