"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

type TourStep = {
  id: string;
  title: string;
  content: string;
};

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido a Faena Manager 2.0',
    content: 'Este tour rápido te mostrará las principales funcionalidades. Puedes omitirlo en cualquier momento y volver a verlo desde el botón en el dashboard.',
  },
  {
    id: 'tour-step-obras-activas',
    title: 'Métricas Principales',
    content: 'Aquí verás un resumen en tiempo real del estado de tus obras, tareas en progreso y alertas de seguridad.',
  },
  {
    id: 'tour-step-acceso-rapido',
    title: 'Acceso Rápido para Terreno',
    content: 'Estas tarjetas te permiten registrar avances o fotos desde terreno en segundos, de forma rápida y sencilla.',
  },
  {
    id: 'tour-step-modulo-operaciones',
    title: 'Módulo de Operaciones',
    content: 'En Operaciones podrás programar actividades, registrar avances detallados y generar estados de pago.',
  },
  {
    id: 'tour-step-modulo-prevencion',
    title: 'Módulo de Prevención',
    content: 'Administra auditorías, hallazgos, incidentes y toda la documentación de seguridad de la obra desde este módulo.',
  },
  {
    id: 'tour-step-soporte',
    title: 'Soporte y Ayuda',
    content: 'Si necesitas ayuda o tienes alguna duda, desde aquí puedes contactar a soporte para que te ayudemos.',
  },
];

interface TourOnboardingProps {
  run: boolean;
  onComplete: () => void;
}

export default function TourOnboarding({ run, onComplete }: TourOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    if (run) {
      setIsOpen(true);
      setStepIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [run]);

  const currentStep = tourSteps[stepIndex];

  const updateHighlightedElement = useCallback(() => {
    if (!currentStep || currentStep.id === 'welcome') {
      setHighlightedElement(null);
      return;
    }
    const element = document.getElementById(currentStep.id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
    setHighlightedElement(element);
  }, [currentStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleSkip();
        }
    }
    
    if (isOpen) {
        updateHighlightedElement();
        window.addEventListener('resize', updateHighlightedElement);
        window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
        window.removeEventListener('resize', updateHighlightedElement);
        window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, updateHighlightedElement]);
  
  const handleNext = () => {
    if (stepIndex < tourSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    setIsOpen(false);
    onComplete();
  };

  if (!isOpen) {
    return null;
  }

  const elementRect = highlightedElement?.getBoundingClientRect();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="tour-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={handleSkip}
          />
          
          {elementRect && (
            <motion.div
              key="tour-highlight-box"
              initial={{
                x: elementRect.left,
                y: elementRect.top,
                width: elementRect.width,
                height: elementRect.height,
              }}
              animate={{
                x: elementRect.left - 8,
                y: elementRect.top - 8,
                width: elementRect.width + 16,
                height: elementRect.height + 16,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed z-[101] rounded-lg border-2 border-primary border-dashed shadow-2xl bg-primary/10 pointer-events-none"
            />
          )}

           <motion.div
            key="tour-step-content"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[102] w-[90vw] max-w-lg rounded-lg bg-card p-6 shadow-2xl"
          >
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">{currentStep.title}</h4>
                <p className="text-sm text-muted-foreground">{currentStep.content}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Paso {stepIndex + 1} de {tourSteps.length}
                  </span>
                  <div className="flex gap-2">
                    {stepIndex < tourSteps.length - 1 ? (
                      <Button variant="ghost" size="sm" onClick={handleSkip}>
                        Omitir
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={handleNext}>
                      {stepIndex < tourSteps.length - 1 ? 'Siguiente' : 'Finalizar'}
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6"
                  onClick={handleSkip}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
