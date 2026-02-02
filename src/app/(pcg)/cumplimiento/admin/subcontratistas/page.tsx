// src/app/cumplimiento/admin/subcontratistas/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Loader2, PlusCircle, Trash2, UserPlus } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { Subcontractor } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

// Server actions have been replaced with API calls
async function listSubcontractors(companyId: string) {
    const res = await fetch(`/api/mclp/subcontractors?companyId=${companyId}`);
    if (!res.ok) throw new Error('Failed to fetch subcontractors');
    return res.json();
}

async function createSubcontractor(data: any) {
    const res = await fetch('/api/mclp/subcontractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create subcontractor');
    }
    return res.json();
}

async function deactivateSubcontractor(companyId: string, subcontractorId: string) {
    const res = await fetch(`/api/mclp/subcontractors?companyId=${companyId}&subcontractorId=${subcontractorId}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to deactivate subcontractor');
    }
    return res.json();
}

async function inviteContractor(data: any, token: string) {
     const res = await fetch('/api/mclp/subcontractors/invite', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to invite user');
    }
    return res.json();
}


export default function GestionSubcontratistasPage() {
    const { user, companyId } = useAuth();
    const { toast } = useToast();
    const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);

    // Form states
    const [newSub, setNewSub] = useState({ razonSocial: '', rut: '', contactoNombre: '', contactoEmail: '' });
    const [newInvite, setNewInvite] = useState({ nombre: '', email: '', password: '' });

    const fetchSubcontractors = async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const data = await listSubcontractors(companyId);
            setSubcontractors(data || []);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchSubcontractors();
    }, [companyId, toast]);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) return;
        try {
            await createSubcontractor({ ...newSub, companyId });
            toast({ title: 'Éxito', description: 'Subcontratista creado correctamente.' });
            setIsCreateModalOpen(false);
            setNewSub({ razonSocial: '', rut: '', contactoNombre: '', contactoEmail: '' });
            await fetchSubcontractors();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };
    
    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId || !selectedSubcontractor || !user) return;
        if (newInvite.password.length < 6) {
            toast({ variant: 'destructive', title: 'Contraseña débil', description: 'La contraseña debe tener al menos 6 caracteres.' });
            return;
        }

        try {
            const token = await user.getIdToken();
            await inviteContractor({ ...newInvite, companyId, subcontractorId: selectedSubcontractor.id }, token);
            toast({ title: 'Éxito', description: `Invitación enviada a ${newInvite.email}.` });
            setIsInviteModalOpen(false);
            setNewInvite({ nombre: '', email: '', password: '' });
            await fetchSubcontractors();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };
    
    const handleDeactivate = async (id: string) => {
        if (!companyId) return;
        try {
            await deactivateSubcontractor(companyId, id);
            toast({ title: 'Éxito', description: 'Subcontratista desactivado.' });
            await fetchSubcontractors();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }

  return (
    <div className="space-y-6">
       <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/cumplimiento/admin">
                        <ArrowLeft />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Subcontratistas</h1>
                    <p className="text-muted-foreground">Añade, desactiva y gestiona el acceso de tus subcontratistas.</p>
                </div>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusCircle className="mr-2"/>
                Nuevo Subcontratista
            </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Listado de Subcontratistas Activos</CardTitle>
        </CardHeader>
        <CardContent>
            {loading ? <Loader2 className="animate-spin" /> : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Razón Social</TableHead>
                        <TableHead>RUT</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subcontractors.map(sub => (
                        <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.razonSocial}</TableCell>
                            <TableCell>{sub.rut}</TableCell>
                            <TableCell>{sub.contactoPrincipal?.nombre || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/cumplimiento/admin/subcontratistas/${sub.id}`}>
                                            Ver Usuarios ({sub.userIds?.length || 0})
                                        </Link>
                                    </Button>
                                    <Button size="sm" onClick={() => { setSelectedSubcontractor(sub); setIsInviteModalOpen(true);}}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Invitar Usuario
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Desactivar
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Desactivar a {sub.razonSocial}?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción es reversible. El subcontratista no podrá acceder al sistema hasta que sea reactivado.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeactivate(sub.id)}>Desactivar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            )}
        </CardContent>
      </Card>
      
      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Crear Nuevo Subcontratista</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Razón Social</Label><Input value={newSub.razonSocial} onChange={e => setNewSub(p => ({...p, razonSocial: e.target.value}))}/></div>
                <div className="space-y-2"><Label>RUT</Label><Input value={newSub.rut} onChange={e => setNewSub(p => ({...p, rut: e.target.value}))}/></div>
                <div className="space-y-2"><Label>Nombre Contacto</Label><Input value={newSub.contactoNombre} onChange={e => setNewSub(p => ({...p, contactoNombre: e.target.value}))}/></div>
                <div className="space-y-2"><Label>Email Contacto</Label><Input type="email" value={newSub.contactoEmail} onChange={e => setNewSub(p => ({...p, contactoEmail: e.target.value}))}/></div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Guardar</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      {/* Invite Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Invitar Usuario a {selectedSubcontractor?.razonSocial}</DialogTitle></DialogHeader>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Nombre del Usuario</Label><Input value={newInvite.nombre} onChange={e => setNewInvite(p => ({...p, nombre: e.target.value}))}/></div>
                <div className="space-y-2"><Label>Email del Usuario</Label><Input type="email" value={newInvite.email} onChange={e => setNewInvite(p => ({...p, email: e.target.value}))}/></div>
                <div className="space-y-2"><Label>Contraseña Temporal</Label><Input type="password" value={newInvite.password} onChange={e => setNewInvite(p => ({...p, password: e.target.value}))} placeholder="Mínimo 6 caracteres"/></div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsInviteModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Enviar Invitación</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
