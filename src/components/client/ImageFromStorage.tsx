"use client";

import { useEffect, useState } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { firebaseStorage } from '@/lib/firebaseClient';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

type ImageFromStorageProps = {
  storagePath: string;
};

// Este componente cliente se encarga de obtener la URL de descarga
// de una imagen en Firebase Storage y mostrarla.
export default function ImageFromStorage({ storagePath }: ImageFromStorageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Solo se ejecuta en el cliente
    async function fetchImageUrl() {
      try {
        const imageRef = ref(firebaseStorage, storagePath);
        const url = await getDownloadURL(imageRef);
        setImageUrl(url);
      } catch (err: any) {
        console.error(`Error fetching image URL for path ${storagePath}:`, err);
        if (err.code === 'storage/object-not-found') {
          setError('La imagen no fue encontrada.');
        } else {
          setError('No se pudo cargar la imagen.');
        }
      }
    }

    if (storagePath) {
      fetchImageUrl();
    }
  }, [storagePath]);

  if (error) {
    return (
      <div className="aspect-square flex items-center justify-center bg-muted rounded-md text-destructive text-xs text-center p-2">
        {error}
      </div>
    );
  }

  if (!imageUrl) {
    // Muestra un esqueleto de carga mientras se obtiene la URL
    return <Skeleton className="aspect-square w-full h-full rounded-md" />;
  }

  return (
    <div className="relative aspect-square w-full h-full overflow-hidden rounded-md">
      <Image
        src={imageUrl}
        alt={`Imagen de avance desde ${storagePath}`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
        className="object-cover transition-transform hover:scale-105"
        priority={false} // No es prioritaria para LCP
      />
    </div>
  );
}
