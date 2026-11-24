const express = require('express');
const { supabase } = require('../config/supabase');
const { verificarAuth, permitirRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verificarAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('activos')
    .select(`
      id,
      codigo_qr,
      nombre,
      numero_serie,
      valor,
      ubicacion,
      estado,
      categorias_activo ( id, nombre )
    `)
    .eq('licencia_id', req.usuario.licencia_id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ data });
});

router.post('/', permitirRoles('admin', 'supervisor'), async (req, res) => {
  const { categoria_id, codigo_qr, nombre, numero_serie, valor, ubicacion } = req.body;

  if (!codigo_qr || !nombre) {
    return res.status(400).json({ error: 'codigo_qr y nombre son obligatorios' });
  }

  const { data, error } = await supabase
    .from('activos')
    .insert({
      licencia_id: req.usuario.licencia_id,
      categoria_id: categoria_id || null,
      codigo_qr,
      nombre,
      numero_serie: numero_serie || null,
      valor: valor ?? null,
      ubicacion: ubicacion || null,
      estado: 'disponible',
    })
    .select()
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 400;
    return res.status(status).json({ error: error.message });
  }

  await supabase.from('bitacora_auditoria').insert({
    licencia_id: req.usuario.licencia_id,
    usuario_id: req.usuario.id,
    accion: 'CREAR_ACTIVO',
    entidad: 'activos',
    entidad_id: data.id,
    datos: { codigo_qr: data.codigo_qr, nombre: data.nombre },
    ip: req.ip,
  });

  return res.status(201).json({ data });
});

module.exports = router;