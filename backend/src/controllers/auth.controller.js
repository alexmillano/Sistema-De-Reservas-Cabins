const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generarToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

const register = async (req, res) => {
  const { nombre, apellido, email, usuario, password, fecha_nacimiento } = req.body;

  if (!nombre || !apellido || !email || !usuario || !password) {
    return res.status(400).json({
      message: 'Nombre, apellido, email, usuario y contraseña son obligatorios'
    });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const existente = await db.query(
      'SELECT id FROM usuario WHERE email = $1 OR usuario = $2',
      [email, usuario]
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({ message: 'El email o el usuario ya están registrados' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO usuario (nombre, apellido, email, usuario, password, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [nombre, apellido, email, usuario, hash, fecha_nacimiento || null]
    );

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const login = async (req, res) => {
  const { identificador, password } = req.body;

  if (!identificador || !password) {
    return res.status(400).json({ message: 'Usuario o email y contraseña son obligatorios' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM usuario WHERE email = $1 OR usuario = $1',
      [identificador]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const valida = await bcrypt.compare(password, user.password);
    if (!valida) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generarToken({ id: user.id, usuario: user.usuario, rol: 'usuario' });

    res.json({
      message: 'Login exitoso',
      token,
      user: { id: user.id, nombre: user.nombre, apellido: user.apellido, usuario: user.usuario, email: user.email, rol: 'usuario' }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const loginAdmin = async (req, res) => {
  const { identificador, password } = req.body;

  if (!identificador || !password) {
    return res.status(400).json({ message: 'Usuario o email y contraseña son obligatorios' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM admin WHERE email = $1 OR usuario = $1',
      [identificador]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const admin = result.rows[0];
    const valida = await bcrypt.compare(password, admin.password);
    if (!valida) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generarToken({
      id: admin.id,
      usuario: admin.usuario,
      rol: 'admin',
      es_superadmin: admin.es_superadmin
    });

    res.json({
      message: 'Login exitoso',
      token,
      user: { id: admin.id, nombre: admin.nombre, apellido: admin.apellido, usuario: admin.usuario, email: admin.email, rol: 'admin', es_superadmin: admin.es_superadmin }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { register, login, loginAdmin };