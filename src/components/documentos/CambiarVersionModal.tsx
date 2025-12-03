"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { firebaseDb, firebaseStorage } from "@/lib/firebaseClient";
import { addDoc, collection, serverTimestamp, doc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2 } from "lucide-react";
import { ProjectDocument } from "@/types/pcg";

interface CambiarVersionModalProps {
  open: boolean;
  onClose: () => void;
  projectDocument: ProjectDocument;
  userId: string;
}

export default function CambiarVersionModal({
  open,
  onClose,
  projectDocument,
  userId,
}: CambiarVersionModalProps) {
  const { toast } = useToast();
  const [newVersion, setNewVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setNewVersion("");
    setFile(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!file || !newVersion) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes proporcionar una nueva versión y un archivo PDF.' });
      return;
    }
    if (file.type !== "application/pdf") {
      toast({ variant: 'destructive', title: 'Error', description: 'El archivo debe ser de tipo PDF.' });
      return;
    }
    
    setLoading(true);
    try {
      // 1. Subir el nuevo archivo
      const uniqueFileName = `${Date.now()}_${file.name}`;
      const storagePath = `projectDocuments/${projectDocument.projectId}/${uniqueFileName}`;
      const storageRef = ref(firebaseStorage, storagePath);
      await uploadBytes(storageRef, file);
      const newFileUrl = await getDownloadURL(storageRef);

      const batch = writeBatch(firebaseDb);

      // 2. Marcar el documento actual como obsoleto
      const oldDocRef = doc(firebaseDb, "projectDocuments", projectDocument.id!);
      batch.update(oldDocRef, { vigente: false, obsoleto: true });

      // 3. Crear el nuevo documento con la nueva versión
      const newDocRef = doc(collection(firebaseDb, "projectDocuments"));
      batch.set(newDocRef, {
        companyId: projectDocument.companyId,
        projectId: projectDocument.projectId,
        companyDocumentId: projectDocument.companyDocumentId,
        code: projectDocument.code,
        name: projectDocument.name,
        category: projectDocument.category,
        versionAsignada: newVersion,
        vigente: true,
        obsoleto: false,
        fileUrl: newFileUrl,
        storagePath: storagePath,
        assignedAt: serverTimestamp(),
        assignedById: userId,
      });

      await batch.commit();

      toast({ title: "Versión actualizada", description: "El documento ha sido actualizado a la nueva versión." });
      handleClose();

    } catch (error) {
      console.error("Error cambiando la versión del documento:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la versión del documento.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cambiar Versión del Documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <p className="text-sm font-medium">{projectDocument.code} - {projectDocument.name}</p>
            <p className="text-xs text-muted-foreground">Versión actual: {projectDocument.versionAsignada}</p>
          </div>
          <div>
            <Label htmlFor="newVersion">Nueva Versión*</Label>
            <Input
              id="newVersion"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder="Ej: 2.0"
            />
          </div>
          <div>
            <Label htmlFor="file">Nuevo Archivo PDF*</Label>
            <Input id="file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !file || !newVersion}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Actualizando..." : "Actualizar Versión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
