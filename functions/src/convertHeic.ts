// functions/src/convertHeic.ts

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import heicConvert from 'heic-convert';
import sharp from 'sharp';
import * as logger from "firebase-functions/logger";


// Asegurarse de que Firebase Admin esté inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const storage = admin.storage();

export const convertHeicToJpg = onObjectFinalized(
  {
    region: "southamerica-west1",
    memory: "1GiB", // La conversión de imágenes puede requerir más memoria
    timeoutSeconds: 120, // Aumentar el tiempo de espera
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;
    const bucket = storage.bucket(object.bucket);

    if (!filePath) {
      logger.warn('File path is undefined.');
      return null;
    }

    if (!contentType) {
      logger.warn(`Content type is undefined for file: ${filePath}`);
    }

    const fileExt = path.extname(filePath).toLowerCase();
    const isHeic = contentType === 'image/heic' || fileExt === '.heic';

    if (!isHeic) {
      logger.log(`File ${filePath} is not a HEIC image. Skipping conversion.`);
      return null;
    }
    
    // Evitar bucles infinitos si la función se dispara por el archivo JPG creado
    if (fileExt === '.jpg' || fileExt === '.jpeg') {
        logger.log(`File ${filePath} is already a JPG. Skipping.`);
        return null;
    }

    const fileName = path.basename(filePath, fileExt);
    const fileDir = path.dirname(filePath);

    const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
    const jpgFileName = `${fileName}.jpg`;
    const tempJpgPath = path.join(os.tmpdir(), jpgFileName);
    const finalJpgPath = path.join(fileDir, jpgFileName);

    try {
      // 1. Descargar el archivo HEIC a una ubicación temporal
      await bucket.file(filePath).download({ destination: tempFilePath });
      logger.log(`Downloaded HEIC file to: ${tempFilePath}`);

      // 2. Convertir HEIC a JPG usando heic-convert
      const inputBuffer = fs.readFileSync(tempFilePath);
      const outputBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 1, // Calidad máxima para heic-convert
      });

      // 3. Procesar con Sharp para optimizar y asegurar formato
      await sharp(outputBuffer as Buffer)
        .jpeg({ quality: 90 }) // Ajusta la calidad de compresión del JPG final
        .toFile(tempJpgPath);

      logger.log(`Converted HEIC to JPG at: ${tempJpgPath}`);

      // 4. Subir el archivo JPG resultante a Storage
      await bucket.upload(tempJpgPath, {
        destination: finalJpgPath,
        metadata: {
          contentType: 'image/jpeg',
          // Opcional: copiar metadatos originales si es necesario
          metadata: object.metadata,
        },
      });
      logger.log(`Uploaded JPG file to: ${finalJpgPath}`);

      // 5. Limpieza: eliminar archivos temporales
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(tempJpgPath);

      // 6. Limpieza: eliminar el archivo HEIC original de Storage
      await bucket.file(filePath).delete();
      logger.log(`Deleted original HEIC file: ${filePath}`);
      
      return `Successfully converted ${filePath} to ${finalJpgPath}`;

    } catch (error) {
      logger.error(`Failed to convert ${filePath}.`, error);
      // Limpiar archivos temporales en caso de error
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (fs.existsSync(tempJpgPath)) fs.unlinkSync(tempJpgPath);
      return null;
    }
  });
