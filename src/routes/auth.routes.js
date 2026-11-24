const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

const router = express.Router();

// PASO 1: Validar Licencia SaaS
router.post('/verificar-licencia', async (req, res) => {
  try {
    const { identificador } = req.body; // Puede ser el UUID de la licencia o el nombre de la empresa

    if (!identificador || !identificador.trim()) {
      return res.status(400).json({ error: 'Ingresa el ID de licencia o nombre de empresa' });
    }

    const valor = identificador.trim();
    const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

    let query = supabase
      .from('licencias')
      .select('id, empresa, plan, fecha_inicio, fecha_fin, estado');

    query = esUuid ? query.eq('id', valor) : query.ilike('empresa', valor);

    const { data: licencia, error } = await query.maybeSingle();

    if (error || !licencia) {
      return res.status(404).json({ error: 'Licencia SaaS no encontrada' });
    }

    if (licencia.estado !== 'activa') {
      return res.status(403).json({
        error: `Licencia no disponible (estado: ${licencia.estado})`,
      });
    }

    const hoy = new Date().toISOString().slice(0, 10);
    if (licencia.fecha_fin < hoy) {
      return res.status(403).json({
        error: `La licencia venció el ${licencia.fecha_fin}`,
      });
    }

    return res.json({
      ok: true,
      licencia,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno al verificar licencia' });
  }
});

// PASO 2: Login de Administrador vinculado a la licencia validada
router.post('/login', async (req, res) => {
  try {
    const { licencia_id, correo, password, solo_admin = true, dispositivo_id } = req.body;

    if (!licencia_id || !correo || !password) {
      return res.status(400).json({ error: 'Licencia, correo y contraseña requeridos' });
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        licencia_id,
        nombre,
        correo,
        password_hash,
        rol,
        activo,
        licencias ( id, empresa, plan, estado, fecha_fin )
      `)
      .eq('licencia_id', licencia_id)
      .ilike('correo', correo.trim())
      .maybeSingle();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas para esta licencia' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Tu usuario se encuentra desactivado' });
    }

    if (!usuario.licencias || usuario.licencias.estado !== 'activa') {
      return res.status(403).json({ error: 'La licencia de la empresa no está activa' });
    }

    if (solo_admin && !['admin', 'supervisor'].includes(usuario.rol)) {
      return res.status(403).json({
        error: 'Acceso denegado: se requiere rol de administrador o supervisor',
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const accessToken = jwt.sign(
      {
        sub: usuario.id,
        licencia_id: usuario.licencia_id,
        rol: usuario.rol,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '2h' }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('sesiones').insert({
      usuario_id: usuario.id,
      dispositivo_id: dispositivo_id || null,
      token_hash: tokenHash,
      expira_en: expiraEn,
    });

    await supabase.from('bitacora_auditoria').insert({
      licencia_id: usuario.licencia_id,
      usuario_id: usuario.id,
      accion: 'LOGIN_ADMIN',
      entidad: 'usuarios',
      entidad_id: usuario.id,
      datos: { rol: usuario.rol },
      ip: req.ip,
    });

    return res.json({
      ok: true,
      accessToken,
      refreshToken,
      licencia: usuario.licencias,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        licencia_id: usuario.licencia_id,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno en el inicio de sesión' });
  }
});

module.exports = router;