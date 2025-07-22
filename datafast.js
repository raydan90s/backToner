const https = require('https');
const querystring = require('querystring');

// Configuración base
const CONFIG = {
    host: 'eu-test.oppwa.com',
    port: 443,
    entityId: '8a8294174b7ecb28014b9699220015ca',
    authorization: 'Bearer OGE4Mjk0MTc0YjdlY2IyODAxNGI5Njk5MjIwMDE1Y2N8c3k2S0pzVDg='
};

// Función helper para hacer peticiones HTTPS
const makeHttpsRequest = (options, data = null) => {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            const buf = [];
            
            console.log(`📡 Status code: ${res.statusCode}`);
            
            res.on('data', (chunk) => {
                buf.push(chunk);
            });
            
            res.on('end', () => {
                const jsonString = Buffer.concat(buf).toString('utf8');
                console.log("📦 Respuesta completa:", jsonString);
                
                try {
                    const parsedData = JSON.parse(jsonString);
                    resolve(parsedData);
                } catch (error) {
                    console.error("❌ Error al parsear JSON:", error);
                    reject(error);
                }
            });
        });
        
        req.on('error', (err) => {
            console.error("❌ Error en la solicitud HTTPS:", err);
            reject(err);
        });
        
        // Si hay datos para enviar (POST)
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
};

// Crear checkout y devolver checkoutId
const crearCheckout = async (req, res) => {
    console.log("🚀 Iniciando creación de checkout...");
    
    try {
        const amount = req.body.amount || '92.00';
        console.log(`💰 Monto: ${amount}`);
        
        const data = querystring.stringify({
            entityId: CONFIG.entityId,
            amount: amount,
            currency: 'EUR',
            paymentType: 'DB'
        });
        
        const options = {
            host: CONFIG.host,
            port: CONFIG.port,
            path: '/v1/checkouts',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(data),
                'Authorization': CONFIG.authorization
            }
        };
        
        console.log("📤 Enviando petición de checkout...");
        const checkoutData = await makeHttpsRequest(options, data);
        
        if (checkoutData && checkoutData.id) {
            console.log("✅ Checkout creado exitosamente:", checkoutData.id);
            res.status(200).json({ 
                success: true,
                checkoutId: checkoutData.id,
                data: checkoutData 
            });
        } else {
            console.error('❌ No se recibió checkoutId:', checkoutData);
            res.status(500).json({ 
                success: false,
                error: 'No se pudo generar checkoutId',
                details: checkoutData 
            });
        }
        
    } catch (error) {
        console.error('❌ Error al crear checkout:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al crear checkout',
            details: error.message 
        });
    }
};

// Consultar estado de pago
const consultarPago = async (checkoutId) => {
    console.log("🔍 Consultando pago para checkoutId:", checkoutId);
    
    try {
        const path = `/v1/checkouts/${checkoutId}/payment?entityId=${CONFIG.entityId}`;
        
        const options = {
            host: CONFIG.host,
            port: CONFIG.port,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': CONFIG.authorization
            }
        };
        
        console.log("📤 Consultando estado del pago...");
        const paymentData = await makeHttpsRequest(options);
        
        return paymentData;
        
    } catch (error) {
        console.error('❌ Error al consultar pago:', error);
        throw error;
    }
};

// Handler para consultar pago (para usar en rutas)
const consultarPagoHandler = async (req, res) => {
    try {
        const checkoutId = req.params.checkoutId || req.body.checkoutId;
        
        if (!checkoutId) {
            return res.status(400).json({
                success: false,
                error: 'checkoutId es requerido'
            });
        }
        
        const paymentData = await consultarPago(checkoutId);
        
        res.status(200).json({
            success: true,
            data: paymentData
        });
        
    } catch (error) {
        console.error('❌ Error en consultarPagoHandler:', error);
        res.status(500).json({
            success: false,
            error: 'Error al consultar pago',
            details: error.message
        });
    }
};

// Handler para consultar con resourcePath (webhook/callback)
const consultarPorResourcePath = async (resourcePath) => {
    console.log("🔍 resourcePath recibido:", resourcePath);
    
    try {
        // Asegurar que el resourcePath comience con /
        const cleanPath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
        const path = `${cleanPath}?entityId=${CONFIG.entityId}`;
        
        const options = {
            host: CONFIG.host,
            port: CONFIG.port,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': CONFIG.authorization
            }
        };
        
        console.log("📤 Consultando por resourcePath...");
        const paymentData = await makeHttpsRequest(options);
        
        return paymentData;
        
    } catch (error) {
        console.error('❌ Error al consultar por resourcePath:', error);
        throw error;
    }
};

// Función para verificar si un pago fue exitoso
const esPagoExitoso = (paymentData) => {
    if (!paymentData || !paymentData.result) {
        return false;
    }
    
    const code = paymentData.result.code;
    // Códigos de éxito típicos: /^(000\.000\.|000\.100\.1|000\.[36])/
    const successPattern = /^(000\.000\.|000\.100\.1|000\.[36])/;
    
    return successPattern.test(code);
};

module.exports = {
    crearCheckout,
    consultarPago,
    consultarPagoHandler,
    consultarPorResourcePath,
    esPagoExitoso,
    CONFIG // Por si necesitas acceder a la configuración
};