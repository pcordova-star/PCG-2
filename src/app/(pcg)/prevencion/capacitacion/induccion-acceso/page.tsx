// src/app/(pcg)/prevencion/capacitacion/induccion-acceso/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import QRCode from "react-qr-code";
import { collection, query, where, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra, InduccionAccesoFaena } from '@/types/pcg';
import { guardarInduccionAccesoFaena } from '@/lib/induccionAccesoFaena';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, UserPlus, Download } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';


const initialFormState: Omit<InduccionAccesoFaena, 'id' | 'createdAt' | 'obraId' | 'obraNombre' | 'generadorId' | 'firmaDataUrl' | 'origenRegistro'> = {
  tipoVisita: 'VISITA',
  nombreCompleto: '',
  rut: '',
  empresa: '',
  cargo: '',
  telefono: '',
  correo: '',
  fechaIngreso: new Date().toISOString().slice(0, 10),
  horaIngreso: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit'}),
  respuestaPregunta1: 'NO',
  respuestaPregunta2: 'SI',
  respuestaPregunta3: 'SI',
  aceptaReglamento: true,
  aceptaEpp: true,
  aceptaTratamientoDatos: true,
};

export default function InduccionAccesoPage() {
    const { user, companyId, role } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState<string>('');
    const [recentInductions, setRecentInductions] = useState<InduccionAccesoFaena[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [formData, setFormData] = useState<Omit<InduccionAccesoFaena, 'id' | 'createdAt' | 'obraId' | 'obraNombre' | 'generadorId' | 'firmaDataUrl' | 'origenRegistro'>>(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
    
    const [qrValue, setQrValue] = useState('');

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;
        const q = role === 'superadmin' 
            ? query(collection(firebaseDb, "obras"), orderBy("nombreFaena"))
            : query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));

        const unsubObras = onSnapshot(q, (snapshot) => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            if (obrasList.length > 0 && !selectedObraId) {
                setSelectedObraId(obrasList[0].id);
                setFormData(prev => ({ ...prev, obraId: obrasList[0].id }));
            }
            setLoading(false);
        });
        return () => unsubObras();
    }, [companyId, role, selectedObraId]);
    
    useEffect(() => {
        if (selectedObraId) {
            // Update QR code value when obra changes
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            setQrValue(`${origin}/public/induccion/${selectedObraId}`);

            // Fetch recent inductions for this obra
            const inductionsQuery = query(
                collection(firebaseDb, 'induccionesAccesoFaena'),
                where('obraId', '==', selectedObraId),
                orderBy('createdAt', 'desc'),
                limit(10)
            );
            const unsubInductions = onSnapshot(inductionsQuery, (snapshot) => {
                const inductionsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InduccionAccesoFaena));
                setRecentInductions(inductionsList);
            });
            return () => unsubInductions();
        }
    }, [selectedObraId]);

    const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if(!user) return;
        
        setIsSaving(true);
        try {
            await guardarInduccionAccesoFaena({ ...formData, obraId: selectedObraId, generadorId: user.uid });
            toast({ title: 'Éxito', description: 'Registro de visita guardado correctamente.' });
            setFormData(initialFormState); // Reset form
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const downloadQrCode = () => {
        const svg = document.getElementById("QRCode");
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = () => {
                if (ctx) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const pngFile = canvas.toDataURL("image/png");
                    const downloadLink = document.createElement("a");
                    const obraName = obras.find(o => o.id === selectedObraId)?.nombreFaena.replace(/\s/g, '_') || 'obra';
                    downloadLink.download = `QR_Induccion_${obraName}.png`;
                    downloadLink.href = pngFile;
                    downloadLink.click();
                }
            };
            img.src = "data:image/svg+xml;base64," + btoa(svgData);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/prevencion/capacitacion">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Portal de Inducción de Acceso a Faena</h1>
                    <p className="text-muted-foreground">Genera códigos QR para auto-registro de visitas o registra manualmente a un nuevo ingreso.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Código QR de Inducción</CardTitle>
                        <CardDescription>Selecciona la obra para generar el código QR. Imprímelo y pégalo en la entrada de la faena.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="obra-qr-select">Obra</Label>
                            <Select value={selectedObraId} onValueChange={setSelectedObraId} disabled={loading}>
                                <SelectTrigger id="obra-qr-select"><SelectValue placeholder="Seleccione obra..." /></SelectTrigger>
                                <SelectContent>
                                    {loading ? <SelectItem value="loading" disabled>Cargando obras...</SelectItem> :
                                    obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedObraId && qrValue && (
                            <div className="p-4 bg-white rounded-md border text-center">
                                <QRCode id="QRCode" value={qrValue} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button onClick={downloadQrCode} disabled={!selectedObraId} className="w-full">
                            <Download className="mr-2 h-4 w-4"/> Descargar QR
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Registro Manual de Visita/Proveedor</CardTitle>
                        <CardDescription>Si una persona no puede usar el QR, puedes registrarla aquí.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nombreCompleto">Nombre Completo</Label>
                                    <Input id="nombreCompleto" value={formData.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} required />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="rut">RUT/ID</Label>
                                    <Input id="rut" value={formData.rut} onChange={(e) => handleInputChange('rut', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="empresa">Empresa</Label>
                                    <Input id="empresa" value={formData.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} required/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cargo">Cargo/Ocupación</Label>
                                    <Input id="cargo" value={formData.cargo} onChange={(e) => handleInputChange('cargo', e.target.value)} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="telefono">Teléfono</Label>
                                    <Input id="telefono" type="tel" value={formData.telefono} onChange={(e) => handleInputChange('telefono', e.target.value)} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="correo">Correo Electrónico</Label>
                                    <Input id="correo" type="email" value={formData.correo} onChange={(e) => handleInputChange('correo', e.target.value)} />
                                </div>
                            </div>
                            <Button type="submit" disabled={isSaving || !selectedObraId}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Registrar Ingreso
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Ingresos Recientes a la Obra Seleccionada</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Fecha Ingreso</TableHead>
                                <TableHead>Origen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentInductions.length === 0 ? 
                                (<TableRow><TableCell colSpan={4} className="text-center">No hay registros recientes.</TableCell></TableRow>) : 
                                (recentInductions.map(ind => (
                                    <TableRow key={ind.id}>
                                        <TableCell>{ind.nombreCompleto}</TableCell>
                                        <TableCell>{ind.empresa}</TableCell>
                                        <TableCell>{ind.createdAt?.toDate().toLocaleString('es-CL')}</TableCell>
                                        <TableCell><Badge variant={ind.origenRegistro === 'qr' ? 'secondary' : 'outline'}>{ind.origenRegistro}</Badge></TableCell>
                                    </TableRow>
                                )))
                            }
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}
