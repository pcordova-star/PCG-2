// src/app/prevencion/hallazgos/equipo-responsable/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';
import { Obra, MiembroEquipo } from '@/types/pcg';
import { useAuth } from '@/context/AuthContext';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const CARGO_OPTIONS: MiembroEquipo['cargo'][] = ["Supervisor", "Administrador de obra", "Prevencionista", "Capataz", "Comité Paritario"];

export default function EquipoResponsablePage() {
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState<string>('');
    
    // Estado para el equipo de la obra seleccionada
    const [equipo, setEquipo] = useState<MiembroEquipo[]>([]);
    
    // Estados para el nuevo miembro
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoCargo, setNuevoCargo] = useState<MiembroEquipo['cargo']>('Supervisor');

    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { companyId, role } = useAuth();

    useEffect(() => {
        const fetchObras = async () => {
            if (!companyId && role !== 'superadmin') return;

            let obrasQuery;
            if (role === 'superadmin') {
                obrasQuery = query(collection(firebaseDb, "obras"));
            } else {
                obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId));
            }
            
            const obrasSnap = await getDocs(obrasQuery);
            const obrasData = obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasData);
            if (obrasData.length > 0 && !selectedObraId) {
                setSelectedObraId(obrasData[0].id);
            }
        };
        fetchObras();
    }, [companyId, role]);

    useEffect(() => {
        if (!selectedObraId) {
            setEquipo([]);
            return;
        };

        const fetchEquipo = async () => {
            setLoading(true);
            const equipoRef = doc(firebaseDb, "obras", selectedObraId, "equipoResponsable", "config");
            const equipoSnap = await getDoc(equipoRef);
            if (equipoSnap.exists() && Array.isArray(equipoSnap.data().miembros)) {
                setEquipo(equipoSnap.data().miembros);
            } else {
                setEquipo([]);
            }
            setLoading(false);
        };
        fetchEquipo();
    }, [selectedObraId]);

    const handleAddMember = () => {
        if (!nuevoNombre.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El nombre del miembro del equipo no puede estar vacío.' });
            return;
        }
        const nuevoMiembro: MiembroEquipo = {
            id: crypto.randomUUID(),
            nombre: nuevoNombre,
            cargo: nuevoCargo
        };
        setEquipo(prev => [...prev, nuevoMiembro]);
        setNuevoNombre('');
        setNuevoCargo('Supervisor');
    };

    const handleRemoveMember = (id: string) => {
        setEquipo(prev => prev.filter(member => member.id !== id));
    };

    const handleSave = async () => {
        if (!selectedObraId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor, seleccione una obra.' });
            return;
        }
        setLoading(true);
        try {
            const equipoRef = doc(firebaseDb, "obras", selectedObraId, "equipoResponsable", "config");
            await setDoc(equipoRef, { miembros: equipo }, { merge: true });
            toast({ title: 'Éxito', description: 'Equipo responsable guardado correctamente.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el equipo responsable.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configurar Equipo Responsable por Obra</CardTitle>
                <CardDescription>Añada o elimine los miembros del equipo que pueden ser asignados como responsables en los formularios de prevención.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Obra</Label>
                    <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                        <SelectTrigger><SelectValue placeholder="Seleccione una obra..." /></SelectTrigger>
                        <SelectContent>
                            {obras.map(obra => <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                
                {selectedObraId && (
                    <div className="space-y-6 pt-4 border-t">
                        {/* Formulario para agregar nuevo miembro */}
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">Agregar Nuevo Miembro</h3>
                             <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                                <div className="space-y-1 flex-1">
                                    <Label htmlFor="nuevo-nombre">Nombre Completo</Label>
                                    <Input id="nuevo-nombre" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="nuevo-cargo">Cargo</Label>
                                    <Select value={nuevoCargo} onValueChange={v => setNuevoCargo(v as MiembroEquipo['cargo'])}>
                                        <SelectTrigger id="nuevo-cargo" className="w-[220px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CARGO_OPTIONS.map(cargo => <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAddMember}><PlusCircle className="mr-2 h-4 w-4" /> Agregar</Button>
                            </div>
                        </div>
                        
                        {/* Tabla de miembros actuales */}
                        <div className="space-y-2">
                             <h3 className="text-lg font-semibold">Equipo Actual</h3>
                             {loading ? <p>Cargando equipo...</p> : 
                                equipo.length === 0 ? <p className="text-sm text-muted-foreground">No hay miembros en el equipo para esta obra.</p> : (
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Cargo</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {equipo.map(member => (
                                                <TableRow key={member.id}>
                                                    <TableCell className="font-medium">{member.nombre}</TableCell>
                                                    <TableCell>{member.cargo}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                             )}
                        </div>

                        <Button onClick={handleSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Equipo'}</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
