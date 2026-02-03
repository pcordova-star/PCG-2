// src/app/cumplimiento/revision/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { EntregaDocumento, Subcontractor, RequisitoDocumento } from '@/types/pcg';
import { ArrowLeft, Loader2, Check, X, FileDown, Inbox, Clock, Circle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';


interface CompliancePeriod {
    id: string;
    periodo: string; // "YYYY-MM"
    estado: 'Abierto para Carga' | 'En Revisión' | 'Cerrado';
}

function SubmissionStatusBadge({ estado }: { estado: EntregaDocumento['estado'] }) {
    const statusMap: Record<EntregaDocumento['estado'], { className: string, icon: React.ElementType }> = {
        'Cargado': { className: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
        'Aprobado': { className: 'bg-green-100 text-green-800 border-green-300', icon: Check },
        'Observado': { className: 'bg-red-100 text-red-800 border-red-300', icon: X },
    };
    const config = statusMap[estado];
    if (!config) return <Badge variant="outline">{estado}</Badge>;
    
    const Icon = config.icon;
    return (
        <Badge className={cn("font-semibold", config.className)}>
            <Icon className="mr-1 h-3 w-3"/>
            {estado}
        </Badge>
    );
}

function OverallStatusBadge({ status }: { status: string }) {
    const statusMap: Record<string, { className: string; icon: React.ElementType }> = {
        'Cumple': { className: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
        'No Cumple': { className: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
        'En Revisión': { className: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse', icon: Clock },
        'Pendiente': { className: 'bg-gray-100 text-gray-800 border-gray-300', icon: Circle },
    };
    const config = statusMap[status] || { className: 'bg-gray-100', icon: Circle };
    const Icon = config.icon;

    return (
        <Badge className={cn('font-semibold', config.className)}>
            <Icon className="mr-1 h-3 w-3"/>
            {status}
        </Badge>
    );
}


export default function RevisionPage() {
    const { companyId, role, user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [periods, setPeriods] = useState<CompliancePeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    
    const [submissions, setSubmissions] = useState<EntregaDocumento[]>([]);
    const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
    const [requirements, setRequirements] = useState<RequisitoDocumento[]>([]);
    const [complianceStatuses, setComplianceStatuses] = useState<Map<string, string>>(new Map());
    
    const [loading, setLoading] = useState(true);

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [currentSubmission, setCurrentSubmission] = useState<EntregaDocumento | null>(null);
    const [rejectionComment, setRejectionComment] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        if (!companyId) return;

        const periodsQuery = query(collection(firebaseDb, "compliancePeriods"), where("companyId", "==", companyId));
        const unsubPeriods = onSnapshot(periodsQuery, (snapshot) => {
            const periodsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompliancePeriod)).sort((a, b) => b.periodo.localeCompare(a.periodo));
            setPeriods(periodsData);
            if (periodsData.length > 0 && !selectedPeriodId) {
                setSelectedPeriodId(periodsData[0].id);
            } else if (periodsData.length === 0) {
                setLoading(false);
            }
        });
        
        const subsQuery = query(collection(firebaseDb, "subcontractors"), where("companyId", "==", companyId), where("activo", "==", true));
        const unsubSubs = onSnapshot(subsQuery, (snapshot) => {
            setSubcontractors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcontractor)));
        });
        
        const reqsQuery = query(collection(firebaseDb, "compliancePrograms", companyId, "requirements"), where("activo", "==", true));
        const unsubReqs = onSnapshot(reqsQuery, (snapshot) => {
            setRequirements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RequisitoDocumento)));
        }, (error) => toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los requisitos.' }));

        return () => { unsubPeriods(); unsubSubs(); unsubReqs(); };
    }, [companyId, selectedPeriodId, toast]);

    useEffect(() => {
        if (!selectedPeriodId) {
            setSubmissions([]);
            setComplianceStatuses(new Map());
            return;
        }
        setLoading(true);

        const submsQuery = query(collection(firebaseDb, "compliancePeriods", selectedPeriodId, "submissions"), orderBy("fechaCarga", "desc"));
        const unsubSubmissions = onSnapshot(submsQuery, (snapshot) => {
            setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), fechaCarga: doc.data().fechaCarga?.toDate() } as EntregaDocumento)));
            setLoading(false);
        }, (error) => { setLoading(false); console.error(error); });

        const statusQuery = collection(firebaseDb, "compliancePeriods", selectedPeriodId, "status");
        const unsubStatuses = onSnapshot(statusQuery, (snapshot) => {
            const newStatuses = new Map<string, string>();
            snapshot.forEach(doc => newStatuses.set(doc.id, doc.data().estado));
            setComplianceStatuses(newStatuses);
        });

        return () => { unsubSubmissions(); unsubStatuses(); };
    }, [selectedPeriodId]);
    
    const complianceSummary = useMemo(() => {
        const mandatoryReqs = requirements.filter(r => r.esObligatorio);
        if (!subcontractors.length) return [];
        
        return subcontractors.filter(sub => sub.activo).map(sub => {
            const subSubmissions = submissions.filter(s => s.subcontractorId === sub.id);
            const approvedMandatoryDocs = subSubmissions.filter(s => s.estado === 'Aprobado' && mandatoryReqs.some(r => r.id === s.requirementId));
            const hasPendingSubmissions = subSubmissions.some(s => s.estado === 'Cargado');
            const status = complianceStatuses.get(sub.id) || 'Pendiente';

            return {
                subcontractor: sub,
                status: hasPendingSubmissions ? 'En Revisión' : status,
                approvedCount: approvedMandatoryDocs.length,
                mandatoryCount: mandatoryReqs.length,
                hasPendingSubmissions,
            };
        }).sort((a,b) => {
            if (a.hasPendingSubmissions && !b.hasPendingSubmissions) return -1;
            if (!a.hasPendingSubmissions && b.hasPendingSubmissions) return 1;
            return a.subcontractor.razonSocial.localeCompare(b.subcontractor.razonSocial);
        });
    }, [subcontractors, submissions, requirements, complianceStatuses]);

    const submissionsBySubcontractor = useMemo(() => {
        return subcontractors.reduce((acc, sub) => {
            acc[sub.id] = submissions.filter(s => s.subcontractorId === sub.id);
            return acc;
        }, {} as Record<string, EntregaDocumento[]>);
    }, [submissions, subcontractors]);
    
    const handleUpdateStatus = async (decision: 'Aprobado' | 'Observado') => {
        if (!currentSubmission || !selectedPeriodId || !companyId || !user) return;
        setIsUpdatingStatus(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/mclp/submissions/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    submissionId: currentSubmission.id, periodId: selectedPeriodId, companyId: companyId,
                    decision, comentario: rejectionComment,
                })
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to update status');
            toast({ title: "Estado actualizado", description: `El documento ha sido marcado como ${decision}.`});
            if(isRejectModalOpen) setIsRejectModalOpen(false);
            setCurrentSubmission(null); setRejectionComment('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm"><Link href="/cumplimiento/admin"><ArrowLeft className="mr-2 h-4 w-4"/>Volver al Panel</Link></Button>
                <div>
                    <h1 className="text-2xl font-bold">Revisión de Cumplimiento</h1>
                    <p className="text-muted-foreground">Supervisa el estado de la documentación de tus subcontratistas por período.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Seleccionar Período de Cumplimiento</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-xs">
                        <Label>Período</Label>
                        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                            <SelectTrigger><SelectValue placeholder="Seleccione un período..."/></SelectTrigger>
                            <SelectContent>
                                {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.periodo} ({p.estado})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            
            {loading ? <div className="text-center p-8"><Loader2 className="animate-spin"/> Cargando...</div> 
            : (
                <>
                <Card>
                    <CardHeader>
                        <CardTitle>Estado de Cumplimiento del Período</CardTitle>
                        <CardDescription>Resumen del estado de todos los subcontratistas para el período seleccionado. Haz clic para ver el detalle.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {complianceSummary.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">No hay subcontratistas activos para este período.</div>
                       ) : (
                        <Accordion type="multiple" className="w-full">
                            {complianceSummary.map(item => {
                                const subSubmissions = submissionsBySubcontractor[item.subcontractor.id] || [];
                                return (
                                <AccordionItem value={item.subcontractor.id} key={item.subcontractor.id}>
                                    <AccordionTrigger className={cn(
                                        "hover:no-underline p-4 rounded-lg",
                                        item.hasPendingSubmissions ? "bg-blue-50 hover:bg-blue-100/80" : "data-[state=open]:bg-muted/50"
                                    )}>
                                        <div className="grid grid-cols-3 items-center w-full cursor-pointer">
                                            <div className="font-medium text-left">{item.subcontractor.razonSocial}</div>
                                            <div className="text-center"><OverallStatusBadge status={item.status} /></div>
                                            <div className="flex items-center gap-2 justify-end">
                                                <Progress value={(item.approvedCount / (item.mandatoryCount || 1)) * 100} className="w-[60%] h-2" />
                                                <span className="text-xs text-muted-foreground font-semibold">{item.approvedCount}/{item.mandatoryCount}</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-2">
                                        <div className="border rounded-md bg-background p-4">
                                            <h4 className="font-semibold mb-2">Detalle de Documentos</h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Requisito</TableHead>
                                                        <TableHead>Estado</TableHead>
                                                        <TableHead>Fecha Carga</TableHead>
                                                        <TableHead className="text-right">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                     {requirements.map(req => {
                                                        const submission = subSubmissions.find(s => s.requirementId === req.id);
                                                        return (
                                                            <TableRow key={req.id}>
                                                                <TableCell className="font-medium">{req.nombre}</TableCell>
                                                                <TableCell>
                                                                    {submission ? <SubmissionStatusBadge estado={submission.estado} /> : <Badge variant="outline">Pendiente</Badge>}
                                                                </TableCell>
                                                                <TableCell>{submission ? submission.fechaCarga.toLocaleDateString('es-CL') : '-'}</TableCell>
                                                                <TableCell className="text-right">
                                                                     {submission && (
                                                                        <Button variant="outline" size="sm" asChild>
                                                                            <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer"><FileDown className="mr-2 h-4 w-4"/> Ver Archivo</a>
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                     })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                        </Accordion>
                       )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5 text-primary"/> Bandeja de Entrada de Revisiones</CardTitle>
                        <CardDescription>Documentos pendientes de tu revisión para el período seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {submissions.filter(s => s.estado === 'Cargado').length === 0 ? <p className="text-center text-muted-foreground p-8">¡Bandeja de entrada limpia! No hay documentos pendientes de revisión.</p> : (
                            <Accordion type="multiple" defaultValue={subcontractors.map(s => s.id)}>
                                {subcontractors.map((subcontractor) => {
                                    const pendingSubmissions = submissions.filter(s => s.subcontractorId === subcontractor.id && s.estado === 'Cargado');
                                    if(pendingSubmissions.length === 0) return null;
                                    return (
                                    <AccordionItem value={subcontractor.id} key={subcontractor.id}>
                                        <AccordionTrigger className="text-lg font-semibold">{subcontractor.razonSocial}</AccordionTrigger>
                                        <AccordionContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Documento</TableHead>
                                                        <TableHead>Fecha Carga</TableHead>
                                                        <TableHead className="text-right">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pendingSubmissions.map(sub => (
                                                        <TableRow key={sub.id}>
                                                            <TableCell className="font-medium">
                                                                {sub.nombreDocumentoSnapshot}
                                                                {sub.comentario && <p className="text-xs text-muted-foreground mt-1 italic">"{sub.comentario}"</p>}
                                                            </TableCell>
                                                            <TableCell>{sub.fechaCarga.toLocaleString('es-CL')}</TableCell>
                                                            <TableCell className="text-right space-x-2">
                                                                <Button variant="outline" size="sm" asChild><a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"><FileDown className="mr-2 h-4 w-4"/> Ver Archivo</a></Button>
                                                                <Button variant="default" size="sm" onClick={() => { setCurrentSubmission(sub); handleUpdateStatus('Aprobado')}}><Check className="mr-2 h-4 w-4"/>Aprobar</Button>
                                                                <Button variant="destructive" size="sm" onClick={() => {setCurrentSubmission(sub); setIsRejectModalOpen(true)}}><X className="mr-2 h-4 w-4"/>Observar</Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                )})}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
                </>
            )}

            <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Observar Documento</DialogTitle>
                        <DialogDescription>Añade un comentario explicando por qué el documento está siendo rechazado. El contratista lo verá y podrá volver a subirlo.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4"><Label>Comentario de Rechazo</Label><Textarea value={rejectionComment} onChange={e => setRejectionComment(e.target.value)} /></div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => handleUpdateStatus('Observado')} disabled={!rejectionComment || isUpdatingStatus}>
                            {isUpdatingStatus && <Loader2 className="animate-spin mr-2"/>}
                            Confirmar Rechazo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
