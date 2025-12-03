"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { firebaseDb, firebaseStorage } from "@/lib/firebaseClient";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2 } from "lucide-react";

interface SubirDocumentoProyectoModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  companyId: string;
  userId: string;
}

export default function SubirDocumentoProyectoModal({
  open,
  onClose,
  projectId,
  companyId,
  userId,
}: SubirDocumentoProyectoModalProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("1");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCode("");
    setName("");
    setCategory("");
    setVersion("1");
    setFile(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un archivo PDF.' });
      return;
    }
    if (file.type !== "application/pdf") {
      toast({ variant: 'destructive', title: 'Error', description: 'El archivo debe ser de tipo PDF.' });
      return;
    }
    if (!code || !name || !category || !version || !projectId || !companyId || !userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Todos los campos son obligatorios.' });
      return;
    }

    setLoading(true);
    try {
      const docId = collection(firebaseDb, "projectDocuments").doc().id;
      const storagePath = `projectDocuments/${projectId}/${docId}.pdf`;
      const storageRef = ref(firebaseStorage, storagePath);
      
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);
      
      const projectDocData = {
        companyId,
        projectId,
        companyDocumentId: null, // No viene de un documento corporativo
        code,
        name,
        category,
        versionAsignada: version,
        vigente: true,
        obsoleto: false,
        fileUrl,
        storagePath: storagePath,
        assignedAt: serverTimestamp(),
        assignedById: userId,
      };
      
      await addDoc(collection(firebaseDb, "projectDocuments"), projectDocData);

      toast({ title: "Éxito", description: "Documento subido y registrado correctamente." });
      handleClose();

    } catch (error) {
      console.error("Error subiendo documento:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo subir el documento.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir Documento Específico del Proyecto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Código*</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="version">Versión*</Label>
              <Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="name">Nombre del Documento*</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="category">Categoría*</Label>
            <Select onValueChange={setCategory} value={category}>
              <SelectTrigger id="category"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Seguridad">Seguridad</SelectItem>
                <SelectItem value="Calidad">Calidad</SelectItem>
                <SelectItem value="Medio Ambiente">Medio Ambiente</SelectItem>
                <SelectItem value="Operaciones">Operaciones</SelectItem>
                 <SelectItem value="Planos">Planos</SelectItem>
                <SelectItem value="Otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file">Archivo PDF*</Label>
            <Input id="file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !file || !name || !code || !category}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Subiendo..." : "Subir Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
