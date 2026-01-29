"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlanoAsDataUri = getPlanoAsDataUri;
const firebaseAdmin_1 = require("../firebaseAdmin");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
const bucket = adminApp.storage().bucket();
async function getPlanoAsDataUri(storagePath) {
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
        throw new Error(`File not found in Storage: ${storagePath}`);
    }
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'application/octet-stream';
    const [buffer] = await file.download();
    const base64 = buffer.toString('base64');
    return {
        data: base64,
        mimeType: contentType
    };
}
//# sourceMappingURL=storage.js.map