"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, orderBy, onSnapshot, doc, getDocs, addDoc, serverTimestamp, deleteDoc, updateDoc, limit } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, PlusCircle, ArrowLeft, FileText, MoreVertical, Edit, Trash2, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Obra, ActividadProgramada, Company } from '@/types/pcg';
import { generarEstadoDePagoPdf } from '@/lib/pdf/generarEstadoDePagoPdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type EstadoDePagoStatus = 'borrador' | 'presentado' | 'pagado';
type EstadoDePago = {
  id: string; correlativo: number; fechaGeneracion: Date; fechaDeCorte: string; totalAcumulado: number; totalAnterior: number;
  totalNetoPeriodo: number; gastosGeneralesPorcentaje: number; gastosGenerales: number; subtotalConGG: number; iva: number; total: number;
  actividades: any[]; status: EstadoDePagoStatus;
};

function EstadosDePagoContent() {
    const { user, companyId, company, role } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [estadosDePago, setEstadosDePago] = useState<EstadoDePago[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;
        const q = role === 'superadmin' ? query(collection(firebaseDb, "obras"), orderBy("nombreFaena")) : query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
        const unsub = onSnapshot(q, (s) => {
            const data = s.docs.map(d => ({ id: d.id, ...d.data() } as Obra));
            setObras(data);
            const qId = searchParams.get('obraId');
            if (qId && data.some(o => o.id === qId)) setSelectedObraId(qId);
            else if (data.length > 0 && !selectedObraId) setSelectedObraId(data[0].id);
        });
        return () => unsub();
    }, [companyId, role]);

    useEffect(() => {
        if (!selectedObraId) { setEstadosDePago([]); setLoading(false); return; }
        setLoading(true);
        const unsub = onSnapshot(query(collection(firebaseDb, "obras", selectedObraId, "estadosDePago"), orderBy("correlativo", "desc")), (s) => {
            setEstadosDePago(s.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, fechaGeneracion: data.fechaGeneracion?.toDate() || new Date() } as EstadoDePago;
            }));
            setLoading(false);
        });
        return () => unsub();
    }, [selectedObraId]);

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Button>
                <h1 className="text-2xl font-bold">Estados de Pago</h1>
            </header>
            <Card><CardHeader><CardTitle>Obra</CardTitle></CardHeader><CardContent><Select value={selectedObraId} onValueChange={setSelectedObraId}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}</SelectContent></Select></CardContent></Card>
            <Card><CardHeader><CardTitle>Historial</CardTitle></CardHeader><CardContent>{loading ? <Loader2 className="animate-spin mx-auto"/> : <Table><TableHeader><TableRow><TableHead>N°</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{estadosDePago.map(e => (<TableRow key={e.id}><TableCell>{e.correlativo}</TableCell><TableCell>{e.fechaGeneracion.toLocaleDateString()}</TableCell><TableCell><Badge>{e.status}</Badge></TableCell></TableRow>))}</TableBody></Table>}</CardContent></Card>
        </div>
    );
}

export default function EstadosDePagoPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin" /></div>}>
            <EstadosDePagoContent />
        </Suspense>
    );
}
