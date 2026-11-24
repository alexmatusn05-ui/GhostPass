const express = require('express');
const { createCrudRouter } = require('../utils/crudFactory');

const router = express.Router();

// BASE Y PERSONAS
router.use('/licencias', createCrudRouter({
  table: 'licencias',
  allowedFilters: ['estado', 'plan'],
}));

router.use('/usuarios', createCrudRouter({
  table: 'usuarios',
  allowedFilters: ['licencia_id', 'rol', 'activo'],
}));

router.use('/dispositivos', createCrudRouter({
  table: 'dispositivos',
  allowedFilters: ['usuario_id', 'plataforma'],
}));

// CONTROL
router.use('/categorias-activo', createCrudRouter({
  table: 'categorias_activo',
  allowedFilters: ['licencia_id'],
}));

router.use('/activos', createCrudRouter({
  table: 'activos',
  allowedFilters: ['licencia_id', 'categoria_id', 'estado', 'codigo_qr'],
}));

// TRAZABILIDAD
router.use('/solicitudes', createCrudRouter({
  table: 'solicitudes',
  allowedFilters: ['activo_id', 'trabajador_id', 'estado', 'resuelta_por'],
  defaultOrder: 'fecha',
}));

router.use('/asignaciones', createCrudRouter({
  table: 'asignaciones',
  allowedFilters: ['activo_id', 'trabajador_id', 'entregado_por', 'estado'],
  defaultOrder: 'fecha_entrega',
}));

router.use('/evidencias', createCrudRouter({
  table: 'evidencias',
  allowedFilters: ['asignacion_id', 'tipo'],
  defaultOrder: 'fecha',
}));

router.use('/evidencias-archivos', createCrudRouter({
  table: 'evidencias_archivos',
  allowedFilters: ['evidencia_id', 'tipo_mime'],
}));

router.use('/programacion-evidencias', createCrudRouter({
  table: 'programacion_evidencias',
  allowedFilters: ['asignacion_id'],
  defaultOrder: 'proxima_fecha',
}));

router.use('/cartas-responsivas', createCrudRouter({
  table: 'cartas_responsivas',
  allowedFilters: ['asignacion_id'],
  defaultOrder: 'fecha',
}));

// SEGURIDAD Y COMUNICACION
router.use('/incidentes', createCrudRouter({
  table: 'incidentes',
  allowedFilters: ['activo_id', 'asignacion_id', 'reportado_por', 'tipo', 'estado'],
}));

router.use('/mensajes', createCrudRouter({
  table: 'mensajes',
  allowedFilters: ['licencia_id', 'remitente_id', 'destinatario_id', 'activo_id', 'leido'],
  defaultOrder: 'fecha',
}));

router.use('/notificaciones', createCrudRouter({
  table: 'notificaciones',
  allowedFilters: ['usuario_id', 'tipo', 'leida'],
  defaultOrder: 'fecha',
}));

// Bitácora: solo lectura y creación (el trigger bloquea UPDATE/DELETE)
router.use('/bitacora-auditoria', createCrudRouter({
  table: 'bitacora_auditoria',
  allowedFilters: ['licencia_id', 'usuario_id', 'accion', 'entidad', 'entidad_id'],
  defaultOrder: 'fecha',
  allowUpdate: false,
  allowDelete: false,
}));

router.use('/sesiones', createCrudRouter({
  table: 'sesiones',
  allowedFilters: ['usuario_id', 'dispositivo_id', 'revocado'],
  defaultOrder: 'expira_en',
}));

module.exports = router;