const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado, token no proporcionado' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token inválido o expirado' });
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'Se requiere rol de administrador' });
    }
    next();
  });
};

const verifyUsuario = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.rol !== 'usuario') {
      return res.status(403).json({ message: 'Esta acción es solo para usuarios' });
    }
    next();
  });
};

module.exports = { verifyToken, verifyAdmin, verifyUsuario };