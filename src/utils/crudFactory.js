const { supabase } = require('../config/supabase');

function mapPgError(error) {
  if (!error) return { status: 400, message: 'Error desconocido' };
  if (error.code === '23505') {
    return { status: 409, message: 'Registro duplicado (violación de restricción única)', details: error.details };
  }
  if (error.code === '23503') {
    return { status: 400, message: 'Referencia inválida (clave foránea inexistente)', details: error.details };
  }
  if (error.code === '23514') {
    return { status: 400, message: 'Valor fuera de los estados o rangos permitidos', details: error.details };
  }
  return { status: 400, message: error.message, details: error.details };
}

/**
 * Crea un Router Express con CRUD para una tabla de Supabase.
 * @param {object} opts
 * @param {string} opts.table - Nombre de la tabla en PostgreSQL
 * @param {string[]} [opts.allowedFilters=[]] - Columnas permitidas en query string
 * @param {string[]} [opts.insertBlocked=[]] - Campos que el cliente no debe forzar (ej. id, created_at)
 * @param {string[]} [opts.updateBlocked=[]] - Campos prohibidos en PATCH
 * @param {string} [opts.defaultOrder='created_at']
 * @param {boolean} [opts.allowUpdate=true]
 * @param {boolean} [opts.allowDelete=true]
 */
function createCrudRouter(opts) {
  const express = require('express');
  const router = express.Router();

  const {
    table,
    allowedFilters = [],
    insertBlocked = ['id', 'created_at', 'updated_at'],
    updateBlocked = ['id', 'licencia_id', 'created_at', 'updated_at'],
    defaultOrder = 'created_at',
    allowUpdate = true,
    allowDelete = true,
  } = opts;

  // GET / -> Listar con filtros, orden y paginación
  router.get('/', async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const orderBy = req.query.orderBy || defaultOrder;
      const ascending = req.query.ascending === 'true';

      let query = supabase.from(table).select('*', { count: 'exact' });

      for (const col of allowedFilters) {
        if (req.query[col] !== undefined && req.query[col] !== '') {
          query = query.eq(col, req.query[col]);
        }
      }

      query = query.order(orderBy, { ascending }).range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) {
        const mapped = mapPgError(error);
        return res.status(mapped.status).json({ error: mapped.message, details: mapped.details });
      }

      return res.json({ data, count, limit, offset });
    } catch (err) {
      return res.status(500).json({ error: 'Error interno al consultar ' + table });
    }
  });

  // GET /:id -> Obtener uno por UUID
  router.get('/:id', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      return res.json({ data });
    } catch (err) {
      return res.status(500).json({ error: 'Error interno al obtener registro' });
    }
  });

  // POST / -> Crear uno o varios registros
  router.post('/', async (req, res) => {
    try {
      const payload = Array.isArray(req.body) ? req.body : [req.body];
      if (!payload.length || typeof payload[0] !== 'object') {
        return res.status(400).json({ error: 'Cuerpo JSON inválido' });
      }

      const cleaned = payload.map((item) => {
        const copy = { ...item };
        for (const field of insertBlocked) {
          delete copy[field];
        }
        return copy;
      });

      const { data, error } = await supabase
        .from(table)
        .insert(Array.isArray(req.body) ? cleaned : cleaned[0])
        .select();

      if (error) {
        const mapped = mapPgError(error);
        return res.status(mapped.status).json({ error: mapped.message, details: mapped.details });
      }

      return res.status(201).json({ data: Array.isArray(req.body) ? data : data[0] });
    } catch (err) {
      return res.status(500).json({ error: 'Error interno al crear en ' + table });
    }
  });

  // PATCH /:id -> Actualizar parcialmente
  if (allowUpdate) {
    router.patch('/:id', async (req, res) => {
      try {
        const updates = { ...req.body };
        for (const field of updateBlocked) {
          delete updates[field];
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
        }

        const { data, error } = await supabase
          .from(table)
          .update(updates)
          .eq('id', req.params.id)
          .select()
          .single();

        if (error || !data) {
          const mapped = mapPgError(error || { message: 'No encontrado' });
          return res.status(error ? mapped.status : 404).json({ error: mapped.message });
        }

        return res.json({ data });
      } catch (err) {
        return res.status(500).json({ error: 'Error interno al actualizar ' + table });
      }
    });
  }

  // DELETE /:id -> Eliminar por ID
  if (allowDelete) {
    router.delete('/:id', async (req, res) => {
      try {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq('id', req.params.id)
          .select('id')
          .single();

        if (error || !data) {
          const mapped = mapPgError(error || { message: 'No encontrado' });
          return res.status(error ? mapped.status : 404).json({ error: mapped.message });
        }

        return res.json({ deleted: true, id: data.id });
      } catch (err) {
        return res.status(500).json({ error: 'Error interno al eliminar en ' + table });
      }
    });
  }

  return router;
}

module.exports = { createCrudRouter, mapPgError };