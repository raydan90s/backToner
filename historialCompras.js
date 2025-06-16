// historialController.js
const pool = require('./db'); // Ajusta la ruta según donde tengas el pool de conexión

const getHistorialPedidos = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id AS id_pedido,
        u.nombre AS nombre_usuario,
        p.fecha_pedido,
        p.total,
        p.estado
      FROM pedidos p
      JOIN usuario u ON p.id_usuario = u.id
      ORDER BY p.fecha_pedido DESC
    `;

    const [result] = await pool.query(query);
    res.json(result);
  } catch (error) {
    console.error("Error al obtener historial de pedidos:", error);
    res.status(500).json({ error: "Error al obtener historial de pedidos" });
  }
};

module.exports = {
  getHistorialPedidos
};
