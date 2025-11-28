// src/components/auth/TermsAcceptance.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TermsAndConditionsContent } from '@/app/terminos/page';
import { X } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface TermsAcceptanceProps {
  acceptedTerms: boolean;
  onAcceptedTermsChange: (accepted: boolean) => void;
}

export default function TermsAcceptance({ acceptedTerms, onAcceptedTermsChange }: TermsAcceptanceProps) {
  const [showTermsModal, setShowTermsModal] = useState(false);

  return (
    <>
      <div className="mt-4 flex items-start gap-3">
        <Checkbox
          id="acceptedTerms"
          checked={acceptedTerms}
          onCheckedChange={(checked) => onAcceptedTermsChange(!!checked)}
          className="mt-0.5"
        />
        <Label htmlFor="acceptedTerms" className="text-xs text-muted-foreground font-normal">
          He leído y acepto los{" "}
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="text-primary hover:underline font-medium"
          >
            Términos y Condiciones de Uso de PCG
          </button>
          .
        </Label>
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl rounded-xl bg-card p-4 md:p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold">Términos y Condiciones de Uso</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowTermsModal(false)}
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 -mr-4">
                <TermsAndConditionsContent />
            </div>
            <div className="mt-4 flex justify-end border-t pt-4 flex-shrink-0">
              <Button
                type="button"
                onClick={() => setShowTermsModal(false)}
              >
                Aceptar y volver
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
