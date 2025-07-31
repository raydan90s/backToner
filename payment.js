// payments.js
const bcrypt = require('bcryptjs');  // Importar bcryptjs
const pool = require('./db');  // Importar la conexión a la base de datos

const registrarPago = async (resourcePath, estadoPago, codigoPago, esExitoso, usuarioCorreo, productosCarrito) => {
    try {
        // Verificar que productosCarrito no sea undefined ni null
        if (!productosCarrito || !productosCarrito.total) {
            throw new Error("❌ El carrito de productos no contiene los datos necesarios.");
        }

        const encryptedCorreo = await bcrypt.hash(usuarioCorreo, 10);
        const encryptedEstadoPago = await bcrypt.hash(estadoPago, 10);
        const encryptedCodigoPago = await bcrypt.hash(codigoPago, 10);

        // Resto de la lógica para registrar el pago en la base de datos
        const query = `
      INSERT INTO pagos (resourcePath, estadoPago, codigoPago, esExitoso, usuarioCorreo)
      VALUES (?, ?, ?, ?, ?)
    `;

        const [result] = await pool.execute(query, [
            resourcePath,
            encryptedEstadoPago,
            encryptedCodigoPago,
            esExitoso,
            encryptedCorreo
        ]);

        // Si el pago fue exitoso, crear el pedido
        if (esExitoso) {
            const [pedidoResult] = await pool.execute(`
        INSERT INTO pedidos (id_usuario, fecha_pedido, estado, total, direccion_envio)
        VALUES (?, NOW(), 'En proceso', ?, ?)
      `, [usuarioCorreo, productosCarrito.total, productosCarrito.direccionEnvio]);

            const pedidoId = pedidoResult.insertId;
            for (let producto of productosCarrito.productos) {
                await pool.execute(`
          INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario)
          VALUES (?, ?, ?, ?)
        `, [pedidoId, producto.id, producto.cantidad, producto.precio]);
            }
        }

        res.status(200).json({ message: 'Pago registrado correctamente' });
    } catch (error) {
        console.error("❌ Error al registrar el pago:", error);
        res.status(500).json({ error: error.message });
    }
};


module.exports = registrarPago;
