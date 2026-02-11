// src/components/noticias/WidgetAlertasNoticias.tsx
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, doc, getDoc, limit } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Newspaper, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../ui/badge';

type Alerta = {
    id: string;
    noticiaId: string;
    esCritica: boolean;
    tituloNoticia?: string; // Will be fetched separately
};

export function WidgetAlertasNoticias() {
    const { companyId, role } = useAuth();
    const [alertas, setAlertas] = useState<Alerta[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId || !['superadmin', 'admin_empresa', 'jefe_obra'].includes(role)) {
            setLoading(false);
            return;
        }

        const alertasQuery = query(
            collection(firebaseDb, 'alertasNoticias'),
            where('companyId', '==', companyId),
            where('estado', '==', 'pendiente'),
            limit(5)
        );

        const unsubscribe = onSnapshot(alertasQuery, async (snapshot) => {
            const alertasPendientes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Alerta));
            
            // Fetch titles for each alert
            const alertasConTitulo = await Promise.all(
                alertasPendientes.map(async (alerta) => {
                    try {
                        const noticiaDoc = await getDoc(doc(firebaseDb, 'noticiasExternas', alerta.noticiaId));
                        if (noticiaDoc.exists()) {
                            return { ...alerta, tituloNoticia: noticiaDoc.data().tituloOriginal };
                        }
                    } catch (error) {
                        console.error("Error fetching noticia title:", error);
                    }
                    return { ...alerta, tituloNoticia: "Título no disponible" };
                })
            );
            
            setAlertas(alertasConTitulo);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching news alerts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [companyId, role]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Newspaper className="h-6 w-6 text-primary" />
                    <CardTitle>Noticias y Alertas del Sector</CardTitle>
                </div>
                <CardDescription>Información contextual para apoyar tu gestión operativa.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : alertas.length === 0 ? (
                    <div className="text-center text-muted-foreground p-4">
                        <Info className="mx-auto h-8 w-8 mb-2" />
                        <p>No hay nuevas alertas para tu empresa.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {alertas.map(alerta => (
                            <li key={alerta.id}>
                                <Link href={`/alertas/noticias/${alerta.id}`} className="block p-3 rounded-md hover:bg-muted/50 transition-colors">
                                    <p className="font-semibold">{alerta.tituloNoticia}</p>
                                    {alerta.esCritica && (
                                        <Badge variant="destructive" className="mt-1 animate-pulse">ALERTA CRÍTICA</Badge>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
