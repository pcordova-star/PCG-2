// src/app/(pcg)/prevencion/ppr/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, FileText, BarChart, ShieldAlert, BookOpen } from 'lucide-react';
import { Obra, IPERRegistro, Charla } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { generarPprPdf, PprData } from '@/lib/pdf/generarPprPdf';
import { useRouter } from 'next/navigation';

export default function PprPage() {
    const { companyId, role } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    
    const [loadingObras, setLoadingObras] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    
    const [iperRegistros, setIperRegistros] = useState<IPERRegistro[]>([]);
    const [charlas, setCharlas] = useState<Charla[]>([]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Cargar lista de obras
    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;
        
        let q;
        const obrasRef = collection(firebaseDb, "obras");
        if (role === 'superadmin') {
            q = query(obrasRef, orderBy("nombreFaena"));
        } else {
            q = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
        }
        
        const unsub = onSnapshot(q, (snapshot) => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            if (obrasList.length > 0 && !selectedObraId) {
                setSelectedObraId(obrasList[0].id);
            }
            setLoadingObras(false);
        }, (error) => {
          console.error("Error fetching obras:", error);
          setLoadingObras(false);
        });

        return () => unsub();
    }, [companyId, role, selectedObraId]);

    // Cargar datos de la obra seleccionada
    useEffect(() => {
        if (!selectedObraId) return;

        const fetchData = async () => {
            setLoadingData(true);
            try {
                // Fetch IPER
                const iperQuery = query(collection(firebaseDb, 'iperRegistros'), where('obraId', '==', selectedObraId));
                const iperSnap = await getDocs(iperQuery);
                const iperData = iperSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as IPERRegistro));
                setIperRegistros(iperData);

                // Fetch Charlas
                const charlasQuery = query(collection(firebaseDb, 'charlas'), where('obraId', '==', selectedObraId));
                const charlasSnap = await getDocs(charlasQuery);
                const charlasData = charlasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Charla));
                setCharlas(charlasData);

            } catch (error) {
                console.error("Error fetching PPR data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del PPR.' });
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [selectedObraId, toast]);

    const handleGeneratePdf = async () => {
        const selectedObra = obras.find(o => o.id === selectedObraId);
        if (!selectedObra) return;

        setIsGeneratingPdf(true);
        try {
            const pprData: PprData = {
                obra: selectedObra,
                iperRegistros,
                charlas,
            };
            await generarPprPdf(pprData);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF del PPR.' });
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Prevención</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Programa de Prevención de Riesgos (PPR)</h1>
                    <p className="text-muted-foreground">Visualiza y genera el PPR consolidado de una obra específica.</p>
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
                <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando datos del PPR...</div>
            ) : selectedObraId ? (
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>Consolidado PPR: {obras.find(o => o.id === selectedObraId)?.nombreFaena}</CardTitle>
                            <CardDescription>Resumen de los elementos que componen el PPR de la obra seleccionada.</CardDescription>
                        </div>
                        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                            {isGeneratingPdf ? <Loader2 className="mr-2 animate-spin"/> : <FileText className="mr-2"/>}
                            {isGeneratingPdf ? 'Generando...' : 'Generar PDF del PPR'}
                        </Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold flex items-center gap-2"><BarChart/> Resumen IPER</h4>
                            <p className="text-2xl font-bold mt-2">{iperRegistros.length}</p>
                            <p className="text-sm text-muted-foreground">riesgos identificados</p>
                        </div>
                         <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold flex items-center gap-2"><ShieldAlert/> Controles</h4>
                            <p className="text-2xl font-bold mt-2">{iperRegistros.filter(i => i.control_especifico_genero).length}</p>
                            <p className="text-sm text-muted-foreground">medidas de control definidas</p>
                        </div>
                         <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold flex items-center gap-2"><BookOpen/> Charlas y Capacitaciones</h4>
                            <p className="text-2xl font-bold mt-2">{charlas.length}</p>
                            <p className="text-sm text-muted-foreground">registros de capacitación</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center text-muted-foreground p-8">Selecciona una obra para ver su PPR.</div>
            )}
        </div>
    )
}
