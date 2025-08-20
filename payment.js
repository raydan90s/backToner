const crypto = require('crypto');  // Importar el módulo de cifrado
const pool = require('./db'); // Importar la conexión a la base de datos
require('dotenv').config(); // Cargar las variables del archivo .env

const secretKey = process.env.SECRET_KEY_ENCRYPTATION; // Obtener la clave secreta

// Función de cifrado
const cifrar = (texto) => {
    // Crear un IV aleatorio de 16 bytes (aes-256-cbc requiere 16 bytes de IV)
    const iv = crypto.randomBytes(16);

    // Crear el cifrador utilizando 'aes-256-cbc', la clave secreta y el IV
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);

    // Cifrar el texto
    let cifrado = cipher.update(texto, 'utf8', 'hex');
    cifrado += cipher.final('hex');

    // Retornamos el IV y el texto cifrado concatenados
    return iv.toString('hex') + ':' + cifrado;
};


// Función para registrar un pago y crear un pedido si el pago es exitoso
const registrarPago = async (req, res) => {
    const { resourcePath, estadoPago, codigoPago, esExitoso, usuarioId, productosCarrito, direccionEnvio, id_pago } = req.body;

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
    const nota = direccionEnvio.notas;
    const total = productosCarrito.total || 0;
    const productos = productosCarrito.productos || [];
    const envio = productosCarrito.envio;
    const iva = productosCarrito.iva ?? 0;
    if (!total || productos.length === 0) {
        console.error("❌ El carrito está vacío o el total es inválido");
        return res.status(400).json({ success: false, error: "El carrito está vacío o el total es inválido" });
    }

    let pedidoId = null;
    const connection = await pool.getConnection(); // Obtener conexión para transacción

    try {
        await connection.beginTransaction(); // Iniciar transacción

        // Insertar pago
        const encryptedEstadoPago = cifrar(estadoPago);
        const encryptedCodigoPago = cifrar(codigoPago);

        const [result] = await connection.execute(`
            INSERT INTO pagos (resourcePath, estadoPago, codigoPago, esExitoso, fechaPago, usuario_id, id_pago)
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `, [
            resourcePath,
            encryptedEstadoPago,
            encryptedCodigoPago,
            esExitoso ? 1 : 0,
            usuarioId,
            id_pago
        ]);

        const pago_id = result.insertId;

        if (esExitoso) {
            // Cifrar datos del pedido
            const encryptedDireccionCalle = cifrar(direccionCalle);
            const encryptedProvincia = cifrar(provincia);
            const encryptedCiudad = cifrar(ciudad);
            const encryptedNumeroIdentificacion = cifrar(numeroIdentificacion);
            const encryptedNumeroTelefono = cifrar(numeroTelefono);
            const encryptedNombrePedido = cifrar(nombrePedido);
            const encryptedNota = cifrar(nota);

            const [pedidoResult] = await connection.execute(`
                INSERT INTO pedidos (id_usuario, fecha_pedido, estado, total, direccion_envio, provincia, ciudad, numeroIdentificacion, numeroTelefono, nombrePedido, nota, id_pago, envio, iva_valor)
                VALUES (?, NOW(), 'En proceso', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                usuarioId,
                total,
                encryptedDireccionCalle,
                encryptedProvincia,
                encryptedCiudad,
                encryptedNumeroIdentificacion,
                encryptedNumeroTelefono,
                encryptedNombrePedido,
                encryptedNota,
                pago_id,
                envio,
                iva
            ]);

            pedidoId = pedidoResult.insertId;


            // Insertar detalle_pedido
            for (let producto of productos) {
                const precio_unitario = producto.precio ?? 0;
                const descuento_unitario = producto.descuento ?? 0;
                const iva_unitario = precio_unitario * (iva / 100);

                await connection.execute(`
                    INSERT INTO detalle_pedido 
                    (id_pedido, id_producto, cantidad, precio_unitario, descuento_unitario, iva_unitario)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    pedidoId,
                    producto.id,
                    producto.cantidad,
                    precio_unitario,
                    descuento_unitario,
                    iva_unitario,
                ]);
            }
        }

        await connection.commit(); // Confirmar transacción

        return res.status(200).json({
            success: true,
            message: 'Pago registrado correctamente',
            pedidoId
        });

    } catch (error) {
        await connection.rollback(); // Revertir todo si hay error
        console.error('❌ Error al registrar el pago:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    } finally {
        connection.release(); // Liberar conexión
    }
};



module.exports = registrarPago;
