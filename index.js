require('dotenv').config();
const app = require('./app');
const { supabase } = require('./src/config/supabase');

const PORT = process.env.PORT || 3000;

// Ruta rápida para probar conexión con la tabla licencias en Supabase
app.get('/api/test-db', async (req, res) => {
  const { data, error } = await supabase
    .from('licencias')
    .select('id, empresa, estado')
    .limit(5);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.json({ ok: true, licencias: data });
});

app.listen(PORT, () => {
  console.log(`GhostPass API corriendo en http://localhost:${PORT}`);
});