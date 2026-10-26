const pool = require('./db');

pool.query('SELECT COUNT(*) FROM provincia')
  .then(r => { console.log('Conexión OK. Provincias:', r.rows[0].count); process.exit(); })
  .catch(e => { console.error('Error:', e.message); process.exit(1); });