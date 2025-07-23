const https = require('https');
const querystring = require('querystring');

// Crear checkoutId (FASE 1)
const crearCheckout = async (req, res) => {
    const data = querystring.stringify({
        entityId: '8a829418533cf31d01533d06f2ee06fa',  // ✅ NUEVO
        amount: '10.00',
        currency: 'USD',
        paymentType: 'DB',
        testMode: 'EXTERNAL',
    });

    const options = {
        host: 'eu-test.oppwa.com',
        path: '/v1/checkouts',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length,
            Authorization: 'Bearer OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA==' // ✅ NUEVO
        }
    };

    const request = https.request(options, (response) => {
        let result = '';
        response.on('data', chunk => result += chunk);
        response.on('end', () => {
            try {
                res.send(JSON.parse(result));
            } catch (error) {
                res.status(500).send({ error: 'Error al parsear respuesta JSON' });
            }
        });
    });

    request.on('error', (e) => res.status(500).send({ error: e.message }));
    request.write(data);
    request.end();
};

// Obtener resultado del pago
const consultarPagoHandler = async (req, res) => {
    const resourcePath = req.query.resourcePath;

    if (!resourcePath) {
        console.error('❌ No se recibió resourcePath');
        return res.status(400).send({ error: 'Falta resourcePath' });
    }

    console.log('🔎 Consultando resourcePath:', resourcePath);

    const fullPath = resourcePath + '?entityId=8a829418533cf31d01533d06f2ee06fa';

    const options = {
        host: 'eu-test.oppwa.com',
        path: fullPath,
        method: 'GET',
        headers: {
            Authorization: 'Bearer OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA=='
        }
    };

    console.log('🌐 Realizando solicitud a:', `https://${options.host}${options.path}`);

    const request = https.request(options, (response) => {
        let result = '';

        response.on('data', chunk => {
            result += chunk;
        });

        response.on('end', () => {
            try {
                console.log('✅ Respuesta recibida:');
                console.log(result);
                res.send(JSON.parse(result));
            } catch (error) {
                console.error('❌ Error al parsear JSON:', error.message);
                console.error('Contenido recibido:', result);
                res.status(500).send({ error: 'Error al parsear respuesta JSON' });
            }
        });
    });

    request.on('error', (e) => {
        console.error('❌ Error en la solicitud HTTPS:', e.message);
        res.status(500).send({ error: e.message });
    });

    request.end();
};

module.exports = {
    crearCheckout,
    consultarPagoHandler,
};
