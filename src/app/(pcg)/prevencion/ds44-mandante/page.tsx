
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Building, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Obra } from '@/types/pcg';

export default function Ds44MandantePage() {
    const { companyId, role } = useAuth();
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [loadingObras, setLoadingObras] = useState(true);
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;
        
        let q;
        const obrasRef = collection(firebaseDb, "obras");
        if (role === 'superadmin') {
            q = query(obrasRef, orderBy("nombreFaena"));
        } else {
            q = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
        }
        
        getDocs(q).then((snapshot) => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            if (obrasList.length > 0) {
                setSelectedObraId(obrasList[0].id);
            }
            setLoadingObras(false);
        });
    }, [companyId, role]);

    const selectedObra = obras.find(o => o.id === selectedObraId);

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Prevención</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">DS44 – Ficha Mandante / Obra</h1>
                    <p className="text-muted-foreground">Gestión de la coordinación de actividades preventivas para la obra principal.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Selección de Obra</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md space-y-2">
                        <Label htmlFor="obra-select">Obra</Label>
                        <Select value={selectedObraId} onValueChange={setSelectedObraId} disabled={loadingObras}>
                            <SelectTrigger id="obra-select">
                                <SelectValue placeholder={loadingObras ? "Cargando obras..." : "Selecciona una obra"} />
                            </SelectTrigger>
                            <SelectContent>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {loadingData ? (
                <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando datos...</div>
            ) : selectedObraId ? (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ficha de la Obra: {selectedObra?.nombreFaena}</CardTitle>
                            <CardDescription>Información general y estado del sistema de gestión para esta obra.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Contenido en desarrollo.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Empresas Contratistas y Subcontratistas</CardTitle>
                            <CardDescription>Listado de empresas que prestan servicios en esta obra.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <p className="text-sm text-muted-foreground">Contenido en desarrollo.</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="text-center text-muted-foreground p-8">Selecciona una obra para ver la información del DS44.</div>
            )}
        </div>
    );
}
