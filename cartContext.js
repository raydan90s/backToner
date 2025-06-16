const pool = require('./db'); // Asegúrate de que el pool esté bien configurado

// Agrega o actualiza un producto en el carrito
const agregarAlCarritoDB = async (req, res) => {
  const { id_usuario, id_producto, cantidad = 1 } = req.body;

  if (!id_usuario || !id_producto) {
    return res.status(400).json({ success: false, error: "Faltan datos obligatorios (id_usuario o id_producto)" });
  }

  try {
    await pool.query(
      `INSERT INTO carrito (id_usuario, id_producto, cantidad)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
      [id_usuario, id_producto, cantidad]
    );

    return res.status(200).json({ success: true, message: 'Producto agregado o actualizado en el carrito.' });
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};


// Actualiza la cantidad de un producto en el carrito o lo elimina si es 0
const actualizarCantidadDB = async (req, res) => {
  const { id_usuario, id_producto, nueva_cantidad } = req.body;

  if (!id_usuario || !id_producto || nueva_cantidad === undefined) {
    return res.status(400).json({ success: false, error: "Faltan datos obligatorios." });
  }

  try {
    if (nueva_cantidad <= 0) {
      const [result] = await pool.query(
        `DELETE FROM carrito WHERE id_usuario = ? AND id_producto = ?`,
        [id_usuario, id_producto]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Producto no encontrado en el carrito.' });
      }
      return res.status(200).json({ success: true, message: 'Producto eliminado del carrito.' });
    }

    const [result] = await pool.query(
      `UPDATE carrito SET cantidad = ? WHERE id_usuario = ? AND id_producto = ?`,
      [nueva_cantidad, id_usuario, id_producto]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado en el carrito.' });
    }
    return res.status(200).json({ success: true, message: 'Cantidad actualizada correctamente.' });
  } catch (error) {
    console.error('Error al actualizar cantidad:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};

// Elimina un ítem específico del carrito
const eliminarItemDB = async (req, res) => {
  const { id_usuario, id_producto } = req.body;

  if (!id_usuario || !id_producto) {
    return res.status(400).json({ success: false, error: "Faltan datos obligatorios." });
  }

  try {
    const [result] = await pool.query(
      `DELETE FROM carrito WHERE id_usuario = ? AND id_producto = ?`,
      [id_usuario, id_producto]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado en el carrito.' });
    }

    return res.status(200).json({ success: true, message: 'Producto eliminado del carrito.' });
  } catch (error) {
    console.error('Error al eliminar del carrito:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};

// Obtiene todos los productos del carrito de un usuario
const getCartItemsDB = async (req, res) => {
  const { id_usuario } = req.query; // <-- aquí el cambio

  if (!id_usuario) {
    return res.status(400).json({ success: false, error: "ID de usuario no proporcionado." });
  }

  try {
    const [items] = await pool.query(`
      SELECT
        c.id_producto AS id,
        p.nombre,
        p.precio,
        c.cantidad,
        JSON_ARRAYAGG(ip.url_imagen) AS imagenes
      FROM carrito c
      JOIN producto p ON c.id_producto = p.id
      LEFT JOIN imagenes_producto ip ON ip.id_producto = p.id
      WHERE c.id_usuario = ?
      GROUP BY c.id_producto, p.nombre, p.precio, c.cantidad
    `, [id_usuario]);

    const productos = items.map(item => ({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      cantidad: item.cantidad,
      imagen: item.imagenes[0] || null
    }));

    return res.status(200).json({ success: true, cartItems: productos });
  } catch (error) {
    console.error('Error al obtener ítems del carrito:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};



module.exports = {
  agregarAlCarritoDB,
  actualizarCantidadDB,
  eliminarItemDB,
  getCartItemsDB,
};
