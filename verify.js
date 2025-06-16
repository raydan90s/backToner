const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;  // Aquí metemos la info del usuario para rutas siguientes
    next();              // Pasamos al siguiente middleware o controlador
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

const checkRole = (role) => (req, res, next) => {
  if (!req.user || req.user.tipo !== role) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
  }
  next();
};



module.exports = { verifyToken, checkRole };
