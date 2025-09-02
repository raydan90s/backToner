// facturacionController.js
const pool = require('./db');
require('dotenv').config();
const { descifrar, cifrar } = require("./cifrado");

const registrarDatosFacturacion = async (req, res) => {
    const { id_usuario, nombre, apellido, direccion, identificacion, correo, ciudad, provincia } = req.body;

    if (!id_usuario || !nombre || !direccion || !identificacion || !correo) {
        return res.status(400).json({ success: false, error: "Faltan datos obligatorios" });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Cifrar campos sensibles
        const nombreCifrado = cifrar(nombre);
        const apellidoCifrado = cifrar(apellido || '');
        const direccionCifrada = cifrar(direccion);
        const identificacionCifrada = cifrar(identificacion);
        const correoCifrado = cifrar(correo);
        const ciudadCifrada = ciudad ? cifrar(ciudad) : null;
        const provinciaCifrada = provincia ? cifrar(provincia) : null;


        // Insertamos nuevos datos de facturación para este pedido
        const [insertResult] = await connection.execute(`
            INSERT INTO datos_facturacion_usuario
            (id_usuario, nombre, apellido, direccion, identificacion, correo, ciudad, provincia)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id_usuario,
            nombreCifrado,
            apellidoCifrado,
            direccionCifrada,
            identificacionCifrada,
            correoCifrado,
            ciudadCifrada,
            provinciaCifrada
        ]);

        const facturacionId = insertResult.insertId;

        await connection.commit();
        return res.status(200).json({
            success: true,
            message: "Datos de facturación registrados correctamente",
            facturacionId
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error al registrar datos de facturación:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    } finally {
        connection.release();
    }
};



const getFacturacionPorPedido = async (req, res) => {
  const pedidoId = Number(req.params.pedidoId);

  if (isNaN(pedidoId)) {
    return res.status(400).json({ error: "PedidoId inválido." });
  }

  try {
    // Primero obtenemos el pedido
    const [pedidoRows] = await pool.query(
      "SELECT id_facturacion FROM pedidos WHERE id = ? LIMIT 1",
      [pedidoId]
    );

    if (pedidoRows.length === 0 || !pedidoRows[0].id_facturacion) {
      return res.status(404).json({ error: "No se encontró facturación para este pedido." });
    }

    const idFacturacion = pedidoRows[0].id_facturacion;

    // Luego obtenemos los datos de facturación
    const [facturaRows] = await pool.query(
      "SELECT * FROM datos_facturacion_usuario WHERE id = ? LIMIT 1",
      [idFacturacion]
    );

    if (facturaRows.length === 0) {
      return res.status(404).json({ error: "Datos de facturación no encontrados." });
    }

    const factura = facturaRows[0];

    // Descifrar campos sensibles
    const datosFactura = {
      nombre: descifrar(factura.nombre),
      apellido: factura.apellido ? descifrar(factura.apellido) : "",
      direccion: descifrar(factura.direccion),
      identificacion: descifrar(factura.identificacion),
      correo: descifrar(factura.correo),
      ciudad: factura.ciudad ? descifrar(factura.ciudad) : "",
      provincia: factura.provincia ? descifrar(factura.provincia) : "",
    };

    res.json(datosFactura);

  } catch (error) {
    console.error("Error al obtener datos de facturación:", error);
    res.status(500).json({ error: "Error al obtener datos de facturación" });
  }
};


module.exports = { registrarDatosFacturacion, getFacturacionPorPedido };
