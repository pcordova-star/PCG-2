
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertTriangle, ListTodo, Presentation, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Hallazgo, Charla } from '@/types/pcg';


export default function PanelPrevencionistaPage() {
    const { companyId, role, loading: authLoading } = useAuth();
    const [stats, setStats] = useState({
        hallazgosAbiertos: 0,
        hallazgosCriticos: 0,
        accionesPendientes: 0,
    });
    const [proximasCharlas, setProximasCharlas] = useState<Charla[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId) {
            if (!authLoading) setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Asumimos que hallazgos y charlas tienen companyId para una consulta eficiente.
                // Si la estructura es diferente (ej. por obra), esta lógica necesitaría ajuste.
                
                // Hallazgos
                const hallazgosQuery = query(
                    collection(firebaseDb, 'hallazgos'),
                    where('companyId', '==', companyId),
                    where('estado', '==', 'abierto')
                );
                const hallazgosSnap = await getDocs(hallazgosQuery);
                const hallazgosData = hallazgosSnap.docs.map(doc => doc.data() as Hallazgo);
                
                const hallazgosAbiertos = hallazgosData.length;
                const hallazgosCriticos = hallazgosData.filter(h => h.criticidad === 'alta').length;

                // Planes de acción (simplified query as an example)
                const accionesQuery = query(
                    collection(firebaseDb, 'planesDeAccion'), 
                    where('companyId', '==', companyId),
                    where('estado', '==', 'Pendiente')
                );
                const accionesSnap = await getDocs(accionesQuery);
                const accionesPendientes = accionesSnap.size;

                // Próximas Charlas
                const charlasQuery = query(
                    collection(firebaseDb, 'charlas'),
                    where('companyId', '==', companyId),
                    where('estado', '==', 'programada'),
                    orderBy('fechaRealizacion', 'asc'),
                    limit(3)
                );
                const charlasSnap = await getDocs(charlasQuery);
                const charlasData = charlasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Charla));
                
                setStats({ hallazgosAbiertos, hallazgosCriticos, accionesPendientes });
                setProximasCharlas(charlasData);

            } catch (error) {
                console.error("Error fetching prevention dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [companyId, authLoading]);

    const statCards = [
        { title: 'Hallazgos Abiertos', value: stats.hallazgosAbiertos, icon: AlertTriangle, color: stats.hallazgosAbiertos > 0 ? 'text-red-500' : 'text-green-500', href: '/prevencion/hallazgos' },
        { title: 'Hallazgos Críticos', value: stats.hallazgosCriticos, icon: AlertTriangle, color: stats.hallazgosCriticos > 0 ? 'text-red-700' : 'text-green-500', href: '/prevencion/hallazgos' },
        { title: 'Acciones Pendientes', value: stats.accionesPendientes, icon: ListTodo, color: 'text-yellow-500', href: '/prevencion/formularios-generales' }
    ];

    if (authLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    return (
        <div className="space-y-6">
             <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Prevención</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Panel del Prevencionista</h1>
                    <p className="text-muted-foreground">Resumen de indicadores y tareas clave de seguridad y salud ocupacional.</p>
                </div>
            </header>
            
            {loading ? (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card><CardHeader><CardTitle>Cargando...</CardTitle></CardHeader><CardContent><Loader2 className="animate-spin"/></CardContent></Card>
                    <Card><CardHeader><CardTitle>Cargando...</CardTitle></CardHeader><CardContent><Loader2 className="animate-spin"/></CardContent></Card>
                    <Card><CardHeader><CardTitle>Cargando...</CardTitle></CardHeader><CardContent><Loader2 className="animate-spin"/></CardContent></Card>
                </div>
            ) : (
                 <div className="grid gap-4 md:grid-cols-3">
                    {statCards.map(card => (
                         <Card key={card.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="ghost" size="sm" className="p-0 h-auto">
                                    <Link href={card.href}>Ver detalle &rarr;</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
            
            <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Presentation/> Próximas Charlas Programadas</CardTitle>
                        <CardDescription>Charlas de seguridad que deben realizarse próximamente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="animate-spin"/> : proximasCharlas.length === 0 ? (
                             <p className="text-sm text-muted-foreground">No hay charlas programadas.</p>
                        ) : (
                            <ul className="space-y-2">
                                {proximasCharlas.map(charla => (
                                    <li key={charla.id} className="text-sm">
                                        <strong>{charla.titulo}</strong> - Fecha: {charla.fechaCreacion ? charla.fechaCreacion.toDate().toLocaleDateString('es-CL') : 'N/A'}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                        <CardDescription>Últimos eventos registrados en el módulo de prevención.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm text-muted-foreground">Funcionalidad en desarrollo.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
