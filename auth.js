require('dotenv').config();

const API_KEY = process.env.API_KEY;

const verifyApiKey = (req, res, next) => {
  const providedKey = req.headers['x-api-key']; // A custom header like X-API-Key

  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ message: 'Acceso denegado: Clave de API inválida' });
  }

  next();
}

module.exports = { verifyApiKey };