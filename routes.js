const express = require('express');
const router = express.Router();
const { verifyApiKey } = require("./auth");

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

const {  verificarEmail, reenviarVerificacion} = require('./emails');

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

const { getHistorialPedidos, getDetallePedido, getPedidosUsuario } = require("./historialCompras");

const { getUserPermissions, getAllPermissions } = require("./permision");

const { crearCheckout, consultarPagoHandler, obtenerIpCliente, anularPagoHandler, consultarPago } = require("./datafast");
const registrarPago = require('./payment');
const {getFacturacionPorPedido, registrarDatosFacturacion} = require("./facturacion");


// Productos 
router.get('/productos-con-imagenes', verifyApiKey, getProductosConImagenes);
router.put('/productos/:id/inactivar', verifyApiKey, eliminarProducto);
router.put('/productos/:id/activar', verifyApiKey, activarProducto);
//router.get('/productos/por/:id', verifyApiKey, obtenerProductoPorId);
router.post('/productos', createProducto);
router.put('/productos/:id', verifyApiKey, updateProducto);
router.get('/productos/por-slug/:slug', verifyApiKey, obtenerProductoPorSlug);


// Auth 
router.get('/verificar-email/:token', verifyApiKey, verificarEmail);
router.post('/reenviar-verificacion', reenviarVerificacion);
router.post('/registrar', registrarUsuarioPublico);
router.post('/registrar/admin', verifyToken, checkRole('SuperAdmin'), registrarUsuarioAdmin);
router.post('/login', inicioSesion);
router.get('/auth/verify', verifyApiKey, verifyToken, (req, res) => {
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

// Admin Dashboard
router.get("/usuario", verifyApiKey, getUsuarioByEmail);
router.put("/usuario/rol", verifyApiKey, updateRolUsuario);
router.put("/usuario/permisos", verifyApiKey, updatePermisosUsuario);

// Carrito 
router.get('/cart', verifyApiKey, getCartItemsDB);
router.post('/cart/add', agregarAlCarritoDB);
router.put('/cart/update/:productId', verifyApiKey, actualizarCantidadDB);
router.delete('/cart/remove/:productId', verifyApiKey, eliminarItemDB);
router.post('/carrito/vaciar', vaciarCarritoDB);

// Marcas 
router.route("/marcas")
  .get(getAllBrands)
  .post(createBrand);

// Modelos 
router.post("/modelos", createModel);
router.get("/modelos/:id_marca",verifyApiKey ,getModelsByBrand);

// Inventario 
router.post("/inventario", createInventario);
router.get("/inventario", verifyApiKey, getInventarios);
router.get('/inventario-productos', verifyApiKey ,inventariosConProductos);
router.get('/producto/:id', verifyApiKey, productoInventario);
router.get('/inventario/producto/:id', verifyApiKey, getInventarioPorProducto);

// Configuración 
router.get('/configuracion', verifyApiKey, getConfiguracion);
router.put('/configuracion/precio-envio', verifyApiKey, actualizarPrecioEnvio);
router.post('/configuracion/iva', agregarIva);

//PERMISOS
router.get("/permissions", getAllPermissions);
router.get("/permissions/:id_usuario", getUserPermissions);

// Direcciones 
router.post("/usuarios/:id_usuario/direccion-envio", createShippingAddress);
router.get("/usuarios/:id_usuario/direccion-envio", verifyApiKey, getShippingAddresses);
router.get("/direccion-envio/:id", verifyApiKey,getShippingAddressById);
router.delete("/direccion-envio/:id", verifyApiKey, deleteShippingAddress);
router.put("/direccion-envio/:id", verifyApiKey, updateShippingAddress);
router.get("/usuarios/:id_usuario/direccion-envio/principal", verifyApiKey, getPrimaryShippingAddress);

//HISTORIAL DE PEDIDOS
router.get('/historial-pedidos', verifyApiKey, getHistorialPedidos);
router.get('/pedidos/:id_pedido/detalles', verifyApiKey, getDetallePedido);
router.get('/usuarios/:id_usuario/pedidos', verifyApiKey, getPedidosUsuario);          

//DATAFAST
router.post('/checkout', crearCheckout)
router.get('/checkout/resultado', verifyApiKey, consultarPagoHandler);
router.get('/checkout/consultar', verifyApiKey, consultarPago);
router.post('/checkout/anular', anularPagoHandler);

//PAGOS
router.get('/cliente-ip', verifyApiKey, obtenerIpCliente);
router.post('/payment', registrarPago);

//FACTURACION
router.post('/facturacion', registrarDatosFacturacion);
router.get("/facturacion/:pedidoId", verifyApiKey, getFacturacionPorPedido);

module.exports = router;