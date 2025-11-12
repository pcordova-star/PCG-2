"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { guardarInduccionQR, InduccionAccesoFaena } from '@/lib/prevencionEventos';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Obra {
    id?: string;
    nombreFaena: string;
}

export default function PublicInduccionPage() {
    const { obraId } = useParams<{ obraId: string }>();

    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedData, setSubmittedData] = useState<InduccionAccesoFaena | null>(null);

    const [tipoVisita, setTipoVisita] = useState<InduccionAccesoFaena['tipoVisita']>('VISITA');
    const [nombreCompleto, setNombreCompleto] = useState("");
    const [rut, setRut] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [cargo, setCargo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [correo, setCorreo] = useState("");

    const [respuestaPregunta1, setRespuestaPregunta1] = useState<'SI' | 'NO' | undefined>();
    const [respuestaPregunta2, setRespuestaPregunta2] = useState<'SI' | 'NO' | undefined>();
    const [respuestaPregunta3, setRespuestaPregunta3] = useState<'SI' | 'NO' | undefined>();

    const [aceptaReglamento, setAceptaReglamento] = useState(false);
    const [aceptaEpp, setAceptaEpp] = useState(false);
    const [aceptaTratamientoDatos, setAceptaTratamientoDatos] = useState(false);

    const [firmaDataUrl, setFirmaDataUrl] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);
    const [errorForm, setErrorForm] = useState<string | null>(null);

    useEffect(() => {
        if (!obraId) {
            setErrorForm("No se ha especificado una obra.");
            setLoading(false);
            return;
        }

        const fetchObra = async () => {
            try {
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                } else {
                    setErrorForm("La obra especificada no existe.");
                }
            } catch (err) {
                console.error(err);
                setErrorForm("No se pudieron cargar los datos de la obra.");
            } finally {
                setLoading(false);
            }
        };

        fetchObra();
    }, [obraId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorForm(null);

        if (!obraId) {
            setErrorForm("No se ha especificado una obra.");
            return;
        }
        if (!nombreCompleto.trim() || !rut.trim() || !empresa.trim()) {
            setErrorForm("Completa tus datos básicos (nombre, RUT, empresa).");
            return;
        }
        if (!aceptaReglamento || !aceptaEpp || !aceptaTratamientoDatos) {
            setErrorForm("Debes aceptar todas las declaraciones para poder continuar.");
            return;
        }

        setSaving(true);
        
        const fechaIngreso = new Date().toISOString().slice(0, 10);
        const horaIngreso = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

        const dataToSave = {
            obraId,
            obraNombre: obra?.nombreFaena ?? obraId,
            tipoVisita,
            nombreCompleto,
            rut,
            empresa,
            cargo,
            telefono,
            correo,
            fechaIngreso,
            horaIngreso,
            respuestaPregunta1: respuestaPregunta1 ?? 'NO',
            respuestaPregunta2: respuestaPregunta2 ?? 'NO',
            respuestaPregunta3: respuestaPregunta3 ?? 'NO',
            aceptaReglamento,
            aceptaEpp,
            aceptaTratamientoDatos,
            firmaDataUrl,
        };

        try {
            await guardarInduccionQR(dataToSave);
            setSubmittedData(dataToSave as InduccionAccesoFaena);
            setIsSubmitted(true);
        } catch (error) {
            console.error(error);
            setErrorForm("Ocurrió un error al guardar la inducción. Intenta nuevamente.");
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-muted p-4"><p>Cargando información de la obra...</p></div>;
    }
    
    if (isSubmitted && submittedData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md text-center">
                    <h1 className="text-2xl font-bold text-green-700 mb-2">
                        ✅ Inducción completada
                    </h1>
                    <p className="text-sm text-slate-600 mb-4">
                        Gracias por realizar la inducción de acceso a faena.
                        <br />
                        Por favor, muestre esta pantalla al controlador de acceso
                        para ingresar a la obra.
                    </p>

                    <div className="border rounded-lg p-4 text-left text-sm space-y-1 bg-slate-50 mb-4">
                        <p><span className="font-semibold">Obra:</span> {submittedData.obraNombre ?? submittedData.obraId}</p>
                        <p><span className="font-semibold">Nombre:</span> {submittedData.nombreCompleto}</p>
                        <p><span className="font-semibold">RUT:</span> {submittedData.rut}</p>
                        <p><span className="font-semibold">Empresa:</span> {submittedData.empresa}</p>
                        <p><span className="font-semibold">Tipo de visita:</span> {submittedData.tipoVisita}</p>
                        <p><span className="font-semibold">Fecha ingreso:</span> {submittedData.fechaIngreso}</p>
                        <p><span className="font-semibold">Hora ingreso:</span> {submittedData.horaIngreso}</p>
                    </div>

                    <p className="text-xs text-slate-500">
                        Este registro ha sido almacenado en el sistema de gestión de seguridad y salud en el trabajo.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <section className="min-h-screen bg-muted flex items-center justify-center p-4">
            <div className="w-full max-w-lg space-y-6">
                <header className="text-center">
                    <h1 className="text-2xl font-bold text-primary">Inducción de Acceso a Faena</h1>
                    <p className="text-muted-foreground">{obra ? obra.nombreFaena : `Obra ID: ${obraId}`}</p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos del Visitante</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                             <div className="space-y-2">
                                <Label htmlFor="tipoVisita">Tipo de Visita*</Label>
                                <Select value={tipoVisita} onValueChange={(v) => setTipoVisita(v as any)}>
                                    <SelectTrigger id="tipoVisita">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VISITA">Visita</SelectItem>
                                        <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                                        <SelectItem value="INSPECTOR">Inspector</SelectItem>
                                        <SelectItem value="OTRO">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label htmlFor="nombre">Nombre Completo*</Label><Input id="nombre" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={rut} onChange={(e) => setRut(e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="cargo">Cargo</Label><Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="telefono">Teléfono</Label><Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></div>
                            <div className="space-y-2 md:col-span-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Preguntas de Comprensión</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>1. ¿Debe respetar siempre las indicaciones del personal de la obra?</Label>
                                <RadioGroup value={respuestaPregunta1} onValueChange={(v) => setRespuestaPregunta1(v as "SI" | "NO")} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q1-si"/><Label htmlFor="q1-si">Sí</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q1-no"/><Label htmlFor="q1-no">No</Label></div>
                                </RadioGroup>
                            </div>
                            <div className="space-y-2">
                                <Label>2. ¿Está permitido caminar bajo cargas suspendidas?</Label>
                                <RadioGroup value={respuestaPregunta2} onValueChange={(v) => setRespuestaPregunta2(v as "SI" | "NO")} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q2-si"/><Label htmlFor="q2-si">Sí</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q2-no"/><Label htmlFor="q2-no">No</Label></div>
                                </RadioGroup>
                            </div>
                            <div className="space-y-2">
                                <Label>3. En caso de emergencia, ¿debe seguir las rutas de evacuación?</Label>
                                <RadioGroup value={respuestaPregunta3} onValueChange={(v) => setRespuestaPregunta3(v as "SI" | "NO")} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q3-si"/><Label htmlFor="q3-si">Sí</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q3-no"/><Label htmlFor="q3-no">No</Label></div>
                                </RadioGroup>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Declaraciones y Compromisos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex items-start space-x-3">
                                <Checkbox id="aceptaReglamento" checked={aceptaReglamento} onCheckedChange={(checked) => setAceptaReglamento(!!checked)} />
                                <Label htmlFor="aceptaReglamento" className="text-sm font-normal text-muted-foreground">
                                    Declaro haber recibido, leído y comprendido el Reglamento Especial para Empresas Contratistas y Subcontratistas.
                                </Label>
                            </div>
                             <div className="flex items-start space-x-3">
                                <Checkbox id="aceptaEpp" checked={aceptaEpp} onCheckedChange={(checked) => setAceptaEpp(!!checked)} />
                                <Label htmlFor="aceptaEpp" className="text-sm font-normal text-muted-foreground">
                                    Me comprometo a utilizar en todo momento los Elementos de Protección Personal (EPP) requeridos para el área a la que ingreso.
                                </Label>
                            </div>
                             <div className="flex items-start space-x-3">
                                <Checkbox id="aceptaTratamientoDatos" checked={aceptaTratamientoDatos} onCheckedChange={(checked) => setAceptaTratamientoDatos(!!checked)} />
                                <Label htmlFor="aceptaTratamientoDatos" className="text-sm font-normal text-muted-foreground">
                                    Acepto el tratamiento de mis datos personales para fines de registro y seguridad de la obra.
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}

                    <div className="text-center">
                        <Button type="submit" size="lg" className="w-full max-w-xs" disabled={saving}>
                            {saving ? "Guardando..." : "Finalizar Inducción"}
                        </Button>
                    </div>
                </form>
            </div>
        </section>
    );
}
