// src/app/prevencion/hallazgos/components/SignaturePad.tsx
"use client";

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

type SignaturePadProps = {
  onChange: (dataUrl: string | null) => void;
  onClear: () => void;
};

export default function SignaturePad({ onChange, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Ajustar para pantallas de alta densidad (Retina)
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const event = e.touches ? e.touches[0] : e;
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    isDrawing = true;
    const { x, y } = getPos(e);
    [lastX, lastY] = [x, y];
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    [lastX, lastY] = [x, y];
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    isDrawing = false;
    onChange(canvasRef.current!.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Correcto para borrar
    // No es necesario rellenar de blanco si el fondo del canvas ya es blanco
    // Pero si el fondo CSS es diferente, esto es importante:
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full h-40 rounded-md border bg-white touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <Button type="button" onClick={handleClear} variant="outline" size="sm">
        Limpiar Firma
      </Button>
    </div>
  );
}
