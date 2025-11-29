// src/app/prevencion/hallazgos/equipo-responsable/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';
import { AppUser, Obra, EquipoResponsable } from '@/types/pcg';
import { useAuth } from '@/context/AuthContext';

export default function EquipoResponsablePage() {
    const [obras, setObras] = useState<Obra[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [selectedObraId, setSelectedObraId] = useState<string>('');
    const [equipo, setEquipo] = useState<EquipoResponsable>({
        jefeObra: '',
        capataz: '',
        supervisores: [],
        especialidades: { electrico: '', izaje: '', excavacion: '', maquinaria: '' },
        contratistas: []
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { companyId, role } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            // Solo ejecutar si el companyId está disponible o si el usuario es superadmin
            if (!companyId && role !== 'superadmin') return;

            let obrasQuery;
            if (role === 'superadmin') {
                // El superadmin puede ver todas las obras
                obrasQuery = query(collection(firebaseDb, "obras"));
            } else {
                // Los demás usuarios solo ven las obras de su empresa
                obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId));
            }
            
            const obrasSnap = await getDocs(obrasQuery);
            setObras(obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra)));
            
            const usersSnap = await getDocs(collection(firebaseDb, "users"));
            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
        };
        fetchData();
    }, [companyId, role]);

    useEffect(() => {
        if (!selectedObraId) return;

        const fetchEquipo = async () => {
            const equipoRef = doc(firebaseDb, "obras", selectedObraId, "equipoResponsable", "config");
            const equipoSnap = await getDoc(equipoRef);
            if (equipoSnap.exists()) {
                setEquipo(equipoSnap.data() as EquipoResponsable);
            } else {
                 setEquipo({
                    jefeObra: '', capataz: '', supervisores: [],
                    especialidades: { electrico: '', izaje: '', excavacion: '', maquinaria: '' },
                    contratistas: []
                });
            }
        };
        fetchEquipo();
    }, [selectedObraId]);

    const handleSave = async () => {
        if (!selectedObraId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor, seleccione una obra.' });
            return;
        }
        setLoading(true);
        try {
            const equipoRef = doc(firebaseDb, "obras", selectedObraId, "equipoResponsable", "config");
            await setDoc(equipoRef, equipo, { merge: true });
            toast({ title: 'Éxito', description: 'Equipo responsable guardado correctamente.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el equipo responsable.' });
        } finally {
            setLoading(false);
        }
    };
    
    const handleMultiSelectChange = (field: 'supervisores' | 'contratistas', values: string[]) => {
        setEquipo(prev => ({...prev, [field]: values}));
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configurar Equipo Responsable por Obra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <div className="space-y-4 pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Jefe de Obra</Label>
                                <Select value={equipo.jefeObra} onValueChange={val => setEquipo(p => ({...p, jefeObra: val}))}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{users.map(u => <SelectItem key={u.id!} value={u.id!}>{u.nombre}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Capataz</Label>
                                <Select value={equipo.capataz} onValueChange={val => setEquipo(p => ({...p, capataz: val}))}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{users.map(u => <SelectItem key={u.id!} value={u.id!}>{u.nombre}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>

                         {/* ... otros campos ... */}

                        <Button onClick={handleSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Equipo'}</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
