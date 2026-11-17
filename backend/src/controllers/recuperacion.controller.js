const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { enviarCorreo, correoConfigurado, plantillaRecuperacion } = require('../utils/correo');

const VIDA_TOKEN_MIN = 60;
const MAX_PEDIDOS_POR_HORA = 3;
const hashear = (token) => crypto.createHash('sha256').update(token).digest('hex');
const RESPUESTA = { message: 'Si el email está registrado, te enviamos un enlace para restablecer tu contraseña. Revisá también la carpeta de spam.' };

// POST /api/auth/olvide-clave   { email }
// Siempre responde lo mismo, exista o no el email, para no revelar quién está registrado.
const olvideClave = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || email.length > 150 || !email.includes('@')) {
    return res.status(400).json({ message: 'Ingresá un email válido' });
  }
  if (!correoConfigurado()) {
    console.error('Recuperación de contraseña: faltan BREVO_API_KEY o BREVO_SENDER_EMAIL');
    return res.status(503).json({ message: 'El envío de mails no está configurado en el servidor' });
  }

  try {
    const cuentas = [];
    for (const [rol, tabla] of [['usuario', 'usuario'], ['admin', 'admin']]) {
      const r = await db.query(`SELECT id, nombre, email, baneado FROM ${tabla} WHERE LOWER(email) = $1`, [email]);
      r.rows.forEach((c) => cuentas.push({ ...c, rol }));
    }

    for (const c of cuentas) {
      if (c.baneado) continue; // cuenta suspendida: no se recupera por mail
      const pedidos = await db.query(
        `SELECT COUNT(*)::int AS n FROM recuperacion_clave
          WHERE rol = $1 AND cuenta_id = $2 AND created_at > NOW() - INTERVAL '1 hour'`,
        [c.rol, c.id]
      );
      if (pedidos.rows[0].n >= MAX_PEDIDOS_POR_HORA) continue; // freno anti-abuso

      const token = crypto.randomBytes(32).toString('hex');
      await db.query(
        `INSERT INTO recuperacion_clave (rol, cuenta_id, token_hash, expira)
         VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)`,
        [c.rol, c.id, hashear(token), String(VIDA_TOKEN_MIN)]
      );
      const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
      const enlace = `${base}/restablecer-contrasena?token=${token}`;
      try {
        await enviarCorreo({ para: c.email, nombre: c.nombre, ...plantillaRecuperacion({ nombre: c.nombre, enlace }) });
      } catch (err) {
        console.error('No se pudo enviar el mail de recuperación:', err.message);
      }
    }
    res.json(RESPUESTA);
  } catch (error) {
    console.error('Error en olvideClave:', error.message);
    res.status(500).json({ message: 'No pudimos procesar el pedido. Probá de nuevo en unos minutos.' });
  }
};

// POST /api/auth/restablecer-clave   { token, password }
const restablecerClave = async (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ message: 'El enlace no es válido o ya venció. Pedí uno nuevo.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Se "gasta" el token de forma atómica: dos pedidos a la vez no pueden usarlo ambos
    const gastado = await client.query(
      `UPDATE recuperacion_clave SET usado_at = NOW()
        WHERE token_hash = $1 AND usado_at IS NULL AND expira > NOW()
        RETURNING rol, cuenta_id`,
      [hashear(token)]
    );
    if (gastado.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'El enlace no es válido o ya venció. Pedí uno nuevo.' });
    }
    const { rol, cuenta_id } = gastado.rows[0];
    const tabla = rol === 'admin' ? 'admin' : 'usuario';
    const cuenta = await client.query(`SELECT baneado FROM ${tabla} WHERE id = $1`, [cuenta_id]);
    if (cuenta.rows.length === 0 || cuenta.rows[0].baneado) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Tu usuario se encuentra inactivo, contactate para solucionar' });
    }
    const hash = await bcrypt.hash(password, 10);
    await client.query(`UPDATE ${tabla} SET password = $1 WHERE id = $2`, [hash, cuenta_id]);
    // Cualquier otro enlace pendiente de esa cuenta queda sin efecto
    await client.query(
      `UPDATE recuperacion_clave SET usado_at = NOW() WHERE rol = $1 AND cuenta_id = $2 AND usado_at IS NULL`,
      [rol, cuenta_id]
    );
    await client.query('COMMIT');
    res.json({ message: 'Contraseña actualizada. Ya podés iniciar sesión.', rol });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error en restablecerClave:', error.message);
    res.status(500).json({ message: 'No pudimos cambiar la contraseña. Probá de nuevo.' });
  } finally {
    client.release();
  }
};

module.exports = { olvideClave, restablecerClave };
