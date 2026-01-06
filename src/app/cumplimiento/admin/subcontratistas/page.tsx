// src/app/cumplimiento/admin/subcontratistas/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Loader2, PlusCircle, Trash2, UserPlus } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { listSubcontractors as listSubcontractorsAction, createSubcontractor as createSubcontractorAction, deactivateSubcontractor as deactivateSubcontractorAction } from '@/lib/mclp/subcontractors/actions';
import { inviteContractor as inviteContractorAction } from '@/lib/mclp/subcontractors/actions';

import { Subcontractor } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

export default function GestionSubcontratistasPage() {
    const { companyId } = useAuth();
    const { toast } = useToast();
    const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);

    // Form states
    const [newSub, setNewSub] = useState({ razonSocial: '', rut: '', contactoNombre: '', contactoEmail: '' });
    const [newInvite, setNewInvite] = useState({ nombre: '', email: '' });

    useEffect(() => {
        if (!companyId) return;
        const fetchSubcontractors = async () => {
            setLoading(true);
            const result = await listSubcontractorsAction(companyId);
            if (result.success && result.data) {
                setSubcontractors(result.data as Subcontractor[]);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
            setLoading(false);
        };
        fetchSubcontractors();
    }, [companyId, toast]);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) return;
        const result = await createSubcontractorAction({ ...newSub, companyId });
        if (result.success) {
            toast({ title: 'Éxito', description: 'Subcontratista creado correctamente.' });
            setIsCreateModalOpen(false);
            setNewSub({ razonSocial: '', rut: '', contactoNombre: '', contactoEmail: '' });
            // Re-fetch list
            const updatedList = await listSubcontractorsAction(companyId);
            if (updatedList.success && updatedList.data) setSubcontractors(updatedList.data as Subcontractor[]);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };
    
    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId || !selectedSubcontractor) return;
        const result = await inviteContractorAction({ ...newInvite, companyId, subcontractorId: selectedSubcontractor.id });
         if (result.success) {
            toast({ title: 'Éxito', description: `Invitación enviada a ${newInvite.email}.` });
            setIsInviteModalOpen(false);
            setNewInvite({ nombre: '', email: '' });
            // Re-fetch list
            const updatedList = await listSubcontractorsAction(companyId);
            if (updatedList.success && updatedList.data) setSubcontractors(updatedList.data as Subcontractor[]);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };
    
    const handleDeactivate = async (id: string) => {
        if (!companyId) return;
        const result = await deactivateSubcontractorAction(companyId, id);
        if (result.success) {
            toast({ title: 'Éxito', description: 'Subcontratista desactivado.' });
             const updatedList = await listSubcontractorsAction(companyId);
            if (updatedList.success && updatedList.data) setSubcontractors(updatedList.data as Subcontractor[]);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
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
                        <TableHead>Usuarios</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subcontractors.map(sub => (
                        <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.razonSocial}</TableCell>
                            <TableCell>{sub.rut}</TableCell>
                            <TableCell>{sub.contactoPrincipal?.nombre || 'N/A'}</TableCell>
                            <TableCell><Badge>{sub.userIds?.length || 0}</Badge></TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedSubcontractor(sub); setIsInviteModalOpen(true);}}>
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
