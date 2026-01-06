// src/app/cumplimiento/contratista/periodo/[periodId]/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Upload, Check, X, File, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { listActiveRequirements } from "@/lib/mclp/requirements/listRequirements";
import { listSubmissionsByPeriod } from "@/lib/mclp/submissions/listSubmissionsByPeriod";
import { uploadDocumentSubmission } from "@/lib/mclp/submissions/uploadSubmission";
import { RequisitoDocumento, EntregaDocumento } from "@/types/pcg";
import { useToast } from "@/hooks/use-toast";

type MergedRequirement = RequisitoDocumento & {
  submission?: EntregaDocumento;
};

export default function PeriodoContratistaPage() {
    const { user, companyId, subcontractorId, role, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const periodId = params.periodId as string;
    const { toast } = useToast();

    const [requirements, setRequirements] = useState<MergedRequirement[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [files, setFiles] = useState<Record<string, File | null>>({});

    useEffect(() => {
        if (!loading && role !== 'contratista') {
            router.replace('/dashboard');
        }
    }, [role, loading, router]);
    
    useEffect(() => {
        if (!companyId || !periodId || !subcontractorId) return;

        const fetchData = async () => {
            setPageLoading(true);
            try {
                const [reqs, subs] = await Promise.all([
                    listActiveRequirements(companyId),
                    listSubmissionsByPeriod(companyId, periodId, subcontractorId)
                ]);

                const merged = reqs.map(req => {
                    const submission = (subs as EntregaDocumento[]).find(s => s.requirementId === req.id);
                    return { ...req, submission };
                });
                
                setRequirements(merged as any);

            } catch (error) {
                console.error(error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los requisitos.' });
            } finally {
                setPageLoading(false);
            }
        };

        fetchData();
    }, [companyId, periodId, subcontractorId, toast]);

    const handleFileChange = (reqId: string, file: File | null) => {
        setFiles(prev => ({...prev, [reqId]: file }));
    };

    const handleUpload = async (req: MergedRequirement) => {
        const file = files[req.id];
        if (!file || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se seleccionó un archivo o no estás autenticado.'});
            return;
        }

        setUploading(prev => ({...prev, [req.id]: true }));
        try {
            const buffer = await file.arrayBuffer();
            const period = periodId.split('_')[1];

            // await uploadDocumentSubmission({
            //     companyId: companyId!,
            //     periodId: periodId,
            //     period,
            //     subcontractorId: subcontractorId!,
            //     requirementId: req.id,
            //     nombreDocumentoSnapshot: req.nombre,
            //     fileBuffer: Buffer.from(buffer),
            //     mimeType: file.type,
            //     uid: user.uid
            // });

             toast({ title: 'Éxito', description: `Documento "${req.nombre}" subido correctamente.` });
             // Refetch data
             // En una app real, la función de arriba sería una server action y se usaría revalidatePath
             // Por ahora, recargamos la página
             window.location.reload();

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error de subida', description: error.message });
        } finally {
             setUploading(prev => ({...prev, [req.id]: false }));
        }
    };
    
    if (pageLoading || loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold">Carga de Documentos del Período</h1>
                <p className="text-muted-foreground">Sube los documentos requeridos para el período actual.</p>
            </header>

            <div className="space-y-4">
                {requirements.map(req => (
                    <Card key={req.id} className={req.submission?.estado === 'Observado' ? 'border-red-300' : ''}>
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                             <div className="flex-1">
                                <p className="font-medium">{req.nombre}</p>
                                {req.submission?.estado === 'Observado' && (
                                     <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
                                        <p className="font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Observación del administrador:</p>
                                        <p className="italic pl-2">{req.submission.revision?.comentario || 'Sin comentario.'}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                                <FileStatusBadge submission={req.submission} />
                                {(!req.submission || req.submission.estado === 'Observado') && (
                                    <div className="flex items-center gap-2">
                                        <Input id={`file-${req.id}`} type="file" className="h-9 text-xs" onChange={e => handleFileChange(req.id, e.target.files ? e.target.files[0] : null)} />
                                        <Button size="sm" onClick={() => handleUpload(req)} disabled={!files[req.id] || uploading[req.id]}>
                                            {uploading[req.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

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
