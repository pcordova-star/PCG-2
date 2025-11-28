"use client";

import React, { useEffect, useState, use } from 'react';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { IPERRegistro } from '../../../page';
import { IperPrintSheet } from '../../../components/IperPrintSheet';
import { Button } from '@/components/ui/button';

type Obra = {
  id: string;
  nombreFaena: string;
};

async function findIperDoc(iperId: string): Promise<{ iper: IPERRegistro; obra: Obra } | null> {
    if (!iperId) return null;

    // 1. Obtener todas las obras
    const obrasRef = collection(firebaseDb, "obras");
    const obrasSnap = await getDocs(obrasRef);
    if (obrasSnap.empty) return null;

    // 2. Buscar en la subcolección de cada obra
    for (const obraDoc of obrasSnap.docs) {
        const iperDocRef = doc(firebaseDb, "obras", obraDoc.id, "iper", iperId);
        const iperSnap = await getDoc(iperDocRef);
        if (iperSnap.exists()) {
            return {
                iper: { id: iperSnap.id, ...iperSnap.data() } as IPERRegistro,
                obra: { id: obraDoc.id, ...obraDoc.data() } as Obra,
            };
        }
    }
    return null;
}

export default function ImprimirIperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ iper: IPERRegistro; obra: Obra } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const result = await findIperDoc(id);
      if (result) {
        setData(result);
      } else {
        setError("No se pudo encontrar el registro IPER con el ID proporcionado.");
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center">Cargando ficha IPER...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  return (
    <div className="bg-muted/40 min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center no-print">
            <h1 className="text-xl font-bold">Vista Previa de Ficha IPER</h1>
            <Button onClick={() => window.print()}>Imprimir / Guardar como PDF</Button>
        </div>
        <IperPrintSheet iper={data?.iper || null} obraNombre={data?.obra.nombreFaena} />
      </div>
    </div>
  );
}
