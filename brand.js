const pool = require("./db");

const createBrand = async (req, res) => {
  const { nombre } = req.body;

  if (!nombre || nombre.trim() === "") {
    return res.status(400).json({ error: "El nombre de la marca es obligatorio" });
  }

  try {
    const query = "INSERT INTO marcas (nombre) VALUES (?)";
    const [result] = await pool.query(query, [nombre.trim()]);

    return res.status(201).json({
      id: result.insertId,
      nombre: nombre.trim(),
    });
  } catch (err) {
    console.error("Error al insertar la marca:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};


const getAllBrands = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM marcas");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener marcas:", error);
    res.status(500).json({ error: "Error al obtener marcas" });
  }
};

module.exports = {
  createBrand,
  getAllBrands,
};
