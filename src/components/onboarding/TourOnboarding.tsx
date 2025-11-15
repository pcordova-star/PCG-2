"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { X } from 'lucide-react';

type TourStep = {
  id: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
};

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido a Faena Manager 2.0',
    content: 'Este tour rápido te mostrará las principales funcionalidades. Puedes omitirlo en cualquier momento y volver a verlo desde el botón en el dashboard.',
    position: 'bottom',
  },
  {
    id: 'tour-step-obras-activas',
    title: 'Métricas Principales',
    content: 'Aquí verás un resumen en tiempo real del estado de tus obras, tareas en progreso y alertas de seguridad.',
    position: 'bottom',
  },
  {
    id: 'tour-step-acceso-rapido',
    title: 'Acceso Rápido para Terreno',
    content: 'Estas tarjetas te permiten registrar avances o fotos desde terreno en segundos, de forma rápida y sencilla.',
    position: 'bottom',
  },
  {
    id: 'tour-step-modulo-operaciones',
    title: 'Módulo de Operaciones',
    content: 'En Operaciones podrás programar actividades, registrar avances detallados y generar estados de pago.',
    position: 'right',
  },
  {
    id: 'tour-step-modulo-prevencion',
    title: 'Módulo de Prevención',
    content: 'Administra auditorías, hallazgos, incidentes y toda la documentación de seguridad de la obra desde este módulo.',
    position: 'bottom',
  },
  {
    id: 'tour-step-soporte',
    title: 'Soporte y Ayuda',
    content: 'Si necesitas ayuda o tienes alguna duda, desde aquí puedes contactar a soporte para que te ayudemos.',
    position: 'right',
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
    setHighlightedElement(element);
  }, [currentStep]);

  useEffect(() => {
    updateHighlightedElement();
    window.addEventListener('resize', updateHighlightedElement);
    return () => window.removeEventListener('resize', updateHighlightedElement);
  }, [updateHighlightedElement]);
  
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

          <Popover open={true}>
            <PopoverContent
              side={currentStep.position}
              align="start"
              className="z-[102] w-80 shadow-2xl"
              style={
                elementRect ?
                {
                  position: 'fixed',
                  top: elementRect.top,
                  left: elementRect.left,
                  transform: `translate(
                    ${currentStep.position === 'right' ? `${elementRect.width + 16}px` : currentStep.position === 'left' ? '-100%' : '0'}, 
                    ${currentStep.position === 'bottom' ? `${elementRect.height + 16}px` : currentStep.position === 'top' ? '-100%' : '0'}
                  )`,
                } : {
                  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
                }
              }
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
            </PopoverContent>
          </Popover>
        </>
      )}
    </AnimatePresence>
  );
}
