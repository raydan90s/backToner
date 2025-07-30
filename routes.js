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

const { getHistorialPedidos } = require("./historialCompras");

const { getUserPermissions, getAllPermissions } = require("./permision");

const { crearCheckout, consultarPagoHandler, obtenerIpCliente } = require("./datafast");

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

//DIRECCIONES
router.post("/usuarios/:id_usuario/direccion-envio", createShippingAddress);
router.get("/usuarios/:id_usuario/direccion-envio", getShippingAddresses);
router.get("/direccion-envio/:id", getShippingAddressById);
router.delete("/direccion-envio/:id", deleteShippingAddress);
router.put("/direccion-envio/:id", updateShippingAddress);       // <--- ruta PUT
router.get("/usuarios/:id_usuario/direccion-envio/principal", getPrimaryShippingAddress)

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

// Permisos 
router.get("/permissions", getAllPermissions); 
router.get("/permissions/:id_usuario", getUserPermissions);    

// ✅ NUEVA RUTA: HISTORIAL DE PEDIDOS
router.get('/historial-pedidos', getHistorialPedidos);

/**
 * @swagger
 * /checkout:
 *   post:
 *     summary: Genera un checkoutId de Datafast
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 example: "92.00"
 *     responses:
 *       200:
 *         description: CheckoutId generado
 *       500:
 *         description: Error al generar checkoutId
 */
router.post('/checkout', crearCheckout)

/**
 * @swagger
 * /checkout/resultado:
 *   get:
 *     summary: Consulta el resultado de un pago usando el checkoutId
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del checkout recibido desde Datafast
 *     responses:
 *       200:
 *         description: Detalles del estado de pago
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
 *                     description:
 *                       type: string
 *       500:
 *         description: Error al consultar estado de pago
 */
router.get('/checkout/resultado', consultarPagoHandler);

router.get('/cliente-ip', obtenerIpCliente); 

module.exports = router;