"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, GitCompareArrows, Loader2 } from 'lucide-react';
import { UploaderPlano } from '@/components/comparacion/UploaderPlano';
import { ResultadoComparacion } from '@/components/comparacion/ResultadoComparacion';
import { ComparacionPlanosOutput } from '@/types/comparacion-planos';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function ComparacionPlanosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [planoA, setPlanoA] = useState<File | null>(null);
  const [planoB, setPlanoB] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ComparacionPlanosOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalizar = async () => {
    if (!planoA || !planoB) {
      toast({
        variant: 'destructive',
        title: 'Faltan archivos',
        description: 'Debes subir ambas versiones del plano para comparar.',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('planoA', planoA);
      formData.append('planoB', planoB);

      const response = await fetch('/api/comparacion-planos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ocurrió un error en el servidor.');
      }

      const data: ComparacionPlanosOutput = await response.json();
      setResultado(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Error en el análisis',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Comparación de Planos con IA</h1>
          <p className="text-muted-foreground">
            Sube dos versiones de un plano para analizar sus diferencias técnicas y de cubicación.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>1. Cargar Planos</CardTitle>
            <CardDescription>
              Sube la versión original (Plano A) y la versión modificada (Plano B).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploaderPlano
              id="planoA"
              label="Plano A (Versión Original)"
              onFileSelect={setPlanoA}
              disabled={loading}
            />
            <UploaderPlano
              id="planoB"
              label="Plano B (Versión Modificada)"
              onFileSelect={setPlanoB}
              disabled={loading}
            />
          </CardContent>
        </Card>
        <div className="sticky top-24 space-y-4">
            <Button onClick={handleAnalizar} disabled={loading || !planoA || !planoB} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitCompareArrows className="mr-2 h-4 w-4" />}
                {loading ? 'Analizando diferencias...' : 'Analizar Planos'}
            </Button>

            {error && (
                <div className="text-center p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                    <p className="font-semibold">Error</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}
        </div>
      </div>
      
      {resultado && <ResultadoComparacion resultado={resultado} />}

    </div>
  );
}
