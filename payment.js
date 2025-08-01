const bcrypt = require('bcryptjs'); // Importar bcryptjs
const pool = require('./db'); // Importar la conexión a la base de datos

const registrarPago = async (req, res) => {
    const { resourcePath, estadoPago, codigoPago, esExitoso, usuarioId, productosCarrito, direccionEnvio } = req.body;

    // Verificar que los datos necesarios estén presentes
    console.log('Datos recibidos:', req.body); // Verificar los datos recibidos del frontend
    if (!productosCarrito || !productosCarrito.total || !productosCarrito.productos || !usuarioId || !direccionEnvio) {
        console.error("❌ Faltan datos obligatorios");
        return res.status(400).json({ success: false, error: "Faltan datos obligatorios (productosCarrito, usuarioId o direccionEnvio)." });
    }

    const direccionCalle = direccionEnvio.direccion || null; 
    const provincia = direccionEnvio.provincia || null;       
    const ciudad = direccionEnvio.ciudad || null;       
    const numeroIdentificacion = direccionEnvio.cedula || null;
    const numeroTelefono = direccionEnvio.telefono || null;
    const nombrePedido = `${direccionEnvio.nombre} ${direccionEnvio.apellido}` || null; 
    const total = productosCarrito.total || 0; 
    const productos = productosCarrito.productos || []; 

    if (!total || productos.length === 0) {
        console.error("❌ El carrito está vacío o el total es inválido");
        return res.status(400).json({ success: false, error: "El carrito está vacío o el total es inválido" });
    }

    try {
        // Encriptar los datos sensibles (estado y código de pago) antes de guardarlos.
        // Esto es una medida de seguridad crucial.
        console.log("🔒 Encriptando datos de pago sensibles...");
        const encryptedEstadoPago = await bcrypt.hash(estadoPago, 10);
        const encryptedCodigoPago = await bcrypt.hash(codigoPago, 10);

        // Insertar el pago en la base de datos
        // NOTA: 'usuario_id' se inserta sin encriptar, ya que es un ID de referencia.
        const query = `
            INSERT INTO pagos (resourcePath, estadoPago, codigoPago, esExitoso, fechaPago, usuario_id)
            VALUES (?, ?, ?, ?, NOW(), ?)
        `;

        console.log("📤 Insertando pago en la base de datos...");
        const [result] = await pool.execute(query, [
            resourcePath,
            encryptedEstadoPago,
            encryptedCodigoPago,
            esExitoso ? 1 : 0,
            usuarioId
        ]);

        console.log("✅ Pago insertado:", result);

        // Si el pago fue exitoso, registrar el pedido.
        if (esExitoso) {
            // NOTA IMPORTANTE: El campo `total` se guarda sin encriptar,
            // ya que la columna en la base de datos es de tipo numérico (FLOAT).
            // Los demás campos sensibles del pedido se encriptan como solicitaste.
            console.log("🔒 Encriptando datos del pedido (excepto el total)...");
            const encryptedDireccionCalle = await bcrypt.hash(direccionCalle, 10);
            const encryptedProvincia = await bcrypt.hash(provincia, 10);
            const encryptedCiudad = await bcrypt.hash(ciudad, 10);
            const encryptedNumeroIdentificacion = await bcrypt.hash(numeroIdentificacion, 10);
            const encryptedNumeroTelefono = await bcrypt.hash(numeroTelefono, 10);
            const encryptedNombrePedido = await bcrypt.hash(nombrePedido, 10);

            console.log("🛒 Registrando el pedido...");
            const [pedidoResult] = await pool.execute(`
                INSERT INTO pedidos (id_usuario, fecha_pedido, estado, total, direccion_envio, provincia, ciudad, numeroIdentificacion, numeroTelefono, nombrePedido)
                VALUES (?, NOW(), 'En proceso', ?, ?, ?, ?, ?, ?, ?)
            `, [
                usuarioId,
                total, // Se inserta el valor numérico, no el encriptado
                encryptedDireccionCalle,
                encryptedProvincia,
                encryptedCiudad,
                encryptedNumeroIdentificacion,
                encryptedNumeroTelefono,
                encryptedNombrePedido
            ]);

            console.log("✅ Pedido registrado:", pedidoResult);

            const pedidoId = pedidoResult.insertId;
            for (let producto of productos) {
                // Verificar que cada producto tenga los datos necesarios
                if (!producto.id || !producto.cantidad || !producto.precio) {
                    console.error("❌ Faltan datos del producto");
                    return res.status(400).json({ success: false, error: "Faltan datos del producto" });
                }

                // NOTA: 'id_pedido' y 'id_producto' se insertan sin encriptar para mantener las relaciones de la base de datos.
                await pool.execute(`
                    INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad)
                    VALUES (?, ?, ?)
                `, [pedidoId, producto.id, producto.cantidad]);
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