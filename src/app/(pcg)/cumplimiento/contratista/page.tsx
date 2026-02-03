// src/app/(pcg)/cumplimiento/contratista/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, Calendar, AlertTriangle, Upload, Check, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ComplianceCalendarMonth, RequisitoDocumento, EntregaDocumento } from "@/types/pcg";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { uploadDocumentSubmission } from "@/lib/mclp/submissions/uploadSubmission";
import { Textarea } from "@/components/ui/textarea";

type MergedRequirement = RequisitoDocumento & {
  submission?: EntregaDocumento;
};

function FileStatusBadge({ submission }: { submission?: EntregaDocumento }) {
    if (!submission) {
        return <Badge variant="secondary">Pendiente</Badge>;
    }
    switch (submission.estado) {
        case 'Cargado':
            return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1"/> En Revisión</Badge>;
        case 'Aprobado':
            return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1"/> Aprobado</Badge>;
        case 'Observado':
            return <Badge variant="destructive"><X className="h-3 w-3 mr-1"/> Observado</Badge>;
        default:
            return <Badge variant="outline">Desconocido</Badge>;
    }
}


export default function ContratistaPortalPage() {
    const { role, loading, user, companyId, subcontractorId } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [currentPeriod, setCurrentPeriod] = useState<ComplianceCalendarMonth | null>(null);
    const [requirements, setRequirements] = useState<MergedRequirement[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);


    const [files, setFiles] = useState<Record<string, File | null>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!loading && role !== 'contratista' && role !== 'superadmin') {
            router.replace('/dashboard');
        }
    }, [role, loading, router]);
    
    const periodKey = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        return `${year}-${String(month).padStart(2, '0')}`;
    }, []);

    const periodId = useMemo(() => {
        if (!companyId) return null;
        return `${companyId}_${periodKey}`;
    }, [companyId, periodKey]);

    const fetchData = useCallback(async () => {
        if (loading) return;

        if (role === 'contratista' && !subcontractorId) {
            setPageError("Tu cuenta de contratista no está correctamente configurada. Falta la asociación a una empresa subcontratista. Por favor, contacta al administrador.");
            setPageLoading(false);
            return;
        }

        if (!companyId || !periodId || !user) {
            if(role === 'contratista') setPageError("Faltan datos de sesión para cargar el portal.");
            setPageLoading(false);
            return;
        }
        
        setPageError(null);
        setPageLoading(true);
        try {
            const token = await user.getIdToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const year = new Date().getFullYear();
            const [calendarRes, reqsRes, subsRes] = await Promise.all([
                fetch(`/api/mclp/calendar?companyId=${companyId}&year=${year}`, { headers }),
                fetch(`/api/mclp/requirements?companyId=${companyId}`, { headers }),
                fetch(`/api/mclp/submissions?companyId=${companyId}&periodId=${periodId}&subcontractorId=${subcontractorId}`, { headers })
            ]);

            if (!calendarRes.ok) {
                 throw new Error('No se pudieron cargar los datos del calendario.');
            }
            if (!reqsRes.ok || !subsRes.ok) {
                 throw new Error('No se pudieron cargar los datos de cumplimiento.');
            }

            const calendarYear: ComplianceCalendarMonth[] = await calendarRes.json();
            const period = calendarYear.find(p => p.id === periodKey);
            setCurrentPeriod(period || null);

            const reqs: RequisitoDocumento[] = await reqsRes.json();
            const subs: EntregaDocumento[] = await subsRes.json();

            const merged = reqs.map((req) => {
                const submission = subs.find((s) => s.requirementId === req.id);
                return { ...req, submission };
            });
            setRequirements(merged);

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del período. Intenta recargar la página.' });
            setPageError('No se pudieron cargar los datos del período. Intenta recargar la página.');
        } finally {
            setPageLoading(false);
        }
    }, [companyId, periodId, subcontractorId, user, periodKey, toast, loading, role]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
     const handleFileChange = (reqId: string, file: File | null) => {
        setFiles(prev => ({...prev, [reqId]: file }));
    };
    
    const handleCommentChange = (reqId: string, comment: string) => {
        setComments(prev => ({ ...prev, [reqId]: comment }));
    };

    const handleUpload = async (req: MergedRequirement) => {
        const file = files[req.id];
        const comentario = comments[req.id] || '';
        if (!file || !user || !companyId || !subcontractorId || !periodId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para la subida.'});
            return;
        }

        setUploading(prev => ({...prev, [req.id]: true }));
        try {
            await uploadDocumentSubmission({
                companyId: companyId,
                periodId: periodId,
                period: periodKey,
                subcontractorId: subcontractorId,
                requirementId: req.id,
                nombreDocumentoSnapshot: req.nombre,
                file: file,
                uid: user.uid,
                comentario: comentario,
            });

             toast({ title: 'Éxito', description: `Documento "${req.nombre}" subido correctamente.` });
             fetchData(); // Refrescar los datos

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error de subida', description: error.message });
        } finally {
             setUploading(prev => ({...prev, [req.id]: false }));
        }
    };

    if (loading || pageLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (role !== 'contratista' && role !== 'superadmin') {
        return null;
    }

    if (pageError) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Error de Configuración</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{pageError}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold">Portal del Contratista</h1>
                <p className="text-muted-foreground">Bienvenido, {user?.displayName || user?.email}.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Período de Cumplimiento Actual: {currentPeriod ? format(new Date(currentPeriod.id + '-02T00:00:00'), "MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase()) : 'Cargando...'}
                    </CardTitle>
                    <CardDescription>
                        Fechas clave para la carga y revisión de tu documentación.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {currentPeriod ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-semibold text-blue-800">Fecha de Corte de Carga</p>
                                <p className="text-lg font-bold">{format(new Date(currentPeriod.corteCarga), "dd 'de' MMMM", { locale: es })}</p>
                            </div>
                             <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm font-semibold text-yellow-800">Límite para Revisión</p>
                                <p className="text-lg font-bold">{format(new Date(currentPeriod.limiteRevision), "dd 'de' MMMM", { locale: es })}</p>
                            </div>
                             <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm font-semibold text-green-800">Fecha de Pago</p>
                                <p className="text-lg font-bold">{format(new Date(currentPeriod.fechaPago), "dd 'de' MMMM", { locale: es })}</p>
                            </div>
                        </div>
                    ) : (
                         <p className="text-muted-foreground">No se encontró información del período actual. Contacta al administrador.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Requisitos del Período</CardTitle>
                    <CardDescription>Sube la documentación requerida para habilitar tu estado de pago.</CardDescription>
                </CardHeader>
                <CardContent>
                     {pageLoading ? <p>Cargando requisitos...</p> : 
                     requirements.length === 0 ? <p className="text-muted-foreground">No hay requisitos definidos para este período.</p> : (
                        <div className="space-y-4">
                            {requirements.map(req => (
                                <Card key={req.id} className={req.submission?.estado === 'Observado' ? 'border-red-300' : ''}>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="font-medium">{req.nombre}</p>
                                                <p className="text-sm text-muted-foreground">{req.descripcion || 'Documento requerido para el período.'}</p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <FileStatusBadge submission={req.submission} />
                                            </div>
                                        </div>

                                        {req.submission?.estado === 'Observado' && (
                                            <div className="text-xs text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                                                <p className="font-bold flex items-center gap-1"><AlertTriangle className="h-4 w-4"/> Observación del administrador:</p>
                                                <p className="italic pl-2 mt-1">{req.submission.revision?.comentario || 'Sin comentario.'}</p>
                                            </div>
                                        )}

                                        {(!req.submission || req.submission.estado === 'Observado') && (
                                            <div className="border-t pt-4 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Input id={`file-${req.id}`} type="file" className="h-9 text-xs" onChange={e => handleFileChange(req.id, e.target.files ? e.target.files[0] : null)} />
                                                    <Button size="sm" onClick={() => handleUpload(req)} disabled={!files[req.id] || uploading[req.id]}>
                                                        {uploading[req.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                                                    </Button>
                                                </div>
                                                <Textarea
                                                    placeholder="Añadir un comentario opcional para el revisor..."
                                                    className="text-sm"
                                                    value={comments[req.id] || ''}
                                                    onChange={e => handleCommentChange(req.id, e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                     )}
                </CardContent>
            </Card>
        </div>
    );
}
