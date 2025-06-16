const checkRole = (role) => (req, res, next) => {
  if (!req.user || req.user.tipo !== role) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
  }
  next();
};

module.exports = checkRole;
