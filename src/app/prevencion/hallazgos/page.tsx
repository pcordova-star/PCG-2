// src/app/prevencion/hallazgos/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Hallazgo, Obra } from '@/types/pcg';
import Link from 'next/link';
import { ArrowLeft, FileText, PlusCircle, CheckCircle, AlertTriangle, Clock, Siren } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/context/AuthContext';

function HallazgoEstadoBadge({ estado }: { estado: Hallazgo['estado'] }) {
    const variants: Record<Hallazgo['estado'], string> = {
        abierto: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        en_progreso: 'bg-blue-100 text-blue-800 border-blue-300',
        cerrado: 'bg-green-100 text-green-800 border-green-300',
    };
    return <Badge variant="outline" className={variants[estado]}>{estado.replace('_', ' ')}</Badge>;
}

function CriticidadBadge({ criticidad }: { criticidad: Hallazgo['criticidad'] }) {
    const variants: Record<Hallazgo['criticidad'], string> = {
        baja: 'bg-green-100 text-green-800 border-green-300',
        media: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        alta: 'bg-red-100 text-red-800 border-red-300',
    };
    return <Badge variant="outline" className={variants[criticidad]}>{criticidad}</Badge>;
}

export default function HallazgosResumenPage() {
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { companyId, role } = useAuth();

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        const fetchObras = async () => {
            let obrasQuery;
            if (role === 'superadmin') {
                obrasQuery = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
            } else {
                obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
            }
            
            const snapshot = await getDocs(obrasQuery);
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            if (obrasList.length > 0) {
                setSelectedObraId(obrasList[0].id);
            }
        };
        fetchObras();
    }, [companyId, role]);

    useEffect(() => {
        if (!selectedObraId) {
            setHallazgos([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(collection(firebaseDb, "hallazgos"), where("obraId", "==", selectedObraId), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const hallazgosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hallazgo));
            setHallazgos(hallazgosList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedObraId]);

    const metricas = useMemo(() => {
        return {
            total: hallazgos.length,
            abiertos: hallazgos.filter(h => h.estado === 'abierto').length,
            enProgreso: hallazgos.filter(h => h.estado === 'en_progreso').length,
            cerrados: hallazgos.filter(h => h.estado === 'cerrado').length,
            criticos: hallazgos.filter(h => h.criticidad === 'alta').length,
        };
    }, [hallazgos]);

    const resumenPorRiesgo = useMemo(() => {
        const porRiesgo: Record<string, { total: number, abiertos: number, cerrados: number }> = {};
        hallazgos.forEach(h => {
            if (!porRiesgo[h.tipoRiesgo]) {
                porRiesgo[h.tipoRiesgo] = { total: 0, abiertos: 0, cerrados: 0 };
            }
            porRiesgo[h.tipoRiesgo].total++;
            if (h.estado === 'abierto' || h.estado === 'en_progreso') {
                porRiesgo[h.tipoRiesgo].abiertos++;
            } else if (h.estado === 'cerrado') {
                porRiesgo[h.tipoRiesgo].cerrados++;
            }
        });
        return Object.entries(porRiesgo).map(([tipo, datos]) => ({ tipo, ...datos }));
    }, [hallazgos]);
    
    const resumenPorCriticidad = useMemo(() => {
        return [
            { name: 'Baja', count: hallazgos.filter(h => h.criticidad === 'baja').length, fill: '#22c55e' },
            { name: 'Media', count: hallazgos.filter(h => h.criticidad === 'media').length, fill: '#facc15' },
            { name: 'Alta', count: hallazgos.filter(h => h.criticidad === 'alta').length, fill: '#ef4444' },
        ]
    }, [hallazgos]);

    const hallazgosCriticos = useMemo(() => {
        return hallazgos.filter(h => h.criticidad === 'alta').slice(0, 5);
    }, [hallazgos]);
    
    const selectedObra = obras.find(o => o.id === selectedObraId);

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/prevencion')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Hallazgos</h1>
                        <p className="text-muted-foreground">Análisis y seguimiento de los hallazgos de seguridad en terreno.</p>
                    </div>
                </div>
                 <div className="flex gap-2">
                    <Button onClick={() => router.push('/prevencion/hallazgos/crear')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Hallazgo
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/prevencion/hallazgos/equipo-responsable')}>
                        Configurar Equipo
                    </Button>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Selección de Obra</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-sm">
                        <Label htmlFor="obra-select">Obra Activa</Label>
                        <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                            <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                            <SelectContent>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Hallazgos</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{loading ? '...' : metricas.total}</div>
                        <p className="text-xs text-muted-foreground">Registros en la obra seleccionada</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Abiertos</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{loading ? '...' : metricas.abiertos}</div>
                        <p className="text-xs text-muted-foreground">Pendientes de gestión</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{loading ? '...' : metricas.enProgreso}</div>
                        <p className="text-xs text-muted-foreground">Con plan de acción iniciado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cerrados</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{loading ? '...' : metricas.cerrados}</div>
                        <p className="text-xs text-muted-foreground">Gestionados y verificados</p>
                    </CardContent>
                </Card>
                <Card className="border-red-500 bg-red-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-800">Críticos (Nivel Alto)</CardTitle>
                        <Siren className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-red-900">{loading ? '...' : metricas.criticos}</div>
                        <p className="text-xs text-red-700">Requieren acción inmediata</p>
                    </CardContent>
                </Card>
            </section>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-start">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Hallazgos por Criticidad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <p>Cargando...</p> : (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={resumenPorCriticidad} layout="vertical" margin={{ left: 10 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Hallazgos" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Hallazgos por Tipo de Riesgo</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {loading ? <p>Cargando...</p> : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo de Riesgo</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="text-center">Abiertos</TableHead>
                                        <TableHead className="text-center">Cerrados</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {resumenPorRiesgo.map(item => (
                                        <TableRow key={item.tipo}>
                                            <TableCell className="font-medium">{item.tipo}</TableCell>
                                            <TableCell className="text-center font-bold">{item.total}</TableCell>
                                            <TableCell className="text-center text-yellow-600">{item.abiertos}</TableCell>
                                            <TableCell className="text-center text-green-600">{item.cerrados}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Últimos Hallazgos Críticos (Nivel Alto)</CardTitle>
                    <CardDescription>Estos son los 5 hallazgos más recientes que requieren atención prioritaria.</CardDescription>
                </CardHeader>
                <CardContent>
                     {loading ? <p>Cargando...</p> : hallazgosCriticos.length === 0 ? <p className="text-muted-foreground text-center py-4">No hay hallazgos críticos registrados.</p> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo de Riesgo</TableHead>
                                    <TableHead>Detalle</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {hallazgosCriticos.map(h => (
                                    <TableRow key={h.id}>
                                        <TableCell>{h.createdAt.toDate().toLocaleDateString('es-CL')}</TableCell>
                                        <TableCell>{h.tipoRiesgo}</TableCell>
                                        <TableCell>{h.descripcion}</TableCell>
                                        <TableCell><HallazgoEstadoBadge estado={h.estado} /></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/prevencion/hallazgos/detalle/${h.id}`}>
                                                    Ver Detalle
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
