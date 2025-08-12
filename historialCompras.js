const pool = require('./db'); // Ajusta la ruta según donde tengas el pool de conexión
const crypto = require('crypto');  // Importar el módulo de cifrado
require('dotenv').config(); // Cargar las variables del archivo .env

const secretKey = process.env.SECRET_KEY_ENCRYPTATION; // Obtener la clave secreta

const descifrar = (textoCifrado) => {
  // Separar el IV y el texto cifrado
  const partes = textoCifrado.split(':');
  const iv = Buffer.from(partes[0], 'hex');  // El IV se almacena como un string en hexadecimal
  const textoCifradoFinal = partes[1];  // El texto cifrado real

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
  let descifrado = decipher.update(textoCifradoFinal, 'hex', 'utf8');
  descifrado += decipher.final('utf8');

  return descifrado;
};

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
            p.numeroIdentificacion,
            p.numeroTelefono,
            p.nombrePedido,
            p.nota,
            dp.id_producto,
            pr.nombre AS nombre_producto,
            pr.precio AS precio_unitario,
            dp.cantidad,
            pg.id_pago,
            pg.estado,
            pg.id_anulacion,
            (dp.cantidad * pr.precio) AS subtotal,
            ip.url_imagen AS imagen_producto
        FROM pedidos p
        JOIN detalle_pedido dp ON p.id = dp.id_pedido
        JOIN producto pr ON dp.id_producto = pr.id
        LEFT JOIN imagenes_producto ip ON pr.id = ip.id_producto
        LEFT JOIN pagos pg ON p.id_pago = pg.id
        WHERE p.id = ?
    `;

    const [result] = await pool.query(query, [id_pedido]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontraron detalles para este pedido.' });
    }

    const pedido = {
      ...result[0], 
      productos: result.map((item) => ({
        id_producto: item.id_producto,
        nombre_producto: item.nombre_producto,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
        subtotal: item.subtotal,
        imagen_producto: item.imagen_producto,
      })),
    };

    pedido.direccion_envio = descifrar(pedido.direccion_envio);
    pedido.numeroIdentificacion = descifrar(pedido.numeroIdentificacion);
    pedido.numeroTelefono = descifrar(pedido.numeroTelefono);
    pedido.nombrePedido = descifrar(pedido.nombrePedido);
    pedido.nota = descifrar(pedido.nota);

    res.json(pedido);
  } catch (error) {
    console.error("Error al obtener detalles del pedido:", error);
    res.status(500).json({ error: "Error al obtener detalles del pedido" });
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
        p.provincia,  -- Agregado campo provincia
        p.ciudad     -- Agregado campo ciudad
      FROM pedidos p
      JOIN usuario u ON p.id_usuario = u.id
      ORDER BY p.fecha_pedido DESC
    `;

    const [result] = await pool.query(query);

    // Descifrar los campos sensibles (provincia, ciudad, etc.)
    const historialPedidosDescifrados = result.map(pedido => {
      return {
        ...pedido,
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
  getDetallePedido
};
