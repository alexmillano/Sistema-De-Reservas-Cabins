const express = require('express');
const cors = require('cors');
const cabanaRoutes = require('./routes/cabana.routes');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const ubicacionRoutes = require('./routes/ubicacion.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/cabanas', cabanaRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'API de Cabins funcionando' });
});

app.use('/api/auth', authRoutes);
app.use('/api', ubicacionRoutes);
app.use('/api/cabanas', cabanaRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});