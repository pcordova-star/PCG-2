// Esta página muestra la ficha detallada de una empresa contratista.
// Es una Server Component que carga los datos iniciales.

import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import FichaContent from './FichaContent';
import { EmpresaContratista } from '../page';
import { notFound } from 'next/navigation';

type Obra = {
    id: string;
    nombreFaena: string;
    mandanteRazonSocial: string;
    direccion: string;
};

async function getEmpresaData(empresaId: string): Promise<{ empresa: EmpresaContratista, obra: Obra } | null> {
    if (!empresaId) return null;

    try {
        // Cargar datos de la empresa
        const empresaRef = doc(firebaseDb, 'empresasContratistas', empresaId);
        const empresaSnap = await getDoc(empresaRef);

        if (!empresaSnap.exists()) {
            return null;
        }

        const empresaData = { id: empresaSnap.id, ...empresaSnap.data() } as EmpresaContratista;

        // Cargar datos de la obra asociada
        const obraRef = doc(firebaseDb, 'obras', empresaData.obraId);
        const obraSnap = await getDoc(obraRef);

        if (!obraSnap.exists()) {
            throw new Error(`La obra con ID ${empresaData.obraId} no fue encontrada.`);
        }

        const obraData = { id: obraSnap.id, ...obraSnap.data() } as Obra;

        return { empresa: empresaData, obra: obraData };

    } catch (error) {
        console.error("Error fetching data for empresaId", empresaId, error);
        return null;
    }
}


export default async function FichaEmpresaContratistaPage({ params }: { params: { empresaId: string } }) {
    const data = await getEmpresaData(params.empresaId);

    if (!data) {
        notFound();
    }

    return (
        <div className="bg-muted/40 min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
             <style jsx global>{`
                @media print {
                body { background-color: #fff; color: #000; }
                .print-hidden { display: none !important; }
                .printable-area { 
                    box-shadow: none !important; 
                    border: none !important; 
                    padding: 0 !important; 
                }
                }
            `}</style>
            <FichaContent empresa={data.empresa} obra={data.obra} />
        </div>
    );
}