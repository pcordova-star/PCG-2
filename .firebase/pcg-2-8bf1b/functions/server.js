const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrpcg28bf1b = onRequest({"region":"us-central1"}, (req, res) => server.then(it => it.handle(req, res)));
  