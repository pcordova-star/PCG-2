"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

type Obra = {
  id: string;
  nombreFaena: string;
  direccion: string;
  clienteEmail: string;
};

const initialObras: Obra[] = [
  { id: '1', nombreFaena: 'Edificio Central', direccion: 'Av. Principal 123, Santiago', clienteEmail: 'cliente1@constructora.com' },
  { id: '2', nombreFaena: 'Condominio El Roble', direccion: 'Calle Secundaria 456, Valparaíso', clienteEmail: 'cliente2@inmobiliaria.cl' },
  { id: '3', nombreFaena: 'Remodelación Oficinas Corp', direccion: 'Plaza Central 789, Concepción', clienteEmail: 'gerencia@corp.net' },
];

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>(initialObras);
  const [nombreFaena, setNombreFaena] = useState('');
  const [direccion, setDireccion] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombreFaena || !direccion || !clienteEmail) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (!clienteEmail.includes('@')) {
      setError('El formato del email no es válido.');
      return;
    }
    
    setError('');

    const newObra: Obra = {
      id: Date.now().toString(),
      nombreFaena,
      direccion,
      clienteEmail,
    };

    setObras(prevObras => [newObra, ...prevObras]);

    setNombreFaena('');
    setDireccion('');
    setClienteEmail('');
  };

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Gestión de Obras</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Cree y visualice las obras. Los datos son simulados y se reinician al recargar la página.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Crear Nueva Obra</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombreFaena">Nombre de la faena</Label>
                <Input
                  id="nombreFaena"
                  value={nombreFaena}
                  onChange={(e) => setNombreFaena(e.target.value)}
                  placeholder="Ej: Edificio Terra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Av. del Sol 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clienteEmail">Email del cliente</Label>
                <Input
                  id="clienteEmail"
                  type="email"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  placeholder="ejemplo@cliente.com"
                />
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Crear Obra
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
           <h2 className="text-2xl font-semibold font-headline">Listado de Obras</h2>
          <div className="space-y-4">
            {obras.length > 0 ? (
              obras.map(obra => (
                <Card key={obra.id}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg text-primary">{obra.nombreFaena}</h3>
                    <CardDescription>
                      {obra.direccion}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground mt-2">
                      <a href={`mailto:${obra.clienteEmail}`} className="hover:underline">{obra.clienteEmail}</a>
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
               <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No hay obras registradas.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
