const pool = require("./db");

const getConfiguracion = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, 
        c.precio_envio, 
        i.id AS id_iva, 
        i.valor AS iva
      FROM configuracion c
      JOIN iva i ON c.id_iva = i.id
      LIMIT 1
    `;

    const [rows] = await pool.query(query);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Error al obtener configuración:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

const agregarIva = async (req, res) => {
  const { valor, activo } = req.body;

  try {
    if (activo) {
      // Desactivar otros
      await pool.query("UPDATE iva SET activo = false");
    }

    await pool.query("INSERT INTO iva (valor, activo) VALUES (?, ?)", [valor, activo]);
    res.status(200).json({ message: "IVA agregado" });
  } catch (err) {
    console.error("Error al agregar IVA:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

const actualizarPrecioEnvio = async (req, res) => {
  const { precio_envio } = req.body;

  try {
    await pool.query("UPDATE configuracion SET precio_envio = ? LIMIT 1", [precio_envio]);
    res.status(200).json({ message: "Precio de envío actualizado" });
  } catch (err) {
    console.error("Error al actualizar precio de envío:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};


module.exports = {
  getConfiguracion,
  actualizarPrecioEnvio,
  agregarIva,
};
