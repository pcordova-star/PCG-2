"use strict";
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
// src/functions/src/convertHeic.ts
const functions = __importStar(require("firebase-functions"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const heic_convert_1 = __importDefault(require("heic-convert"));
const sharp_1 = __importDefault(require("sharp"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const admin = (0, firebaseAdmin_1.getAdminApp)();
exports.convertHeicToJpg = functions
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
        const outputBuffer = await (0, heic_convert_1.default)({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 1,
        });
        await (0, sharp_1.default)(outputBuffer)
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
    }
    catch (error) {
        logger.error(`Failed to convert ${filePath}.`, error);
        if (fs.existsSync(tempFilePath))
            fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempJpgPath))
            fs.unlinkSync(tempJpgPath);
        return null;
    }
});
