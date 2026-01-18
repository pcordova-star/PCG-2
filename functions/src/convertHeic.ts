// src/functions/src/convertHeic.ts
import * as functions from 'firebase-functions';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import heicConvert from 'heic-convert';
import sharp from 'sharp';
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "./firebaseAdmin";

const admin = getAdminApp();

export const convertHeicToJpg = functions
  .region("us-central1")
  .runWith({ memory: "512MB" })
  .storage.object()
  .onFinalize(async (object) => {
    const { bucket, name: filePath, contentType } = object;
    const storageBucket = admin.storage().bucket(bucket);

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
      await storageBucket.file(filePath).download({ destination: tempFilePath });
      logger.log(`Downloaded HEIC file to: ${tempFilePath}`);

      const inputBuffer = fs.readFileSync(tempFilePath);
      const outputBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 1,
      });

      await sharp(outputBuffer as Buffer)
        .jpeg({ quality: 90 })
        .toFile(tempJpgPath);

      logger.log(`Converted HEIC to JPG at: ${tempJpgPath}`);

      await storageBucket.upload(tempJpgPath, {
        destination: finalJpgPath,
        metadata: {
          contentType: 'image/jpeg',
          metadata: object.metadata,
        },
      });
      logger.log(`Uploaded JPG file to: ${finalJpgPath}`);

      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(tempJpgPath);

      await storageBucket.file(filePath).delete();
      logger.log(`Deleted original HEIC file: ${filePath}`);
      
      return `Successfully converted ${filePath} to ${finalJpgPath}`;

    } catch (error) {
      logger.error(`Failed to convert ${filePath}.`, error);
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (fs.existsSync(tempJpgPath)) fs.unlinkSync(tempJpgPath);
      return null;
    }
  });
