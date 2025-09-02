const pool = require('./db'); // Ajusta la ruta según donde tengas el pool de conexión
require('dotenv').config(); // Cargar las variables del archivo .env
const { descifrar } = require('./cifrado');

const getDetallePedido = async (req, res) => {
  const { id_pedido } = req.params;

  try {
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
        p.id_pago,
        p.envio,
        p.iva_valor,
        dp.id_producto,
        dp.cantidad,
        dp.precio_unitario,
        dp.descuento_unitario,
        dp.iva_unitario,
        pr.nombre AS nombre_producto,
        ip.url_imagen AS imagen_producto,
        pg.id_pago AS id_pago,
        pg.id_anulacion AS id_anulacion
      FROM pedidos p
      JOIN detalle_pedido dp ON p.id = dp.id_pedido
      JOIN producto pr ON dp.id_producto = pr.id
      JOIN pagos pg On p.id_pago = pg.id
      LEFT JOIN imagenes_producto ip ON pr.id = ip.id_producto
      WHERE p.id = ?
    `;

    const [result] = await pool.query(query, [id_pedido]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontraron detalles para este pedido.' });
    }

    // Construir el objeto del pedido con productos
    const pedido = {
      ...result[0],
      productos: result.map(item => ({
        id_producto: item.id_producto,
        nombre_producto: item.nombre_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        descuento_unitario: item.descuento_unitario,
        iva_unitario: item.iva_unitario,
        subtotal: (item.precio_unitario * item.cantidad) - (item.descuento_unitario || 0) + (item.iva_unitario || 0),
        imagen_producto: item.imagen_producto,
      })),
    };

    console.log("Pedidos", pedido);

    // Descifrar campos sensibles
    pedido.direccion_envio = descifrar(pedido.direccion_envio);
    pedido.numeroIdentificacion = descifrar(pedido.numeroIdentificacion);
    pedido.numeroTelefono = descifrar(pedido.numeroTelefono);
    pedido.nombrePedido = descifrar(pedido.nombrePedido);
    pedido.nota = descifrar(pedido.nota);
    pedido.provincia = descifrar(pedido.provincia);
    pedido.ciudad = descifrar(pedido.ciudad);

    console.log("Nota descifrada:", pedido.nota);

    res.json(pedido);
  } catch (error) {
    console.error("Error al obtener detalles del pedido:", error);
    res.status(500).json({ error: "Error al obtener detalles del pedido" });
  }
};

const getPedidosUsuario = async (req, res) => {
  const { id_usuario } = req.params;
  const { status, from, to } = req.query; // ya no usamos page ni limit

  try {
    // Construir la consulta base
    let whereConditions = ['p.id_usuario = ?'];
    let queryParams = [id_usuario];

    if (status) {
      whereConditions.push('p.estado = ?');
      queryParams.push(status);
    }

    if (from) {
      whereConditions.push('DATE(p.fecha_pedido) >= ?');
      queryParams.push(from);
    }

    if (to) {
      whereConditions.push('DATE(p.fecha_pedido) <= ?');
      queryParams.push(to);
    }

    const whereClause = whereConditions.join(' AND ');

    // Consulta principal SIN paginación
    const query = `
      SELECT 
        p.id AS id_pedido,
        p.fecha_pedido,
        p.estado,
        p.total,
        p.direccion_envio,
        p.numeroIdentificacion,
        p.numeroTelefono,
        p.nombrePedido,
        p.nota,
        p.provincia,
        p.ciudad,
        pg.estado AS estado_pago,
        SUM(dp.cantidad) AS total_productos
      FROM pedidos p
      LEFT JOIN detalle_pedido dp ON p.id = dp.id_pedido
      LEFT JOIN pagos pg ON p.id_pago = pg.id
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY p.fecha_pedido DESC;
    `;

    const [result] = await pool.query(query, queryParams);

    // Descifrar campos sensibles
    const pedidosDescifrados = result.map(pedido => ({
      id: pedido.id_pedido,
      numero_orden: `ORD-${String(pedido.id_pedido).padStart(6, '0')}`,
      fecha_creacion: pedido.fecha_pedido,
      estado: pedido.estado,
      total: parseFloat(pedido.total),
      total_productos: pedido.total_productos,
      estado_pago: pedido.estado_pago,
      id_anulacion: pedido.id_anulacion,
      direccion_envio: {
        direccion: pedido.direccion_envio ? descifrar(pedido.direccion_envio) : null,
        ciudad: pedido.ciudad ? descifrar(pedido.ciudad) : null,
        provincia: pedido.provincia ? descifrar(pedido.provincia) : null,
      },
      nombre_pedido: pedido.nombrePedido ? descifrar(pedido.nombrePedido) : null,
      telefono: pedido.numeroTelefono ? descifrar(pedido.numeroTelefono) : null,
      identificacion: pedido.numeroIdentificacion ? descifrar(pedido.numeroIdentificacion) : null,
      nota: pedido.nota ? descifrar(pedido.nota) : null,
    }));

    res.json({
      orders: pedidosDescifrados,
      totalOrders: pedidosDescifrados.length,
    });

  } catch (error) {
    console.error("Error al obtener pedidos del usuario:", error);
    res.status(500).json({ error: "Error al obtener pedidos del usuario" });
  }
};

const getHistorialPedidos = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id AS id_pedido,
        u.nombre AS nombre_usuario,
        p.fecha_pedido,
        p.total,
        p.estado,
        p.provincia,  
        p.ciudad    
      FROM pedidos p
      JOIN usuario u ON p.id_usuario = u.id
      ORDER BY p.fecha_pedido DESC
    `;

    const [result] = await pool.query(query);

    // Descifrar los campos sensibles (provincia, ciudad, etc.)
    const historialPedidosDescifrados = result.map(pedido => {
      return {
        ...pedido,
        nombre_usuario: pedido.nombre_usuario ? descifrar(pedido.nombre_usuario) : null,
        provincia: descifrar(pedido.provincia),
        ciudad: descifrar(pedido.ciudad),
      };
    });

    res.json(historialPedidosDescifrados);
  } catch (error) {
    console.error("Error al obtener historial de pedidos:", error);
    res.status(500).json({ error: "Error al obtener historial de pedidos" });
  }
};



module.exports = {
  getHistorialPedidos,
  getDetallePedido,
  getPedidosUsuario
};
