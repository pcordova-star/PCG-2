"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  onChange?: (dataUrl: string | null) => void;
  onClear?: () => void;
}

export default function SignaturePad({ onChange, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getContext = () => canvasRef.current?.getContext('2d');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 200; // Fixed height
        const ctx = getContext();
        if (ctx) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5; // Slightly thicker line for better feel
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoords = (event: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    if (event.touches && event.touches.length > 0) {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
    return null;
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const ctx = getContext();
    const coords = getCoords(event.nativeEvent);
    if (!ctx || !coords) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    const ctx = getContext();
    const coords = getCoords(event.nativeEvent);
    if (!ctx || !coords) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = getContext();
    if (!ctx) return;
    
    ctx.closePath();
    setIsDrawing(false);

    if (onChange && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (onClear) {
        onClear();
      }
       if (onChange) {
        onChange(null); // Notify that it's cleared
      }
    }
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        style={{ touchAction: 'none' }} // Prevents scrolling on mobile while signing
        className="w-full h-48 border rounded-md bg-white cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>
        Limpiar Firma
      </Button>
    </div>
  );
}
