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


const getDetallePedido = async (req, res) => {
  const { id_pedido } = req.params; // Recibimos el id del pedido desde los parámetros de la URL

  try {
    // Hacemos la consulta para obtener todos los detalles del pedido con la información completa
    const query = `
      SELECT 
        p.id AS id_pedido,
        p.id_usuario,
        p.fecha_pedido,
        p.estado,
        p.total,
        p.direccion_envio,
        p.provincia,
        p.ciudad,
        p.numeroIdentificacion,
        p.numeroTelefono,
        p.nombrePedido,
        p.nota,
        dp.id_producto,
        pr.nombre AS nombre_producto,
        pr.precio AS precio_unitario,
        dp.cantidad,
        (dp.cantidad * pr.precio) AS subtotal,
        ip.url_imagen AS imagen_producto
      FROM pedidos p
      JOIN detalle_pedido dp ON p.id = dp.id_pedido
      JOIN producto pr ON dp.id_producto = pr.id
      LEFT JOIN imagenes_producto ip ON pr.id = ip.id_producto
      WHERE p.id = ?  -- Filtramos por el id del pedido
    `;

    const [result] = await pool.query(query, [id_pedido]); // Ejecutamos la consulta con el id del pedido

    // Si no se encuentran detalles para el pedido, devolvemos un error
    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontraron detalles para este pedido.' });
    }

    // Respondemos con los detalles del pedido
    res.json(result);
  } catch (error) {
    console.error("Error al obtener detalles del pedido:", error);
    res.status(500).json({ error: "Error al obtener detalles del pedido" });
  }
};

module.exports = {
  getHistorialPedidos,
  getDetallePedido
};
