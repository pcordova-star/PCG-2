// src/app/cumplimiento/admin/calendario/page.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ComplianceCalendarMonth } from '@/types/pcg';
import { getOrCreateCalendarAction, listCalendarMonthsAction, updateCalendarMonthAction } from '@/lib/mclp/calendarActions';
import { ChevronLeft, ChevronRight, Loader2, Edit, CalendarIcon, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EditMonthState {
  id: string;
  corteCarga: Date;
  limiteRevision: Date;
  fechaPago: Date;
}

function MonthCard({ month, onEdit }: { month: ComplianceCalendarMonth, onEdit: (month: ComplianceCalendarMonth) => void }) {
  const isEditable = month.editable;

  return (
    <Card className={!isEditable ? 'bg-muted/50 border-dashed' : ''}>
      <CardHeader className="flex-row justify-between items-center pb-2">
        <CardTitle className="text-base font-bold">{new Date(month.id + '-02T00:00:00').toLocaleString('es-CL', { month: 'long', timeZone: 'UTC' }).toUpperCase()}</CardTitle>
        <Badge variant={isEditable ? 'default' : 'secondary'}>
          {isEditable ? 'Editable' : <><Lock className="h-3 w-3 mr-1"/>Bloqueado</>}
        </Badge>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="flex justify-between"><span>📥 Corte carga:</span><span className="font-semibold">{format(new Date(month.corteCarga), "dd 'de' MMM", { locale: es })}</span></div>
        <div className="flex justify-between"><span>🧐 Límite revisión:</span><span className="font-semibold">{format(new Date(month.limiteRevision), "dd 'de' MMM", { locale: es })}</span></div>
        <div className="flex justify-between"><span>💰 Fecha pago:</span><span className="font-semibold">{format(new Date(month.fechaPago), "dd 'de' MMM", { locale es })}</span></div>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline" className="w-full" disabled={!isEditable} onClick={() => onEdit(month)}>
            <Edit className="mr-2 h-4 w-4"/> Editar Fechas
        </Button>
      </CardFooter>
    </Card>
  );
}

function EditMonthDialog({ month, isOpen, onClose, onSave }: { month: EditMonthState | null, isOpen: boolean, onClose: () => void, onSave: (data: EditMonthState) => Promise<void>}) {
    const [localMonth, setLocalMonth] = useState<EditMonthState | null>(month);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if(month) {
            setLocalMonth(month);
        }
    }, [month]);

    if (!localMonth) return null;

    const handleDateChange = (field: keyof EditMonthState, date?: Date) => {
        if (date) {
            setLocalMonth(prev => prev ? {...prev, [field]: date} : null);
        }
    }

    const handleSaveChanges = async () => {
        setIsSaving(true);
        await onSave(localMonth);
        setIsSaving(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Fechas de {new Date(localMonth.id + '-02T00:00:00').toLocaleString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Fecha de corte de carga</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{format(localMonth.corteCarga, 'PPP', { locale: es })}</Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={localMonth.corteCarga} onSelect={(d) => handleDateChange('corteCarga', d)} /></PopoverContent></Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Fecha límite de revisión</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{format(localMonth.limiteRevision, 'PPP', { locale: es })}</Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={localMonth.limiteRevision} onSelect={(d) => handleDateChange('limiteRevision', d)} /></PopoverContent></Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Fecha propuesta de pago</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{format(localMonth.fechaPago, 'PPP', { locale: es })}</Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={localMonth.fechaPago} onSelect={(d) => handleDateChange('fechaPago', d)} /></PopoverContent></Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving && <Loader2 className="animate-spin mr-2"/>}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function CalendarioMclpPage() {
    const { companyId } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    const [year, setYear] = useState(new Date().getFullYear());
    const [months, setMonths] = useState<ComplianceCalendarMonth[]>([]);
    const [loading, setLoading] = useState(true);
    const [calendarExists, setCalendarExists] = useState(true);
    const [editingMonth, setEditingMonth] = useState<EditMonthState | null>(null);

    useEffect(() => {
        if (!companyId) return;

        setLoading(true);
        startTransition(async () => {
            const calResult = await getOrCreateCalendarAction(companyId, year);
            if (!calResult.success || !calResult.data) {
                setCalendarExists(false);
                setLoading(false);
                return;
            }
            setCalendarExists(true);

            const monthsResult = await listCalendarMonthsAction(companyId, year);
            if (monthsResult.success && monthsResult.data) {
                setMonths(monthsResult.data as ComplianceCalendarMonth[]);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: monthsResult.error });
            }
            setLoading(false);
        });
    }, [companyId, year, toast]);

    const handleCreateCalendar = () => {
        if (!companyId) return;
        setLoading(true);
        startTransition(async () => {
            await getOrCreateCalendarAction(companyId, year);
            const monthsResult = await listCalendarMonthsAction(companyId, year);
             if (monthsResult.success && monthsResult.data) {
                setMonths(monthsResult.data as ComplianceCalendarMonth[]);
                setCalendarExists(true);
            }
            setLoading(false);
        });
    }

    const handleEditMonth = (month: ComplianceCalendarMonth) => {
        setEditingMonth({
            id: month.id,
            corteCarga: new Date(month.corteCarga),
            limiteRevision: new Date(month.limiteRevision),
            fechaPago: new Date(month.fechaPago)
        });
    }
    
    const handleSaveMonth = async (data: EditMonthState) => {
        if (!companyId) return;

        // Validaciones
        if (data.corteCarga >= data.limiteRevision || data.limiteRevision >= data.fechaPago) {
            toast({ variant: 'destructive', title: 'Fechas inválidas', description: 'El orden debe ser: Corte Carga < Límite Revisión < Fecha Pago.' });
            return;
        }

        startTransition(async () => {
            const result = await updateCalendarMonthAction(companyId, year, data.id, {
                corteCarga: data.corteCarga.toISOString(),
                limiteRevision: data.limiteRevision.toISOString(),
                fechaPago: data.fechaPago.toISOString()
            });

            if (result.success) {
                toast({ title: 'Éxito', description: 'Fechas del mes actualizadas.' });
                // Refetch months data
                const monthsResult = await listCalendarMonthsAction(companyId, year);
                if (monthsResult.success && monthsResult.data) {
                    setMonths(monthsResult.data as ComplianceCalendarMonth[]);
                }
                setEditingMonth(null);
            } else {
                 toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Calendario de Cumplimiento {year}</h1>
                    <p className="text-muted-foreground">Visualiza y edita las fechas clave de cada período mensual.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setYear(y => y-1)}><ChevronLeft/></Button>
                    <span className="font-bold text-lg w-24 text-center">{year}</span>
                    <Button variant="outline" size="icon" onClick={() => setYear(y => y+1)}><ChevronRight/></Button>
                </div>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({length: 12}).map((_, i) => <Skeleton key={i} className="h-48"/>)}
                </div>
            ) : !calendarExists ? (
                 <Card className="text-center p-8">
                    <CardHeader>
                        <CardTitle>Calendario no encontrado</CardTitle>
                        <CardDescription>Aún no se ha generado el calendario para el año {year}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleCreateCalendar} disabled={isPending}>
                            {isPending && <Loader2 className="animate-spin mr-2"/>}
                            Crear Calendario {year}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {months.map(month => <MonthCard key={month.id} month={month} onEdit={handleEditMonth} />)}
                </div>
            )}
            
            <EditMonthDialog 
                month={editingMonth} 
                isOpen={!!editingMonth}
                onClose={() => setEditingMonth(null)}
                onSave={handleSaveMonth}
            />
        </div>
    )
}
