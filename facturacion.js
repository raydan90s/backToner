// facturacionController.js
const pool = require('./db');
const crypto = require('crypto');
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

        // Revisar si ya existen datos de facturación para este usuario
        const [existing] = await connection.execute(
            'SELECT id FROM datos_facturacion_usuario WHERE id_usuario = ?',
            [id_usuario]
        );

        let facturacionId;

        if (existing.length > 0) {
            // Actualizamos los datos existentes
            facturacionId = existing[0].id;
            await connection.execute(`
                UPDATE datos_facturacion_usuario
                SET nombre = ?, apellido = ?, direccion = ?, identificacion = ?, correo = ?, ciudad = ?, provincia = ?
                WHERE id = ?
            `, [
                nombreCifrado,
                apellidoCifrado,
                direccionCifrada,
                identificacionCifrada,
                correoCifrado,
                ciudadCifrada,
                provinciaCifrada,
                facturacionId
            ]);
        } else {
            // Insertamos nuevos datos de facturación
            const [result] = await connection.execute(`
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

            facturacionId = result.insertId;
        }

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
    const { pedidoId } = req.params;

    try {
        const query = `
      SELECT *
      FROM facturacion
      WHERE id_pedido = ?
      LIMIT 1
    `;

        const [result] = await pool.query(query, [pedidoId]);

        if (result.length === 0) {
            return res.status(404).json({ error: "No se encontraron datos de facturación para este pedido." });
        }

        const factura = result[0];

        // Descifrar campos sensibles
        factura.nombre = descifrar(factura.nombre);
        factura.apellido = factura.apellido ? descifrar(factura.apellido) : null;
        factura.direccion = descifrar(factura.direccion);
        factura.identificacion = descifrar(factura.identificacion);
        factura.correo = descifrar(factura.correo);
        factura.ciudad = factura.ciudad ? descifrar(factura.ciudad) : null;
        factura.provincia = factura.provincia ? descifrar(factura.provincia) : null;

        res.json(factura);
    } catch (error) {
        console.error("Error al obtener datos de facturación:", error);
        res.status(500).json({ error: "Error al obtener datos de facturación" });
    }
};


module.exports = {registrarDatosFacturacion, getFacturacionPorPedido};
