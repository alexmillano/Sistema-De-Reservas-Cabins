require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

const crearSuperadmin = async () => {
  const { SEED_EMAIL, SEED_USUARIO, SEED_PASSWORD, SEED_LLAVE } = process.env;

  if (!SEED_EMAIL || !SEED_USUARIO || !SEED_PASSWORD || !SEED_LLAVE) {
    console.error('Faltan variables SEED_* en el .env');
    process.exit(1);
  }

  try {
    const existente = await pool.query(
      'SELECT id FROM admin WHERE email = $1 OR usuario = $2',
      [SEED_EMAIL, SEED_USUARIO]
    );
    if (existente.rows.length > 0) {
      console.log('Ya existe un admin con ese email o usuario');
      process.exit(0);
    }

    const hashPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    const hashLlave = await bcrypt.hash(SEED_LLAVE, 10);

    await pool.query(
      `INSERT INTO admin
        (nombre, apellido, email, usuario, password, llave_maestra, es_superadmin)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
      ['Alexander', 'Millano', SEED_EMAIL, SEED_USUARIO, hashPassword, hashLlave]
    );

    console.log('Superadmin creado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

crearSuperadmin();