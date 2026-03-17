"use client";

import React, { useState, useEffect, FormEvent, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, ArrowLeft, Loader2, UserX } from 'lucide-react';
import Link from 'next/link';
import { collection, doc, query, orderBy, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { firebaseDb, firebaseFunctions } from '@/lib/firebaseClient';
import { httpsCallable } from 'firebase/functions';
import { Company, AppUser, RolInvitado } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const rolesDisponibles: { value: RolInvitado, label: string }[] = [
    { value: 'admin_empresa', label: 'Admin Empresa' },
    { value: 'jefe_obra', label: 'Jefe de Obra' },
    { value: 'prevencionista', label: 'Prevencionista' },
    { value: 'cliente', label: 'Cliente (Solo lectura)' },
    { value: 'revisor_cumplimiento', label: 'Revisor de Cumplimiento' },
];

function AdminEmpresaUsuariosContent() {
    const { user, role } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const companyId = params.companyId as string;
    const { toast } = useToast();

    const [company, setCompany] = useState<Company | null>(null);
    const [activeUsers, setActiveUsers] = useState<AppUser[]>([]);
    const [loadingCompany, setLoadingCompany] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({ nombre: '', email: '', password: '', role: 'jefe_obra' as RolInvitado, requestId: null as string | null });
    const [isSaving, setIsSaving] = useState(false);

    const isSuperAdmin = role === "superadmin";

    useEffect(() => {
        if (!isSuperAdmin || !companyId) return;
        const unsubC = onSnapshot(doc(firebaseDb, "companies", companyId), (d) => {
            if (d.exists()) setCompany({ id: d.id, ...d.data() } as Company);
            else setError("Empresa no encontrada.");
            setLoadingCompany(false);
        });
        const unsubU = onSnapshot(query(collection(firebaseDb, "users"), where("empresaId", "==", companyId), orderBy("nombre", "asc")), (s) => {
            setActiveUsers(s.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)));
            setLoadingUsers(false);
        });
        return () => { unsubC(); unsubU(); };
    }, [isSuperAdmin, companyId]);

    useEffect(() => {
        const reqId = searchParams.get('requestId');
        if (reqId && !dialogOpen) setDialogOpen(true);
    }, [searchParams, dialogOpen]);

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !isSuperAdmin || !company) return;
        setIsSaving(true);
        try {
            const createFn = httpsCallable(firebaseFunctions, 'createCompanyUser');
            const result = await createFn({ ...newUser, companyId: company.id });
            if (newUser.requestId) await updateDoc(doc(firebaseDb, "userAccessRequests", newUser.requestId), { status: 'approved', createdUserId: (result.data as any).uid });
            toast({ title: "Usuario Creado" });
            setDialogOpen(false);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally { setIsSaving(false); }
    };

    if (loadingCompany) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <Button variant="outline" size="sm" asChild className="mb-4"><Link href="/admin/empresas"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link></Button>
                    <h1 className="text-2xl font-bold">Usuarios de {company?.nombreFantasia}</h1>
                </div>
                <Button onClick={() => setDialogOpen(true)}>Crear Usuario</Button>
            </header>
            <Card><CardContent><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead className="text-right">Estado</TableHead></TableRow></TableHeader><TableBody>{activeUsers.map(u => (<TableRow key={u.id}><TableCell>{u.nombre}</TableCell><TableCell>{u.email}</TableCell><TableCell><Badge>{u.role}</Badge></TableCell><TableCell className="text-right"><Badge variant={u.activo ? 'default' : 'outline'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><form onSubmit={handleFormSubmit}><DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><Label>Nombre</Label><Input value={newUser.nombre} onChange={e => setNewUser(p => ({...p, nombre: e.target.value}))} /><Label>Email</Label><Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} /><Label>Contraseña</Label><Input type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} /><Label>Rol</Label><Select value={newUser.role} onValueChange={v => setNewUser(p => ({...p, role: v as RolInvitado}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{rolesDisponibles.map(r => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}</SelectContent></Select></div><DialogFooter><Button type="submit" disabled={isSaving}>Crear</Button></DialogFooter></form></DialogContent></Dialog>
        </div>
    );
}

export default function AdminEmpresaUsuariosPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin" /></div>}>
            <AdminEmpresaUsuariosContent />
        </Suspense>
    );
}
