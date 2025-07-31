require('dotenv').config(); // Para cargar las variables de entorno desde el archivo .env
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

// Función para consultar el estado del pago
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

// Esta es la función que usa el endpoint de consulta de pago en Express
const consultarPagoHandler = async (req, res) => {
  const { id } = req.query;

  console.log("🔁 Recurso recibido:", id);

  // Llamamos a la función request con el ID recibido para consultar el estado
  request(id, (responseData) => {
    // Si hay algún error o no se pudo obtener respuesta
    if (responseData.error) {
      return res.status(400).json({ error: responseData.error });
    }

    // En caso de éxito, respondemos con la data procesada
    console.log("✅ Resultado de la consulta:", responseData);
    if (responseData.result?.code && responseData.result.code.startsWith('000')) {
      const redirectUrl = responseData.result?.redirectUrl || '/http://localhost:5173/productos'; // Si no hay URL, usa una predeterminada
      responseData.result.redirectUrl = redirectUrl;
    }
    res.json(responseData);
  });
};

// Aquí la lógica de creación de checkout, que ya tienes configurada
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
    console.log("📤 Datos formateados para Datafast:", data);

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


module.exports = {
  consultarPagoHandler,
  crearCheckout,
  obtenerIpCliente
};
