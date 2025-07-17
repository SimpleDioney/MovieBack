// services/cache.js

const mcache = require('memory-cache');

const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // A chave do cache será a URL da requisição (ex: /api/discover)
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = mcache.get(key);

    if (cachedBody) {
      // Se encontrarmos a resposta no cache, a enviamos diretamente.
      console.log(`Cache HIT para a chave: ${key}`);
      res.send(cachedBody);
      return;
    } else {
      // Se não, guardamos a função res.send original e a substituímos
      console.log(`Cache MISS para a chave: ${key}`);
      res.sendResponse = res.send;
      res.send = (body) => {
        // Quando a resposta for enviada, a guardamos no cache antes.
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body);
      };
      next();
    }
  };
};

module.exports = cacheMiddleware;