// src/app/prevencion/hallazgos/crear/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Obra, Criticidad, MiembroEquipo } from '@/types/pcg';
import Link from 'next/link';

const riskTypes = ["Excavación", "Trabajo en altura", "Riesgo eléctrico", "Maquinaria pesada", "Orden y limpieza", "Conductas inseguras", "Herramientas", "Estructuras inestables", "Otro"];

const descripcionesPorRiesgo: Record<string, string[]> = {
    "Excavación": ["Talud sin contención", "Zanja sin baranda", "Acopio muy cerca del borde", "Presencia de agua en el fondo", "Otro"],
    "Trabajo en altura": ["Trabajador sin arnés", "Línea de vida ausente", "Escalera en mal estado", "Sin barandas en borde", "Andamio irregular", "Otro"],
    "Riesgo eléctrico": ["Cableado expuesto", "Tablero sin protección", "Falta de conexión a tierra", "Herramienta eléctrica defectuosa", "Otro"],
    "Maquinaria pesada": ["Operador no certificado", "Falta de señalero", "Maquinaria sin mantención visible", "Cercanía a líneas eléctricas", "Otro"],
    "Orden y limpieza": ["Vías de acceso obstruidas", "Acumulación de escombros", "Materiales mal apilados", "Derrame de líquidos", "Otro"],
    "Conductas inseguras": ["No uso de EPP", "Procedimiento de trabajo no seguido", "Uso indebido de herramientas", "Juegos o distracciones", "Otro"],
    "Herramientas": ["Herramienta en mal estado", "Uso incorrecto de herramienta", "Falta de guardas de seguridad", "Otro"],
    "Estructuras inestables": ["Andamio mal estructurado", "Carga excede capacidad", "Estructura sin afianzar", "Otro"],
    "Otro": ["Otro"]
};


export default function CrearHallazgoPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const obraIdFromQuery = searchParams.get('obraId');
    const { user, companyId } = useAuth();
    const { toast } = useToast();

    // Estados del formulario
    const [tipoRiesgo, setTipoRiesgo] = useState('');
    const [tipoHallazgoDetalle, setTipoHallazgoDetalle] = useState('');
    const [descripcionLibre, setDescripcionLibre] = useState('');
    const [criticidad, setCriticidad] = useState<Criticidad>('media');
    const [responsableId, setResponsableId] = useState('');
    const [evidencia, setEvidencia] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Datos de la app
    const [obras, setObras] = useState<Obra[]>([]);
    const [obraId, setObraId] = useState('');
    const [equipo, setEquipo] = useState<MiembroEquipo[]>([]);

    // Cargar obras y setear la inicial
    useEffect(() => {
        if (!companyId) return;

        const fetchObras = async () => {
            const q = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId));
            const querySnapshot = await getDocs(q);
            const obrasList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);

            if (obraIdFromQuery && obrasList.some(o => o.id === obraIdFromQuery)) {
                setObraId(obraIdFromQuery);
            } else if (obrasList.length > 0) {
                setObraId(obrasList[0].id);
            }
        };
        fetchObras();
    }, [companyId, obraIdFromQuery]);

    // Cargar equipo responsable cuando cambia la obra
    useEffect(() => {
        if (!obraId) {
            setEquipo([]);
            return;
        };

        const fetchEquipo = async () => {
            const equipoRef = doc(firebaseDb, "obras", obraId, "equipoResponsable", "config");
            const equipoSnap = await getDoc(equipoRef);
            if (equipoSnap.exists() && Array.isArray(equipoSnap.data().miembros)) {
                setEquipo(equipoSnap.data().miembros);
            } else {
                setEquipo([]);
            }
        };
        fetchEquipo();

    }, [obraId]);
    
    // Sugerir responsable basado en el tipo de riesgo
    useEffect(() => {
        if (equipo.length === 0) {
            setResponsableId('');
            return;
        }
        
        let sugeridoId = equipo.find(m => m.cargo === 'Administrador de obra')?.id || equipo[0]?.id || '';

        if (tipoRiesgo === 'Orden y limpieza') {
            sugeridoId = equipo.find(m => m.cargo === 'Capataz')?.id || sugeridoId;
        }

        setResponsableId(sugeridoId);

    }, [tipoRiesgo, equipo]);

    const opcionesDetalle = useMemo(() => {
        return descripcionesPorRiesgo[tipoRiesgo] || [];
    }, [tipoRiesgo]);

    const resetForm = () => {
        setTipoRiesgo('');
        setTipoHallazgoDetalle('');
        setDescripcionLibre('');
        setEvidencia(null);
        setCriticidad('media');
        setResponsableId('');
    }

    const handleSubmit = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Debes iniciar sesión para crear un hallazgo.' });
            return;
        }

        if (!obraId || !tipoRiesgo || !tipoHallazgoDetalle || (tipoHallazgoDetalle === 'Otro' && !descripcionLibre) || !evidencia || !criticidad || !responsableId) {
            toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Por favor, completa todos los campos requeridos.' });
            return;
        }

        setLoading(true);

        try {
            const storageRef = ref(firebaseStorage, `hallazgos/${obraId}/${Date.now()}_${evidencia.name}`);
            await uploadBytes(storageRef, evidencia);
            const evidenciaUrl = await getDownloadURL(storageRef);
            
            const descripcionFinal = tipoHallazgoDetalle === 'Otro' ? descripcionLibre : tipoHallazgoDetalle;
            const responsableSeleccionado = equipo.find(m => m.id === responsableId);

            await addDoc(collection(firebaseDb, 'hallazgos'), {
                obraId,
                tipoRiesgo,
                tipoHallazgoDetalle: tipoHallazgoDetalle,
                descripcion: descripcionFinal,
                descripcionLibre: tipoHallazgoDetalle === 'Otro' ? descripcionLibre : null,
                criticidad,
                responsableId: responsableSeleccionado?.id,
                responsableNombre: responsableSeleccionado?.nombre, // Guardamos el nombre para reportes
                evidenciaUrl,
                accionesInmediatas: [], // Este campo se llenará después, por ahora vacío
                plazo: 'Hoy', // Placeholder
                estado: 'abierto',
                createdAt: serverTimestamp(),
                createdBy: user.uid,
            });
            
            toast({ title: 'Éxito', description: 'Hallazgo creado correctamente.' });
            resetForm();
            router.push('/dashboard');

        } catch (error) {
            console.error("Error al crear el hallazgo:", error);
            toast({ variant: 'destructive', title: 'Error en el servidor', description: 'No se pudo crear el hallazgo. Inténtalo de nuevo.' });
        } finally {
            setLoading(false);
        }
    };

    return (
       <div className="space-y-6 max-w-2xl mx-auto">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Registrar Hallazgo en Terreno</h1>
                    <p className="text-muted-foreground">Formulario rápido para reportar condiciones o actos inseguros desde tu dispositivo móvil.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Hallazgo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Obra*</Label>
                        <Select onValueChange={setObraId} value={obraId} disabled={!!obraIdFromQuery}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                            <SelectContent>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>1. Tipo de Riesgo Identificado*</Label>
                        <Select onValueChange={(val) => { setTipoRiesgo(val); setTipoHallazgoDetalle(''); }} value={tipoRiesgo}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar tipo de riesgo..." /></SelectTrigger>
                            <SelectContent>
                                {riskTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {tipoRiesgo && (
                         <div className="space-y-2">
                            <Label>2. ¿Qué encontraste? (Descripción breve)*</Label>
                            <Select onValueChange={setTipoHallazgoDetalle} value={tipoHallazgoDetalle}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar descripción..." /></SelectTrigger>
                                <SelectContent>
                                    {opcionesDetalle.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {tipoHallazgoDetalle === 'Otro' && (
                                <Input className="mt-2" placeholder="Describe brevemente el hallazgo..." value={descripcionLibre} onChange={e => setDescripcionLibre(e.target.value)} maxLength={80} />
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>3. Nivel de Criticidad*</Label>
                        <Select onValueChange={(val: Criticidad) => setCriticidad(val)} value={criticidad}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar criticidad..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="baja">Baja</SelectItem>
                                <SelectItem value="media">Media</SelectItem>
                                <SelectItem value="alta">Alta</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                     <div className="space-y-2">
                        <Label>4. Responsable Sugerido*</Label>
                         <Select onValueChange={setResponsableId} value={responsableId}>
                            <SelectTrigger><SelectValue placeholder="Asignar responsable..." /></SelectTrigger>
                            <SelectContent>
                                {equipo.length > 0 ? (
                                    equipo.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre} ({m.cargo})</SelectItem>)
                                ) : (
                                    <SelectItem value="no-equipo" disabled>No hay equipo configurado para esta obra</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="evidencia">5. Evidencia Fotográfica*</Label>
                        <Input id="evidencia" type="file" accept="image/*" onChange={e => setEvidencia(e.target.files ? e.target.files[0] : null)} />
                        {evidencia && <p className="text-xs text-muted-foreground">Archivo seleccionado: {evidencia.name}</p>}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                        <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Guardando...' : 'Guardar Hallazgo'}
                        </Button>
                        <Button variant="outline" className="w-full sm:w-auto" asChild>
                            <Link href="/prevencion/hallazgos/equipo-responsable">Configurar Equipo</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
       </div>
    );
}
