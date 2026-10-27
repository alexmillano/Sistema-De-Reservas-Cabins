const jwt = require('jsonwebtoken');
const db = require('../config/db');

// La consulta sale de esta lista cerrada, nunca de lo que mande el cliente
const CONSULTAS = {
  usuario: 'SELECT baneado FROM usuario WHERE id = $1',
  admin: 'SELECT baneado, es_superadmin FROM admin WHERE id = $1'
};

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado, token no proporcionado' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }

  if (!Object.hasOwn(CONSULTAS, payload.rol)) {
    return res.status(403).json({ message: 'Token inválido' });
  }

  try {
    const result = await db.query(CONSULTAS[payload.rol], [payload.id]);
    const cuenta = result.rows[0];

    if (!cuenta) {
      return res.status(401).json({ message: 'La cuenta ya no existe' });
    }
    if (cuenta.baneado) {
      return res.status(403).json({ message: 'Tu cuenta está suspendida' });
    }

    req.user = payload;
    // es_superadmin se toma de la base, no del token
    if (payload.rol === 'admin') {
      req.user.es_superadmin = cuenta.es_superadmin;
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }

  next();
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'Se requiere rol de administrador' });
    }
    next();
  });
};

const verifySuperadmin = (req, res, next) => {
  verifyAdmin(req, res, () => {
    if (!req.user.es_superadmin) {
      return res.status(403).json({ message: 'Se requiere rol de superadmin' });
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

module.exports = { verifyToken, verifyAdmin, verifySuperadmin, verifyUsuario };