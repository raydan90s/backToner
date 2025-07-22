const https = require('https');
const querystring = require('querystring');

// Crear checkout y devolver checkoutId
const crearCheckout = async (req, res) => {
    const path = '/v1/checkouts';
    const data = querystring.stringify({
        entityId: '8a8294174b7ecb28014b9699220015ca',
        amount: req.body.amount || '92.00',
        currency: 'EUR',
        paymentType: 'DB'
    });

    const options = {
        port: 443,
        host: 'eu-test.oppwa.com',
        path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data),
            Authorization: 'Bearer OGE4Mjk0MTc0YjdlY2IyODAxNGI5Njk5MjIwMDE1Y2N8c3k2S0pzVDg='
        }
    };

    try {
        const checkoutData = await new Promise((resolve, reject) => {
            const postRequest = https.request(options, (res) => {
                const buf = [];
                res.on('data', chunk => buf.push(chunk));
                res.on('end', () => {
                    const jsonString = Buffer.concat(buf).toString('utf8');
                    try {
                        resolve(JSON.parse(jsonString));
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            postRequest.on('error', reject);
            postRequest.write(data);
            postRequest.end();
        });

        if (checkoutData && checkoutData.id) {
            res.status(200).json({ checkoutId: checkoutData.id });
        } else {
            console.error('No se recibió checkoutId:', checkoutData);
            res.status(500).json({ error: 'No se pudo generar checkoutId' });
        }
    } catch (error) {
        console.error('Error al crear checkout:', error);
        res.status(500).json({ error: 'Error al crear checkout' });
    }
};

// Consultar estado del pago usando checkoutId
const consultarPagoHandler = async (req, res) => {
    const checkoutId = req.params.checkoutId; // O req.body.checkoutId, según cómo envíes el dato
    if (!checkoutId) {
        return res.status(400).json({ error: 'Falta el checkoutId' });
    }

    const path = `/v1/checkouts/${checkoutId}/payment?entityId=8a8294174b7ecb28014b9699220015ca`;

    const options = {
        port: 443,
        host: 'eu-test.oppwa.com',
        path,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer OGE4Mjk0MTc0YjdlY2IyODAxNGI5Njk5MjIwMDE1Y2N8c3k2S0pzVDg='
        }
    };

    try {
        const paymentData = await new Promise((resolve, reject) => {
            const getRequest = https.request(options, (resHttps) => {
                const buf = [];
                resHttps.on('data', chunk => buf.push(chunk));
                resHttps.on('end', () => {
                    const jsonString = Buffer.concat(buf).toString('utf8');
                    try {
                        resolve(JSON.parse(jsonString));
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            getRequest.on('error', reject);
            getRequest.end();
        });

        res.status(200).json(paymentData);
    } catch (error) {
        console.error('Error al consultar pago:', error);
        res.status(500).json({ error: 'Error al consultar pago' });
    }
};

module.exports = {
    crearCheckout,
    consultarPagoHandler,
};
