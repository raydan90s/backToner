const bcrypt = require('bcryptjs');  // Importar bcryptjs
const pool = require('./db');  // Importar la conexión a la base de datos

// Función para registrar el pago
const registrarPago = async (req, res) => {
    const { resourcePath, estadoPago, codigoPago, esExitoso, usuarioCorreo, productosCarrito } = req.body;

    // Verificar que los datos necesarios estén presentes
    console.log('Datos recibidos:', req.body); // Verificar los datos recibidos del frontend
    if (!productosCarrito || !productosCarrito.total || !usuarioCorreo) {
        console.error("❌ Faltan datos obligatorios");
        return res.status(400).json({ success: false, error: "Faltan datos obligatorios (productosCarrito o usuarioCorreo)." });
    }

    try {
        // Encriptar los datos sensibles antes de guardarlos
        console.log("🔒 Encriptando datos...");
        const encryptedCorreo = await bcrypt.hash(usuarioCorreo, 10);
        const encryptedEstadoPago = await bcrypt.hash(estadoPago, 10);
        const encryptedCodigoPago = await bcrypt.hash(codigoPago, 10);

        console.log("🔐 Datos encriptados:", { encryptedCorreo, encryptedEstadoPago, encryptedCodigoPago });

        // Insertar el pago en la base de datos
        const query = `INSERT INTO pagos (resourcePath, estadoPago, codigoPago, esExitoso, fechaPago, usuarioCorreo)
    VALUES (?, ?, ?, ?, NOW(), ?)`;

        console.log("📤 Insertando pago en la base de datos...");
        const [result] = await pool.execute(query, [
            resourcePath,           // resourcePath del pago
            encryptedEstadoPago,    // Estado del pago (encriptado)
            encryptedCodigoPago,    // Código del pago (encriptado)
            esExitoso ? 1 : 0,      // Convertir esExitoso a 1 o 0
            encryptedCorreo         // Correo del usuario (encriptado)
        ]);

        console.log("✅ Pago insertado:", result);


        // Si el pago fue exitoso, registrar el pedido
        if (esExitoso) {
            console.log("🛒 Registrando el pedido...");
            const [pedidoResult] = await pool.execute(`
                INSERT INTO pedidos (id_usuario, fecha_pedido, estado, total, direccion_envio)
                VALUES (?, NOW(), 'En proceso', ?, ?)
            `, [usuarioCorreo, productosCarrito.total, productosCarrito.direccionEnvio]);

            console.log("✅ Pedido registrado:", pedidoResult);

            const pedidoId = pedidoResult.insertId;
            for (let producto of productosCarrito.productos) {
                console.log(`🔄 Insertando detalle de pedido para producto ID: ${producto.id}`);
                await pool.execute(`
                    INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad)
                    VALUES (?, ?, ?)
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
