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
import { ArrowLeft, Loader2, FileText, X, Edit, Trash2 } from 'lucide-react';
import { Obra, Hallazgo, Criticidad, MiembroEquipo, AppUser } from '@/types/pcg';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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


function HallazgoEstadoBadge({ estado }: { estado: Hallazgo['estado'] }) {
    const variants: Record<Hallazgo['estado'], string> = {
        abierto: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        en_progreso: 'bg-blue-100 text-blue-800 border-blue-300',
        cerrado: 'bg-green-100 text-green-800 border-green-300',
    };
    return <Badge variant="outline" className={variants[estado]}>{estado.replace('_', ' ')}</Badge>;
}


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
    const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
    const [cargandoHallazgos, setCargandoHallazgos] = useState(false);
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

    // Cargar hallazgos y equipo responsable cuando cambia la obra
    useEffect(() => {
        if (!obraId) {
            setHallazgos([]);
            setEquipo([]);
            return;
        };

        setCargandoHallazgos(true);

        const unsubHallazgos = onSnapshot(query(collection(firebaseDb, "hallazgos"), where("obraId", "==", obraId), orderBy("createdAt", "desc")), (snapshot) => {
            const hallazgosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hallazgo));
            setHallazgos(hallazgosList);
            setCargandoHallazgos(false);
        }, (error) => {
            console.error("Error fetching hallazgos:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los hallazgos.' });
            setCargandoHallazgos(false);
        });

        const fetchEquipo = async () => {
            const equipoRef = doc(firebaseDb, "obras", obraId, "equipoResponsable", "config");
            const equipoSnap = await getDoc(equipoRef);
            if (equipoSnap.exists()) {
                const equipoData = equipoSnap.data();
                setEquipo(Array.isArray(equipoData.miembros) ? equipoData.miembros : []);
            } else {
                setEquipo([]);
            }
        };
        fetchEquipo();

        return () => unsubHallazgos();
    }, [obraId, toast]);
    
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
        // Puedes agregar más lógicas para otros cargos aquí

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

        } catch (error) {
            console.error("Error al crear el hallazgo:", error);
            toast({ variant: 'destructive', title: 'Error en el servidor', description: 'No se pudo crear el hallazgo. Inténtalo de nuevo.' });
        } finally {
            setLoading(false);
        }
    };
    
    const handleCerrarHallazgo = async (hallazgoId: string) => {
        try {
            const hallazgoRef = doc(firebaseDb, "hallazgos", hallazgoId);
            await updateDoc(hallazgoRef, { estado: 'cerrado' });
            toast({ title: 'Hallazgo cerrado', description: 'El estado del hallazgo ha sido actualizado.' });
        } catch (error) {
            console.error("Error cerrando hallazgo:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cerrar el hallazgo.' });
        }
    };


    return (
       <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Crear y Gestionar Hallazgos en Terreno</h1>
                    <p className="text-muted-foreground">Registra una condición o acto inseguro y visualiza los hallazgos de la obra.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Columna Izquierda: Formulario */}
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar Nuevo Hallazgo</CardTitle>
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

                {/* Columna Derecha: Listado */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold">Hallazgos de la Obra</h3>
                     {cargandoHallazgos ? (<p className="text-sm text-muted-foreground">Cargando hallazgos...</p>) 
                     : hallazgos.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-8">No hay hallazgos para esta obra.</p>)
                     : (
                        <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
                            {hallazgos.map(h => (
                                <Card key={h.id} className="text-sm">
                                    <CardHeader className="p-4">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base">{h.tipoRiesgo}</CardTitle>
                                            <HallazgoEstadoBadge estado={h.estado} />
                                        </div>
                                        <CardDescription className="text-xs pt-1">{h.createdAt?.toDate ? h.createdAt.toDate().toLocaleString('es-CL') : 'Registrando...'}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 space-y-3">
                                        <p className="text-muted-foreground">{h.descripcion}</p>
                                        {h.evidenciaUrl && (
                                            <img src={h.evidenciaUrl} alt="Evidencia" className="rounded-md max-h-32 object-cover" />
                                        )}
                                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                                            <Button variant="outline" size="sm" asChild><Link href={`/prevencion/hallazgos/detalle/${h.id}`}>Ver Detalle</Link></Button>
                                            <Button variant="outline" size="sm">Imprimir Ficha</Button>
                                            {h.estado !== 'cerrado' && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="secondary" size="sm">Cerrar</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Cerrar este hallazgo?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta acción marcará el hallazgo como "cerrado". Asegúrate de que las acciones correctivas han sido implementadas.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleCerrarHallazgo(h.id!)}>Confirmar Cierre</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                     )}
                </div>
            </div>
       </div>
    );
}
