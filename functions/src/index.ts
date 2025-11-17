import { initializeApp, getApps } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import next from "next";

if (!getApps().length) {
  initializeApp();
}

const isDev = process.env.NODE_ENV !== "production";

const server = next({
  dev: isDev,
  conf: { distDir: ".next" },
});

const nextjsHandle = server.getRequestHandler();

export const nextFramework = onRequest({
    maxInstances: 2,
    timeoutSeconds: 300
}, (req, res) => {
  return server.prepare().then(() => {
    logger.info("Request received", { path: req.path });
    return nextjsHandle(req, res);
  });
});
