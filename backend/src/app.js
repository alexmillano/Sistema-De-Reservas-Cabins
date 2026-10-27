const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const ubicacionRoutes = require('./routes/ubicacion.routes');
const cabanaRoutes = require('./routes/cabana.routes');
const carritoRoutes = require('./routes/carrito.routes');
const reservaRoutes = require('./routes/reserva.routes');
const notificacionRoutes = require('./routes/notificacion.routes');
const reclamoRoutes = require('./routes/reclamo.routes');
const calificacionRoutes = require('./routes/calificacion.routes');
const opinionRoutes = require('./routes/opinion.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API de Cabins funcionando' });
});

app.use('/api/auth', authRoutes);
app.use('/api', ubicacionRoutes);
app.use('/api/cabanas', cabanaRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/reclamos', reclamoRoutes);
app.use('/api/calificaciones', calificacionRoutes);
app.use('/api/opiniones', opinionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, (error) => {
  if (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});