const pool = require('./db');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;  
    next();            
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
const checkEmailVerified = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT verified FROM users WHERE id = ? LIMIT 1",
      [req.user.id] // req.user.id viene del JWT
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (!rows[0].verified) {
      return res.status(403).json({ error: "Debes confirmar tu correo antes de continuar." });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


module.exports = { verifyToken, checkRole, checkEmailVerified };
