"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowRight, FileCheck2, Loader2 } from 'lucide-react';

interface UploadPlanesFormProps {
  onSubmit: (files: { planoA: File; planoB: File }) => void;
  isSubmitting?: boolean;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE_MB = 15;

export default function UploadPlanesForm({ onSubmit, isSubmitting = false }: UploadPlanesFormProps) {
  const [planoA, setPlanoA] = useState<File | null>(null);
  const [planoB, setPlanoB] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    setError(null);
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Tipo de archivo no permitido: ${file.name}. Sube PDF, JPG o PNG.`);
        setter(null);
        e.target.value = '';
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Archivo demasiado grande: ${file.name}. El máximo es ${MAX_SIZE_MB}MB.`);
        setter(null);
        e.target.value = '';
        return;
      }
    }
    setter(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planoA || !planoB) {
      setError('Debes seleccionar ambos archivos para iniciar el análisis.');
      return;
    }
    setError(null);
    onSubmit({ planoA, planoB });
  };
  
  const FileInfo = ({ file }: { file: File | null }) => {
    if (!file) return null;
    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <FileCheck2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span className="truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
        </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="planoA">Plano A (versión original)</Label>
          <Input id="planoA" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, setPlanoA)} disabled={isSubmitting} />
          <FileInfo file={planoA} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="planoB">Plano B (versión modificada)</Label>
          <Input id="planoB" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, setPlanoB)} disabled={isSubmitting} />
          <FileInfo file={planoB} />
        </div>
      </div>
      
      <Button type="submit" className="w-full" disabled={isSubmitting || !planoA || !planoB}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Iniciando...' : 'Iniciar Análisis'}
        {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
    </form>
  );
}
