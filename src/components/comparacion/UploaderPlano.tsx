"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileCheck2, Paperclip } from 'lucide-react';

interface UploaderPlanoProps {
  id: string;
  label: string;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export function UploaderPlano({ id, label, onFileSelect, disabled }: UploaderPlanoProps) {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFileName(file ? file.name : null);
    onFileSelect(file);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-semibold">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="file"
          onChange={handleChange}
          disabled={disabled}
          className="flex-1"
          accept="image/jpeg,image/png,application/pdf"
        />
      </div>
      {fileName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted rounded-md">
          <FileCheck2 className="h-4 w-4 text-green-600" />
          <span>Archivo seleccionado: {fileName}</span>
        </div>
      )}
    </div>
  );
}
