"use client";

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Company } from '@/types/pcg';


function getRoleName(role: string) {
    const roles: Record<string, string> = {
        superadmin: 'Super Administrador',
        admin_empresa: 'Admin de Empresa',
        jefe_obra: 'Jefe de Obra',
        prevencionista: 'Prevencionista de Riesgos',
        cliente: 'Cliente',
        none: 'Sin Rol Asignado'
    };
    return roles[role] || role;
}


export default function PerfilPage() {
    const { user, role, companyId, loading: authLoading } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [loadingCompany, setLoadingCompany] = useState(true);

    useEffect(() => {
        if (companyId) {
            const fetchCompany = async () => {
                setLoadingCompany(true);
                const companyRef = doc(firebaseDb, "companies", companyId);
                const companySnap = await getDoc(companyRef);
                if (companySnap.exists()) {
                    setCompany({ id: companySnap.id, ...companySnap.data() } as Company);
                }
                setLoadingCompany(false);
            };
            fetchCompany();
        } else {
            setLoadingCompany(false);
        }
    }, [companyId]);

    if (authLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user) {
        return <p>No has iniciado sesión.</p>;
    }

    return (
        <div className="space-y-6">
             <Button asChild variant="outline" size="sm">
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
            </Button>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarFallback className="text-2xl">{user.displayName?.[0] ?? user.email?.[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-3xl">{user.displayName || 'Usuario sin nombre'}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex justify-between border-t pt-4">
                        <span className="text-muted-foreground">Rol en la plataforma:</span>
                        <span className="font-semibold">{getRoleName(role)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-4">
                        <span className="text-muted-foreground">Empresa:</span>
                        {loadingCompany ? (
                             <Skeleton className="h-4 w-1/3" />
                        ) : (
                            <span className="font-semibold">{company?.nombreFantasia || company?.razonSocial || 'No asignada'}</span>
                        )}
                    </div>
                     <div className="flex justify-between border-t pt-4">
                        <span className="text-muted-foreground">ID de Usuario:</span>
                        <span className="font-mono text-xs">{user.uid}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
