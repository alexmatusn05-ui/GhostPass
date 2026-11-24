const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

async function verificarAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        licencia_id,
        nombre,
        correo,
        rol,
        activo,
        licencias (
          id,
          empresa,
          plan,
          estado,
          fecha_fin
        )
      `)
      .eq('id', payload.sub)
      .single();

    if (error || !usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario inválido o inactivo' });
    }

    if (!usuario.licencias || usuario.licencias.estado !== 'activa') {
      return res.status(403).json({
        error: `La licencia se encuentra en estado: ${usuario.licencias?.estado ?? 'no encontrada'}`,
      });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { verificarAuth, permitirRoles };