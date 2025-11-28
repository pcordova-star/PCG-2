"use strict";
// functions/src/convertHeic.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertHeicToJpg = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const heic_convert_1 = __importDefault(require("heic-convert"));
const sharp_1 = __importDefault(require("sharp"));
const logger = __importStar(require("firebase-functions/logger"));
// Asegurarse de que Firebase Admin esté inicializado
if (!admin.apps.length) {
    admin.initializeApp();
}
const storage = admin.storage();
exports.convertHeicToJpg = (0, storage_1.onObjectFinalized)({
    region: "southamerica-west1",
    memory: "1GiB", // La conversión de imágenes puede requerir más memoria
    timeoutSeconds: 120, // Aumentar el tiempo de espera
}, async (event) => {
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
        const outputBuffer = await (0, heic_convert_1.default)({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 1, // Calidad máxima para heic-convert
        });
        // 3. Procesar con Sharp para optimizar y asegurar formato
        await (0, sharp_1.default)(outputBuffer)
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
    }
    catch (error) {
        logger.error(`Failed to convert ${filePath}.`, error);
        // Limpiar archivos temporales en caso de error
        if (fs.existsSync(tempFilePath))
            fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempJpgPath))
            fs.unlinkSync(tempJpgPath);
        return null;
    }
});
//# sourceMappingURL=convertHeic.js.map