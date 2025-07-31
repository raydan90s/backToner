const bcrypt = require('bcryptjs');  // Importar bcryptjs
const pool = require('./db');  // Importar la conexión a la base de datos

const registrarPago = async (req, res) => {
    const { resourcePath, estadoPago, codigoPago, esExitoso, usuarioId, productosCarrito } = req.body;

    // Verificar que los datos necesarios estén presentes
    console.log('Datos recibidos:', req.body); // Verificar los datos recibidos del frontend
    if (!productosCarrito || !productosCarrito.total || !productosCarrito.productos || !usuarioId) {
        console.error("❌ Faltan datos obligatorios");
        return res.status(400).json({ success: false, error: "Faltan datos obligatorios (productosCarrito o usuarioId)." });
    }

    // Reemplazar valores undefined por null
    const direccionEnvio = productosCarrito.direccionEnvio || null;  // Asegúrate de que direccionEnvio no sea undefined
    const total = productosCarrito.total || 0;  // Asegúrate de que total no sea undefined
    const productos = productosCarrito.productos || []; // Si no hay productos, enviar un array vacío

    if (!total || productos.length === 0) {
        console.error("❌ El carrito está vacío o el total es inválido");
        return res.status(400).json({ success: false, error: "El carrito está vacío o el total es inválido" });
    }

    try {
        // Encriptar los datos sensibles antes de guardarlos
        console.log("🔒 Encriptando datos...");
        const encryptedEstadoPago = await bcrypt.hash(estadoPago, 10);
        const encryptedCodigoPago = await bcrypt.hash(codigoPago, 10);

        console.log("🔐 Datos encriptados:", { encryptedEstadoPago, encryptedCodigoPago });

        // Insertar el pago en la base de datos
        const query = `
            INSERT INTO pagos (resourcePath, estadoPago, codigoPago, esExitoso, fechaPago, usuario_id)
            VALUES (?, ?, ?, ?, NOW(), ?)
        `;

        console.log("📤 Insertando pago en la base de datos...");
        const [result] = await pool.execute(query, [
            resourcePath,           // resourcePath del pago
            encryptedEstadoPago,    // Estado del pago (encriptado)
            encryptedCodigoPago,    // Código del pago (encriptado)
            esExitoso ? 1 : 0,      // Convertir esExitoso a 1 o 0
            usuarioId               // ID del usuario (no encriptado)
        ]);

        console.log("✅ Pago insertado:", result);

        // Si el pago fue exitoso, registrar el pedido
        if (esExitoso) {
            console.log("🛒 Registrando el pedido...");
            const [pedidoResult] = await pool.execute(`
                INSERT INTO pedidos (id_usuario, fecha_pedido, estado, total, direccion_envio)
                VALUES (?, NOW(), 'En proceso', ?, ?)
            `, [usuarioId, total, direccionEnvio]);

            console.log("✅ Pedido registrado:", pedidoResult);

            const pedidoId = pedidoResult.insertId;
            for (let producto of productos) {
                // Verificar que cada producto tenga los datos necesarios
                if (!producto.id || !producto.cantidad || !producto.precio) {
                    console.error("❌ Faltan datos del producto");
                    return res.status(400).json({ success: false, error: "Faltan datos del producto" });
                }

                console.log(`🔄 Insertando detalle de pedido para producto ID: ${producto.id}`);
                await pool.execute(`
                    INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario)
                    VALUES (?, ?, ?, ?)
                `, [pedidoId, producto.id, producto.cantidad, producto.precio]);
            }
        }

        // Responder con éxito
        console.log("✅ Pago registrado correctamente");
        res.status(200).json({ success: true, message: 'Pago registrado correctamente' });
    } catch (error) {
        // Manejar errores
        console.error('❌ Error al registrar el pago:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};



module.exports = registrarPago;
