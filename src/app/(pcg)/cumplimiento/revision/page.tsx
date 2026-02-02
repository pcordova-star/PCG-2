// src/app/(pcg)/cumplimiento/revision/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { EntregaDocumento, Subcontractor } from '@/types/pcg';
import { ArrowLeft, Loader2, Check, X, FileDown } from 'lucide-react';
import Link from 'next/link';

interface CompliancePeriod {
    id: string;
    periodo: string; // "YYYY-MM"
    estado: 'Abierto para Carga' | 'En Revisión' | 'Cerrado';
}

function SubmissionStatusBadge({ estado }: { estado: EntregaDocumento['estado'] }) {
    const statusMap = {
        'Cargado': 'bg-blue-100 text-blue-800 border-blue-300',
        'Aprobado': 'bg-green-100 text-green-800 border-green-300',
        'Observado': 'bg-red-100 text-red-800 border-red-300',
    };
    return <Badge className={statusMap[estado] || 'bg-gray-100'}>{estado}</Badge>;
}


export default function RevisionPage() {
    const { companyId, role, user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [periods, setPeriods] = useState<CompliancePeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    
    const [submissions, setSubmissions] = useState<EntregaDocumento[]>([]);
    const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
    
    const [loading, setLoading] = useState(true);

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [currentSubmission, setCurrentSubmission] = useState<EntregaDocumento | null>(null);
    const [rejectionComment, setRejectionComment] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        if (!companyId) return;

        const periodsQuery = query(collection(firebaseDb, "compliancePeriods"), where("companyId", "==", companyId), orderBy("periodo", "desc"));
        const unsubPeriods = onSnapshot(periodsQuery, (snapshot) => {
            const periodsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompliancePeriod));
            setPeriods(periodsData);
            if (periodsData.length > 0 && !selectedPeriodId) {
                setSelectedPeriodId(periodsData[0].id);
            } else if (periodsData.length === 0) {
                setLoading(false);
            }
        });
        
        const subsQuery = query(collection(firebaseDb, "subcontractors"), where("companyId", "==", companyId), where("activo", "==", true));
        const unsubSubs = onSnapshot(subsQuery, (snapshot) => {
            const subsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcontractor));
            setSubcontractors(subsData);
        });

        return () => { unsubPeriods(); unsubSubs(); };
    }, [companyId]);

    useEffect(() => {
        if (!selectedPeriodId) {
            setSubmissions([]);
            return;
        }
        setLoading(true);

        const submsQuery = query(
            collection(firebaseDb, "compliancePeriods", selectedPeriodId, "submissions"),
            orderBy("fechaCarga", "desc")
        );
        const unsubSubmissions = onSnapshot(submsQuery, (snapshot) => {
            const submsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    fechaCarga: data.fechaCarga?.toDate ? data.fechaCarga.toDate() : new Date(),
                } as EntregaDocumento;
            });
            setSubmissions(submsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching submissions:", error);
            setLoading(false);
        });

        return () => unsubSubmissions;

    }, [selectedPeriodId]);
    
    const submissionsBySubcontractor = useMemo(() => {
        return subcontractors.map(sub => {
            const subSubmissions = submissions.filter(s => s.subcontractorId === sub.id);
            return { subcontractor: sub, submissions: subSubmissions };
        }).filter(group => group.submissions.length > 0);
    }, [submissions, subcontractors]);
    
    const handleUpdateStatus = async (decision: 'Aprobado' | 'Observado') => {
        if (!currentSubmission || !selectedPeriodId || !companyId || !user) return;

        setIsUpdatingStatus(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/mclp/submissions/review', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    submissionId: currentSubmission.id,
                    periodId: selectedPeriodId,
                    companyId: companyId,
                    decision,
                    comentario: rejectionComment,
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update status');
            }
            
            toast({ title: "Estado actualizado", description: `El documento ha sido marcado como ${decision}.`});
            
            if(isRejectModalOpen) setIsRejectModalOpen(false);
            setCurrentSubmission(null);
            setRejectionComment('');

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsUpdatingStatus(false);
        }
    };


    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/cumplimiento/admin">
                        <ArrowLeft className="mr-2 h-4 w-4"/>Volver al Panel
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Revisión de Documentos</h1>
                    <p className="text-muted-foreground">Aprueba o rechaza los documentos subidos por los subcontratistas.</p>
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
            : submissionsBySubcontractor.length === 0 ? <p className="text-center text-muted-foreground p-8">No hay documentos cargados para este período aún.</p>
            : (
                <Accordion type="multiple" defaultValue={submissionsBySubcontractor.map(s => s.subcontractor.id)}>
                    {submissionsBySubcontractor.map(({ subcontractor, submissions }) => (
                        <AccordionItem value={subcontractor.id} key={subcontractor.id}>
                            <AccordionTrigger className="text-lg font-semibold">{subcontractor.razonSocial}</AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Documento</TableHead>
                                            <TableHead>Fecha Carga</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {submissions.map(sub => (
                                            <TableRow key={sub.id}>
                                                <TableCell className="font-medium">{sub.nombreDocumentoSnapshot}</TableCell>
                                                <TableCell>{sub.fechaCarga.toLocaleString('es-CL')}</TableCell>
                                                <TableCell><SubmissionStatusBadge estado={sub.estado}/></TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"><FileDown className="mr-2 h-4 w-4"/> Ver Archivo</a>
                                                    </Button>
                                                    <Button variant="default" size="sm" onClick={() => { setCurrentSubmission(sub); handleUpdateStatus('Aprobado')}}><Check className="mr-2 h-4 w-4"/>Aprobar</Button>
                                                    <Button variant="destructive" size="sm" onClick={() => {setCurrentSubmission(sub); setIsRejectModalOpen(true)}}><X className="mr-2 h-4 w-4"/>Observar</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}

            <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Observar Documento</DialogTitle>
                        <DialogDescription>
                            Añade un comentario explicando por qué el documento está siendo rechazado. El contratista lo verá y podrá volver a subirlo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Comentario de Rechazo</Label>
                        <Textarea value={rejectionComment} onChange={e => setRejectionComment(e.target.value)} />
                    </div>
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
