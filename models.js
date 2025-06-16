const pool = require("./db");

const createModel = async (req, res) => {
  const { nombre, id_marca } = req.body;

  if (!nombre || !id_marca) {
    return res.status(400).json({ error: "Nombre e id_marca son requeridos" });
  }

  try {
    const query = "INSERT INTO modelo (nombre, id_marca) VALUES (?, ?)";
    const [result] = await pool.query(query, [nombre.trim(), id_marca]);

    const nuevoModelo = {
      id: result.insertId,
      nombre: nombre.trim(),
      id_marca,
    };

    res.status(201).json(nuevoModelo);
  } catch (err) {
    console.error("Error al insertar modelo:", err);
    res.status(500).json({ error: "Error al insertar modelo" });
  }
};

const getModelsByBrand = async (req, res) => {
  const { id_marca } = req.params;

  if (!id_marca) {
    return res.status(400).json({ error: "Se requiere id_marca" });
  }

  try {
    const query = "SELECT id, nombre FROM modelo WHERE id_marca = ?";
    const [rows] = await pool.query(query, [id_marca]);

    res.status(200).json(rows);
  } catch (err) {
    console.error("Error al obtener modelos por marca:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

module.exports = {
  getModelsByBrand,
  createModel,
};
