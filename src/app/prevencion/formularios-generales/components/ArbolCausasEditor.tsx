"use client";

import React, { useState, useEffect } from 'react';
import { ArbolCausas, NodoArbolCausas } from '@/types/pcg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, CornerDownRight } from 'lucide-react';

interface ArbolCausasEditorProps {
  value: ArbolCausas | undefined;
  onChange: (nuevo: ArbolCausas) => void;
  readOnly?: boolean;
}

export function ArbolCausasEditor({ value, onChange, readOnly = false }: ArbolCausasEditorProps) {
  const [arbol, setArbol] = useState<ArbolCausas>(
    value || { habilitado: true, raizId: null, nodos: {} }
  );

  useEffect(() => {
    if (value) {
      setArbol(value);
    }
  }, [value]);

  const updateArbol = (nuevoArbol: ArbolCausas) => {
    setArbol(nuevoArbol);
    onChange(nuevoArbol);
  };

  const handleAddNodo = (parentId: string | null) => {
    const id = crypto.randomUUID();
    const nuevoNodo: NodoArbolCausas = {
      id,
      parentId,
      tipo: 'hecho',
      descripcionCorta: 'Nuevo Hecho',
      detalle: '',
      esCausaBasica: false,
      esCausaInmediata: false,
    };

    const nuevoArbol = { ...arbol };
    nuevoArbol.nodos[id] = nuevoNodo;
    if (!parentId) {
      nuevoArbol.raizId = id;
    }
    updateArbol(nuevoArbol);
  };

  const handleUpdateNodo = (id: string, updates: Partial<NodoArbolCausas>) => {
    const nuevoArbol = { ...arbol };
    nuevoArbol.nodos[id] = { ...nuevoArbol.nodos[id], ...updates };
    updateArbol(nuevoArbol);
  };

  const handleDeleteNodo = (id: string) => {
    const nuevoArbol = { ...arbol };
    const nodosHijos = Object.values(nuevoArbol.nodos).filter(n => n.parentId === id);
    if(nodosHijos.length > 0){
        // Prevenir borrado de nodos con hijos para no dejar huérfanos
        alert("No se puede borrar un nodo que tiene hijos. Borre los hijos primero.");
        return;
    }
    delete nuevoArbol.nodos[id];
    if (arbol.raizId === id) {
      nuevoArbol.raizId = null;
    }
    updateArbol(nuevoArbol);
  };

  const renderNodo = (nodo: NodoArbolCausas, level: number) => {
    return (
      <div key={nodo.id} className="ml-4 pl-4 border-l border-dashed space-y-3 py-3">
        <div className="flex gap-2 items-start">
            <div className="w-full space-y-2">
                <Label className="text-xs">Descripción corta del Hecho/Acción/Condición</Label>
                <Input
                    value={nodo.descripcionCorta}
                    onChange={(e) => handleUpdateNodo(nodo.id, { descripcionCorta: e.target.value })}
                    readOnly={readOnly}
                    placeholder="Ej: El piso estaba resbaladizo"
                />
            </div>
             <div className="w-48 space-y-2">
                 <Label className="text-xs">Tipo</Label>
                <Select
                    value={nodo.tipo}
                    onValueChange={(tipo) => handleUpdateNodo(nodo.id, { tipo: tipo as NodoArbolCausas['tipo'] })}
                    disabled={readOnly}
                >
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="hecho">Hecho</SelectItem>
                        <SelectItem value="accion">Acción</SelectItem>
                        <SelectItem value="condicion">Condición</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        <div className="space-y-2">
            <Label className="text-xs">Detalle / Explicación (opcional)</Label>
            <Textarea 
                value={nodo.detalle}
                onChange={(e) => handleUpdateNodo(nodo.id, { detalle: e.target.value })}
                readOnly={readOnly}
                rows={2}
            />
        </div>

        <div className="flex items-center gap-4 text-xs">
            <Label className="flex items-center gap-2 font-normal"><Checkbox checked={nodo.esCausaInmediata} onCheckedChange={c => handleUpdateNodo(nodo.id, { esCausaInmediata: !!c})} disabled={readOnly}/><span>Causa Inmediata</span></Label>
            <Label className="flex items-center gap-2 font-normal"><Checkbox checked={nodo.esCausaBasica} onCheckedChange={c => handleUpdateNodo(nodo.id, { esCausaBasica: !!c})} disabled={readOnly}/><span>Causa Básica</span></Label>
        </div>
        
        {!readOnly && (
            <div className="flex gap-2">
                 <Button type="button" size="sm" variant="outline" onClick={() => handleAddNodo(nodo.id)}><Plus className="mr-1 h-3 w-3"/> ¿Qué tuvo que ocurrir antes?</Button>
                {arbol.raizId !== nodo.id && <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteNodo(nodo.id)}><Trash2 className="h-4 w-4"/></Button>}
            </div>
        )}

        {Object.values(arbol.nodos).filter(n => n.parentId === nodo.id).map(hijo => renderNodo(hijo, level + 1))}
      </div>
    );
  };
  
  const raiz = arbol.raizId ? arbol.nodos[arbol.raizId] : null;

  return (
    <div className="space-y-4 p-4 border rounded-md bg-slate-50">
      <Label className="text-base font-semibold">Árbol de Causas</Label>
      {raiz ? (
        renderNodo(raiz, 0)
      ) : !readOnly ? (
        <Button type="button" variant="secondary" onClick={() => handleAddNodo(null)}>
          <Plus className="mr-2 h-4 w-4"/> Empezar con el Hecho Principal / Accidente
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">No se ha definido un árbol de causas para esta investigación.</p>
      )}
    </div>
  );
}
