// Esta página muestra la ficha detallada de una empresa contratista.
// Es una Server Component que carga los datos iniciales.

import { getAdminApp } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import FichaContent from './FichaContent';
import { EmpresaContratista } from '../page';
import { notFound } from 'next/navigation';

type Obra = {
    id: string;
    nombreFaena: string;
    mandanteRazonSocial: string;
    direccion: string;
    creadoEn?: string; // Change to string for serialization
};

// We need to adjust the type here to expect a string for fechaCreacion
type SerializableEmpresaContratista = Omit<EmpresaContratista, 'fechaCreacion'> & {
    fechaCreacion: string;
};


async function getEmpresaData(empresaId: string): Promise<{ empresa: SerializableEmpresaContratista, obra: Obra } | null> {
    if (!empresaId) return null;

    try {
        const db = getAdminApp().firestore();

        // Cargar datos de la empresa
        const empresaRef = db.collection('empresasContratistas').doc(empresaId);
        const empresaSnap = await empresaRef.get();

        if (!empresaSnap.exists) {
            return null;
        }

        const empresaRawData = empresaSnap.data()!;
        // Serialize Firestore Timestamp to string
        const empresaData: SerializableEmpresaContratista = {
            id: empresaSnap.id,
            ...empresaRawData,
            fechaCreacion: empresaRawData.fechaCreacion instanceof Timestamp
                ? empresaRawData.fechaCreacion.toDate().toISOString()
                : new Date().toISOString(),
        } as SerializableEmpresaContratista;


        // Cargar datos de la obra asociada
        const obraRef = db.collection('obras').doc(empresaData.obraId);
        const obraSnap = await obraRef.get();

        if (!obraSnap.exists()) {
            throw new Error(`La obra con ID ${empresaData.obraId} no fue encontrada.`);
        }

        const obraRawData = obraSnap.data()!;
        const obraData: Obra = {
            id: obraSnap.id,
            ...obraRawData,
             creadoEn: obraRawData.creadoEn instanceof Timestamp
                ? obraRawData.creadoEn.toDate().toISOString()
                : undefined,
        } as Obra;


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
            <FichaContent empresa={data.empresa} obra={data.obra} />
        </div>
    );
}
