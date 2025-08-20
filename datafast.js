require('dotenv').config();
const pool = require('./db');
const https = require('https');
const querystring = require('querystring');

const entityId = process.env.DATAFAST_ENTITY_ID;
const bearer = process.env.DATAFAST_BEARER;
const host = process.env.DATAFAST_HOST;
const MID = process.env.SHOPPER_MID;
const TID = process.env.SHOPPER_TID;
const PSERV = process.env.SHOPPER_PSERV;
const version = process.env.SHOPPER_VERSIONDF;
const ECI = process.env.SHOPPER_ECI;

const request = (resourcePath, callback) => {
  // Construir la URL completa con el resourcePath
  const url = `https://eu-test.oppwa.com${resourcePath}?entityId=${entityId}`;

  const options = {
    hostname: 'eu-test.oppwa.com',
    path: `${resourcePath}?entityId=${entityId}`,
    method: 'GET',
    headers: {
      'Authorization': bearer
    }
  };

  const postRequest = https.request(options, function (res) {
    res.setEncoding('utf8');
    let result = '';

    res.on('data', function (chunk) {
      result += chunk;
    });

    res.on('end', function () {
      try {
        const jsonRes = JSON.parse(result);
        return callback(jsonRes);  // Devolvemos la respuesta procesada
      } catch (error) {
        console.error('❌ Error al parsear la respuesta:', error.message);
        callback({ error: 'Error al parsear la respuesta JSON' });
      }
    });
  });

  postRequest.on('error', (e) => {
    console.error('❌ Error en la solicitud:', e.message);
    callback({ error: e.message });
  });

  postRequest.end();
};

const consultarPagoHandler = async (req, res) => {
  const { id } = req.query;

  console.log("🔁 Recurso recibido:", id);

  // Esperar 5 segundos antes de consultar
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log(`⏱ 5 segundos de espera cumplidos, consultando pago ${id}...`);

  // Ahora llamamos a request
  request(id, (responseData) => {
    if (responseData.error) {
      return res.status(400).json({ error: responseData.error });
    }

    console.log("✅ Resultado de la consulta:", responseData);

    if (responseData.result?.code && responseData.result.code.startsWith('000')) {
      const redirectUrl = responseData.result?.redirectUrl || '/http://localhost:5173/productos';
      responseData.result.redirectUrl = redirectUrl;
    }

    res.json(responseData);
  });
};

const consultarPago = async (req, res) => {
  const { paymentId } = req.query;
  const encodedPaymentId = paymentId;

  console.log(`⏱ Esperando 5 segundos antes de consultar el pago ${paymentId}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log(`🔍 Consultando ahora el pago ${paymentId}`);

  const options = {
    hostname: host,
    path: `/v1/query/${encodedPaymentId}?entityId=${entityId}`,
    method: 'GET',
    headers: {
      'Authorization': bearer,
    }
  };

  return new Promise((resolve, reject) => {
    const postRequest = https.request(options, (externalRes) => {
      externalRes.setEncoding('utf8');
      let result = '';

      externalRes.on('data', (chunk) => {
        result += chunk;
      });

      externalRes.on('end', () => {
        try {
          const jsonResponse = JSON.parse(result);

          if (jsonResponse.result?.code && jsonResponse.result.code.startsWith('000')) {
            res.json(jsonResponse);
            resolve(jsonResponse);
          } else {
            reject(new Error('La transacción no fue exitosa'));
          }
        } catch (e) {
          reject(new Error('Error al parsear la respuesta JSON'));
        }
      });
    });

    postRequest.on('error', (e) => {
      reject(new Error(e.message));
    });

    postRequest.end();
  });
};
const crearCheckout = async (req, res) => {
  try {
    const {
      amount,
      currency,
      paymentType,
      customer,
      shipping,
      billing,
      cart,
      merchantTransactionId,
      customParameters // base0, base12, iva
    } = req.body;

    console.log("📥 Cuerpo recibido en /api/checkout:", JSON.stringify(req.body, null, 2));

    const dataObject = {
      entityId,
      amount,
      currency,
      paymentType,
      'customer.givenName': customer.givenName,
      'customer.middleName': customer.middleName,
      'customer.surname': customer.surname,
      'customer.ip': customer.ip,
      'customer.merchantCustomerId': customer.merchantCustomerId,
      'customer.email': customer.email,
      'customer.identificationDocId': customer.identificationDocId,
      'customer.identificationDocType': customer.identificationDocType,  // <--- AGREGAR ESTA LÍNEA
      'customer.phone': customer.phone,
      'billing.street1': billing.street1,
      'billing.country': billing.country,
      'billing.postcode': billing.postcode,
      'shipping.street1': shipping.street1,
      'shipping.country': shipping.country,
      'merchantTransactionId': merchantTransactionId,
      'customParameters[SHOPPER_MID]': MID,
      'customParameters[SHOPPER_TID]': TID,
      'customParameters[SHOPPER_ECI]': ECI,
      'customParameters[SHOPPER_PSERV]': PSERV,
      'customParameters[SHOPPER_VAL_BASE0]': customParameters.SHOPPER_VAL_BASE0,
      'customParameters[SHOPPER_VAL_BASEIMP]': customParameters.SHOPPER_VAL_BASEIMP,
      'customParameters[SHOPPER_VAL_IVA]': customParameters.SHOPPER_VAL_IVA,
      'customParameters[SHOPPER_VERSIONDF]': version,
      'testMode': 'EXTERNAL' // ⚠️ Eliminar en producción
    };

    cart.items.forEach((item, i) => {
      dataObject[`cart.items[${i}].name`] = item.name;
      dataObject[`cart.items[${i}].description`] = item.description;
      dataObject[`cart.items[${i}].price`] = item.price;
      dataObject[`cart.items[${i}].quantity`] = item.quantity;
    });

    const data = querystring.stringify(dataObject);

    const options = {
      host,
      path: '/v1/checkouts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
        Authorization: bearer
      }
    };

    const postRequest = https.request(options, (response) => {
      let result = '';
      response.on('data', chunk => result += chunk);
      response.on('end', () => {
        console.log("Status Code Datafast:", response.statusCode);
        console.log("Headers Datafast:", response.headers);
        console.log("Respuesta cruda Datafast:", result);

        if (response.statusCode && response.statusCode >= 400) {
          // Si es error HTTP, enviamos el texto plano para ayudar a identificar el problema
          return res.status(response.statusCode).send({ error: result });
        }

        try {
          const json = JSON.parse(result);
          res.send(json);
        } catch (e) {
          console.error("Error al parsear JSON de Datafast:", e);
          res.status(500).send({ error: 'Error al parsear JSON de Datafast' });
        }
      });
    });

    postRequest.on('error', (e) => res.status(500).send({ error: e.message }));
    postRequest.write(data);
    postRequest.end();

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

const obtenerIpCliente = (req, res) => {
  let ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    null;

  // Si estás en entorno local (IPv6 ::1 o IPv4 127.0.0.1), usa una IP pública simulada
  if (ip === '::1' || ip === '127.0.0.1' || ip?.startsWith('::ffff:127.0.0.1')) {
    ip = '186.46.123.22'; // Puedes poner cualquier IP pública válida de Ecuador o de tu ISP
  }

  res.json({ ip });
};

const anularPagoHandler = async (req, res) => {
  const { id_pago } = req.body;

  if (!id_pago) {
    return res.status(400).json({ error: 'El `id_pago` es requerido para la anulación.' });
  }

  console.log(`🔄 Iniciando anulación para el pago con ID: ${id_pago}`);

  // ⚠️ Paso 1: Consultar la base de datos para obtener los datos de la transacción.
  let transactionData;
  try {
    const query = `
      SELECT pe.total
      FROM pagos AS p
      JOIN pedidos AS pe ON p.id = pe.id_pago
      WHERE p.id_pago = ?;
    `;
    const [rows] = await pool.query(query, [id_pago]);
    transactionData = rows[0];
  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error);
    return res.status(500).json({ error: 'Error al buscar la transacción en la base de datos.' });
  }

  if (!transactionData) {
    return res.status(404).json({ error: 'No se encontró la transacción con ese `id_pago`.' });
  }

  // ⚠️ Paso 2: Preparar los datos para la solicitud de anulación.
  const urlPath = `/v1/payments/${id_pago}`;
  const dataObject = {
    entityId,
    amount: transactionData.total.toFixed(2),
    currency: 'USD',
    paymentType: 'RF', // Clave para la anulación (Reembolso)
    testMode: 'EXTERNAL',
  };

  const data = querystring.stringify(dataObject);

  const options = {
    host,
    path: urlPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data),
      Authorization: bearer,
    },
  };

  // ⚠️ Paso 3: Realizar la solicitud a la API de Datafast.
  const postRequest = https.request(options, (response) => {
    let result = '';
    response.on('data', chunk => result += chunk);
    response.on('end', async () => {
      try {
        const jsonResponse = JSON.parse(result);

        if (jsonResponse.result?.code && jsonResponse.result.code.startsWith('000')) {
          console.log('✅ Anulación exitosa, actualizando estado de pago a "Cancelado".');

          // Guardar id_anulacion junto con el cambio de estado
          const updateQuery = `
            UPDATE pagos 
            SET estado = 'Cancelado',
                id_anulacion = ?
            WHERE id_pago = ?
          `;

          const [result] = await pool.query(updateQuery, [jsonResponse.id, id_pago]);

          if (result.affectedRows > 0) {
            console.log(`✅ Estado de pago actualizado a "Cancelado" con id_anulacion: ${jsonResponse.id}`);

            // Ahora obtener el `id` de la fila actualizada usando una consulta SELECT
            const selectQuery = `
              SELECT id
              FROM pagos
              WHERE id_pago = ?
            `;
            const [rows] = await pool.query(selectQuery, [id_pago]);

            if (rows.length > 0) {
              const id_pago_modificar = rows[0].id;
              console.log(`ID del pago actualizado: ${id_pago_modificar}`);

              // Actualizar el estado en la tabla `pedidos`
              const updatePedidoQuery = `
                UPDATE pedidos
                SET estado = 'Cancelado'
                WHERE id_pago = ?
              `;
              await pool.query(updatePedidoQuery, [id_pago_modificar]);
              console.log('✅ Estado de pedido actualizado a "Cancelado" en la base de datos.');
            } else {
              console.log('❌ No se encontró el pago con id_pago:', id_pago);
              return res.status(404).json({ error: 'No se encontró el pago con ese id_pago.' });
            }
          } else {
            console.log('❌ No se actualizó ningún pago con ese id_pago:', id_pago);
            return res.status(400).json({ error: 'No se pudo actualizar el estado del pago.' });
          }
        }


        res.json(jsonResponse);
        console.log("Respuesta de anulación:", jsonResponse);
      } catch (e) {
        console.error('❌ Error al parsear JSON de anulación:', e);
        res.status(500).send({ error: 'Error al procesar la respuesta de la anulación.' });
      }
    });
  });

  postRequest.on('error', (e) => {
    console.error('❌ Error en la solicitud de anulación:', e.message);
    res.status(500).send({ error: e.message });
  });

  postRequest.write(data);
  postRequest.end();
};



module.exports = {
  consultarPagoHandler,
  crearCheckout,
  obtenerIpCliente,
  anularPagoHandler,
  consultarPago
};
