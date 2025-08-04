const bcrypt = require('bcryptjs');  // Importar bcryptjs
const pool = require('./db'); // Importa la conexión de la base de datos

// Función para registrar un pago y crear un pedido si el pago es exitoso
const registrarPago = async (resourcePath, estadoPago, codigoPago, esExitoso, usuarioCorreo, productosCarrito) => {
  try {
    // Encriptar los datos sensibles antes de guardarlos
    const encryptedCorreo = await bcrypt.hash(usuarioCorreo, 10);  // Hash del correo
    const encryptedEstadoPago = await bcrypt.hash(estadoPago, 10);  // Hash del estado de pago
    const encryptedCodigoPago = await bcrypt.hash(codigoPago, 10);  // Hash del código de pago

    // Insertar el pago en la base de datos con los datos encriptados
    const query = `
      INSERT INTO pagos (resourcePath, estadoPago, codigoPago, esExitoso, usuarioCorreo)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    // Ejecutar la consulta con los parámetros encriptados
    const [result] = await pool.execute(query, [
      resourcePath, 
      encryptedEstadoPago, 
      encryptedCodigoPago, 
      esExitoso, 
      encryptedCorreo
    ]);
    
    console.log('✅ Pago registrado correctamente:', result);

    // Si el pago fue exitoso, crear el pedido
    if (esExitoso) {
      // Crear un pedido con estado "En proceso"
      const [pedidoResult] = await pool.execute(`
        INSERT INTO pedidos (id_usuario, fecha_pedido, estado, total, direccion_envio)
        VALUES (?, NOW(), 'En proceso', ?, ?)
      `, [usuarioCorreo, productosCarrito.total, productosCarrito.direccionEnvio]);

      const pedidoId = pedidoResult.insertId; // Obtener el ID del pedido creado

      // Ahora insertamos los productos del carrito en detalle_pedido
      for (let producto of productosCarrito.productos) {
        await pool.execute(`
          INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario)
          VALUES (?, ?, ?, ?)
        `, [pedidoId, producto.id, producto.cantidad, producto.precio]);
      }

      console.log('✅ Pedido creado correctamente con ID:', pedidoId);
    }

    return result;
  } catch (error) {
    console.error("❌ Error al registrar el pago o crear el pedido:", error);
    throw error; 
  }
};

module.exports = {
  registrarPago
};
