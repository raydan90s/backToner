const express = require('express');
const router = express.Router();

const {
  getProductosConImagenes,
  eliminarProducto,
  activarProducto,
  obtenerProductoPorId,
  createProducto,
  updateProducto,
  obtenerProductoPorSlug
} = require('./products');

const {
  registrarUsuarioAdmin,
  registrarUsuarioPublico,
  inicioSesion,
  getUsuarioByEmail,
  updateRolUsuario,
  updatePermisosUsuario,
} = require('./usuario');

const { verifyToken, checkRole } = require('./verify');

const {
  agregarAlCarritoDB,
  actualizarCantidadDB,
  eliminarItemDB,
  getCartItemsDB,
  vaciarCarritoDB
} = require('./cartContext');

const { createBrand, getAllBrands } = require("./brand");
const { createModel, getModelsByBrand } = require("./models");

const {
  createInventario,
  getInventarios,
  inventariosConProductos,
  productoInventario,
  getInventarioPorProducto
} = require("./inventory");

const {
  getConfiguracion,
  agregarIva,
  actualizarPrecioEnvio
} = require('./setting');

const {
  createShippingAddress,
  getShippingAddresses,
  getShippingAddressById,
  deleteShippingAddress,
  updateShippingAddress,
  getPrimaryShippingAddress
} = require("./shippingAddress");

const { getHistorialPedidos, getDetallePedido } = require("./historialCompras");

const { getUserPermissions, getAllPermissions } = require("./permision");

const { crearCheckout, consultarPagoHandler, obtenerIpCliente, anularPagoHandler, consultarPago } = require("./datafast");
const registrarPago = require('./payment');


// Productos 
router.get('/productos-con-imagenes', getProductosConImagenes);
router.put('/productos/:id/inactivar', eliminarProducto);
router.put('/productos/:id/activar', activarProducto);
router.get('/productos/por/:id', obtenerProductoPorId);
router.post('/productos', createProducto);
router.put('/productos/:id', updateProducto);
router.get('/productos/por-slug/:slug', obtenerProductoPorSlug);


// Auth 
router.post('/registrar', registrarUsuarioPublico);
router.post('/registrar/admin', verifyToken, checkRole('SuperAdmin'), registrarUsuarioAdmin);
router.post('/login', inicioSesion);
router.get('/auth/verify', verifyToken, (req, res) => {
  res.json({ message: 'Token válido', user: req.user });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
  });
  res.json({ message: 'Sesión cerrada' });
});

// Auth
router.get("/usuario", getUsuarioByEmail);
router.put("/usuario/rol", updateRolUsuario);
router.put("/usuario/permisos", updatePermisosUsuario);
router.post('/registrar', registrarUsuarioPublico)
router.post('/registrar/admin', verifyToken, checkRole('SuperAdmin'), registrarUsuarioAdmin);
router.post('/login', inicioSesion);
router.get('/auth/verify', verifyToken, (req, res) => {
  // Aquí puedes enviar información útil si el token es válido
  res.json({ message: 'Token válido', user: req.user });
});
// Carrito 
router.get('/cart', getCartItemsDB);
router.post('/cart/add', agregarAlCarritoDB);
router.put('/cart/update/:productId', actualizarCantidadDB);
router.delete('/cart/remove/:productId', eliminarItemDB);
router.post('/carrito/vaciar', vaciarCarritoDB);

// Marcas 
router.route("/marcas")
  .get(getAllBrands)
  .post(createBrand);

// Modelos 
router.post("/modelos", createModel);
router.get("/modelos/:id_marca", getModelsByBrand);

// Inventario 
router.post("/inventario", createInventario);
router.get("/inventario", getInventarios);
router.get('/inventario-productos', inventariosConProductos);
router.get('/producto/:id', productoInventario);
router.get('/inventario/producto/:id', getInventarioPorProducto);

// Configuración 
router.get('/configuracion', getConfiguracion);
router.put('/configuracion/precio-envio', actualizarPrecioEnvio);
router.post('/configuracion/iva', agregarIva);

//Modelos
router.post("/modelos", createModel);
router.get("/modelos/:id_marca", getModelsByBrand);

//INVENTARIO
router.route("/inventario")
  .post(createInventario)
  .get(getInventarios);
router.get('/inventario-productos', inventariosConProductos);
router.get('/producto/:id', productoInventario);
router.get('/inventario/producto/:id', getInventarioPorProducto);

//CONFIGURACION
router.get('/configuracion', getConfiguracion);
router.put('/configuracion/precio-envio', actualizarPrecioEnvio);
router.post('/configuracion/iva', agregarIva);

//PERMISOS
router.get("/permissions", getAllPermissions);
router.get("/permissions/:id_usuario", getUserPermissions);
// Direcciones 
router.post("/usuarios/:id_usuario/direccion-envio", createShippingAddress);
router.get("/usuarios/:id_usuario/direccion-envio", getShippingAddresses);
router.get("/direccion-envio/:id", getShippingAddressById);
router.delete("/direccion-envio/:id", deleteShippingAddress);
router.put("/direccion-envio/:id", updateShippingAddress);
router.get("/usuarios/:id_usuario/direccion-envio/principal", getPrimaryShippingAddress);


// ✅ NUEVA RUTA: HISTORIAL DE PEDIDOS
router.get('/historial-pedidos', getHistorialPedidos);
router.get('/pedidos/:id_pedido/detalles', getDetallePedido); // Ruta para obtener los detalles de un pedido específico

//DATAFAST
router.post('/checkout', crearCheckout)

router.get('/checkout/resultado', consultarPagoHandler);

/**
 * @swagger
 * /checkout/anular:
 *   post:
 *     summary: Anula un pago previo
 *     description: Utiliza el `id_pago` de la transacción para anular un pago y actualizar los estados en las tablas de `pagos` y `pedidos`.
 *     requestBody:
 *       description: El `id_pago` de la transacción a anular.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_pago:
 *                 type: string
 *                 description: El identificador del pago que se va a anular.
 *     responses:
 *       200:
 *         description: Respuesta exitosa con los detalles de la anulación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       description: Código de respuesta del sistema de pagos.
 *                     description:
 *                       type: string
 *                       description: Descripción del estado de la anulación.
 *       400:
 *         description: Error por falta del `id_pago`.
 *       500:
 *         description: Error al procesar la solicitud de anulación.
 */

/**
 * @swagger
 * /checkout/consultar:
 *   get:
 *     summary: Consulta el estado de un pago
 *     description: Utiliza el `paymentId` de la transacción para consultar el estado del pago y obtener los detalles correspondientes.
 *     parameters:
 *       - in: query
 *         name: paymentId
 *         required: true
 *         description: El identificador único del pago que se desea consultar.
 *         schema:
 *           type: string
 *           example: "your_payment_id"
 *     responses:
 *       200:
 *         description: Respuesta exitosa con los detalles del estado de la transacción.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       description: Código de respuesta de la transacción.
 *                       example: "000.100.112"
 *                     description:
 *                       type: string
 *                       description: Descripción del estado de la transacción.
 *                       example: "Pago procesado correctamente"
 *                     redirectUrl:
 *                       type: string
 *                       description: URL de redirección en caso de ser necesario.
 *                       example: "https://example.com/redirect-url"
 *       400:
 *         description: Error por falta del `paymentId` en la solicitud o `paymentId` inválido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "El `paymentId` es necesario para realizar la consulta."
 *       500:
 *         description: Error al procesar la solicitud de consulta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error al realizar la consulta"
 */
router.get('/checkout/consultar', consultarPago);


router.post('/checkout/anular', anularPagoHandler);



//PAGOS
router.get('/cliente-ip', obtenerIpCliente);

router.post('/payment', registrarPago);


module.exports = router;