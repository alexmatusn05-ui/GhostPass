const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crudRoutes = require('./src/routes/crud.routes');
const authRoutes = require('./src/routes/auth.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', crudRoutes);

const endpoints = [
  '/health',
  '/api/licencias',
  '/api/usuarios',
  '/api/dispositivos',
  '/api/categorias-activo',
  '/api/activos',
  '/api/solicitudes',
  '/api/asignaciones',
  '/api/evidencias',
  '/api/evidencias-archivos',
  '/api/programacion-evidencias',
  '/api/cartas-responsivas',
  '/api/incidentes',
  '/api/mensajes',
  '/api/notificaciones',
  '/api/bitacora-auditoria',
  '/api/sesiones',
];

app.get('/', (req, res) => {
  res.json({
    service: 'ghostpass-api',
    status: 'running',
    endpoints,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ghostpass-api' });
});

app.use('/api', crudRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

module.exports = app;