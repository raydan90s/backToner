const pool = require('./db');

const getProductosConImagenes = async (req, res) => {
    try {
        const [results] = await pool.query(`
        SELECT
            p.id,
            p.nombre AS name,
            p.tipo AS category,
            p.descripcion AS description,
            p.precio AS price,
            mo.nombre AS model,
            m.nombre AS brand,
            p.estado,
            ip.url_imagen,
            SUM(ipr.stock) AS stock
        FROM producto p
        LEFT JOIN modelo mo ON p.id_modelo = mo.id
        LEFT JOIN marcas m ON mo.id_marca = m.id
        LEFT JOIN imagenes_producto ip ON p.id = ip.id_producto
        LEFT JOIN inventario_producto ipr ON p.id = ipr.id_producto
        GROUP BY p.id, ip.url_imagen
        ORDER BY p.id;
        `);

        // Agrupar productos y generar el slug
        const productosAgrupados = results.reduce((acc, producto) => {
            const existente = acc.find(p => p.id === producto.id);
            const imagen = producto.url_imagen ? { url: producto.url_imagen } : null;

            // Generamos el slug aquí
            const slug = generateSlug(producto.name);

            if (existente) {
                if (imagen) existente.images.push(imagen);
            } else {
                acc.push({
                    id: producto.id,
                    name: producto.name,
                    slug: slug,  // Agregar slug aquí
                    category: producto.category,
                    description: producto.description,
                    price: producto.price,
                    model: producto.model,
                    brand: producto.brand,
                    estado: producto.estado,
                    stock: producto.stock ?? 0,
                    images: imagen ? [imagen] : [],
                });
            }

            return acc;
        }, []);

        res.json(productosAgrupados);
    } catch (err) {
        console.error("Error al obtener productos:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


const eliminarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.execute('UPDATE producto SET estado = "Inactivo" WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.status(200).json({ message: 'Producto marcado como Inactivo' });
    } catch (err) {
        console.error('Error al marcar el producto como inactivo:', err);
        res.status(500).json({ error: err.message });
    }
};

const activarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.execute('UPDATE producto SET estado = "Activo" WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.status(200).json({ message: 'Producto marcado como Activo' });
    } catch (err) {
        console.error('Error al marcar el producto como activo:', err);
        res.status(500).json({ error: err.message });
    }
};

const obtenerProductoPorId = async (req, res) => {
    const { id } = req.params;

    try {
        const [results] = await pool.query(`
        SELECT
            p.id,
            p.nombre AS name,
            p.tipo AS category,
            p.descripcion AS description,
            p.precio AS price,
            mo.nombre AS model,
            p.estado,
            m.nombre AS brand,
            ip.url_imagen,
            SUM(ipr.stock) AS stock
        FROM producto p
        LEFT JOIN modelo mo ON p.id_modelo = mo.id
        LEFT JOIN marcas m ON mo.id_marca = m.id
        LEFT JOIN imagenes_producto ip ON p.id = ip.id_producto
        LEFT JOIN inventario_producto ipr ON p.id = ipr.id_producto
        WHERE p.id = ?
        GROUP BY p.id, ip.url_imagen
        `, [id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const productoFormateado = results.reduce((acc, item) => {
            const imagen = item.url_imagen ? { url: item.url_imagen } : null;

            // Generamos el slug aquí
            const slug = generateSlug(item.name);

            if (!acc) {
                return {
                    id: item.id,
                    name: item.name,
                    slug: slug,  // Agregar slug aquí
                    category: item.category,
                    description: item.description,
                    price: item.price,
                    model: item.model,
                    brand: item.brand,
                    estado: item.estado,
                    stock: item.stock ?? 0,
                    images: imagen ? [imagen] : []
                };
            } else {
                if (imagen) acc.images.push(imagen);
                return acc;
            }
        }, null);

        res.json(productoFormateado);
    } catch (err) {
        console.error('Error al obtener producto por ID:', err);
        res.status(500).json({ error: err.message });
    }
};


const createProducto = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        // Validar y formatear los datos recibidos
        const {
            name,
            description,
            price,
            stock,
            id_inventario,
            category,
            images = []
        } = req.body;

        // Asegurar campos requeridos con valores por defecto o errores claros
        if (!name || !price || !stock || !id_inventario || !category || !description) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const modeloNombre = req.body.model || null;
        if (!modeloNombre) {
            return res.status(400).json({ error: 'El nombre del modelo es requerido' });
        }

        // Buscar el id_modelo según el nombre
        const [modeloRows] = await conn.execute(
            'SELECT id FROM modelo WHERE nombre = ?',
            [modeloNombre]
        );

        if (modeloRows.length === 0) {
            return res.status(400).json({ error: `Modelo '${modeloNombre}' no encontrado` });
        }

        const id_modelo = modeloRows[0].id;

        await conn.beginTransaction();

        // Insertar producto
        const [result] = await conn.execute(
            `INSERT INTO producto (nombre, tipo, precio, descripcion, estado, id_modelo)
             VALUES (?, ?, ?, ?, 'Activo', ?)`,
            [name, category, price, description, id_modelo]
        );

        const id_producto = result.insertId;

        // Insertar inventario_producto
        await conn.execute(
            `INSERT INTO inventario_producto (id_producto, id_inventario, stock)
             VALUES (?, ?, ?)`,
            [id_producto, id_inventario, stock]
        );

        // Insertar imágenes válidas
        for (const imagen of images) {
            const url = imagen?.url || null;

            if (url && typeof url === 'string' && url.trim() !== '') {
                await conn.execute(
                    `INSERT INTO imagenes_producto (id_producto, url_imagen)
                     VALUES (?, ?)`,
                    [id_producto, url]
                );
            }
        }

        await conn.commit();

        // Obtener el producto actualizado
        const [[productoActualizado]] = await conn.execute(`
    SELECT 
        p.id, p.nombre AS name, p.tipo AS category, p.precio AS price,
        p.descripcion AS description, m.nombre AS model,
        p.estado AS estado, ma.nombre AS marca
    FROM producto p
    JOIN modelo m ON p.id_modelo = m.id
    JOIN marcas ma ON m.id_marca = ma.id
    WHERE p.id = ?
`, [id_producto]);

        // Obtener las imágenes del producto
        const [imagenesProducto] = await conn.execute(
            `SELECT url_imagen AS url FROM imagenes_producto WHERE id_producto = ?`,
            [id_producto]
        );

        // Obtener el stock total del producto
        const [[stockProducto]] = await conn.execute(
            `SELECT SUM(stock) AS stock_total FROM inventario_producto WHERE id_producto = ?`,
            [id_producto]
        );

        res.status(200).json({
            id: productoActualizado.id,
            name: productoActualizado.name,
            description: productoActualizado.description,
            price: productoActualizado.price,
            model: productoActualizado.model,
            category: productoActualizado.category,
            estado: productoActualizado.estado,
            brand: productoActualizado.marca,
            images: imagenesProducto,
            stock: stockProducto?.stock_total || 0
        });


    } catch (err) {
        await conn.rollback();
        console.error('Error al crear producto:', err);
        res.status(500).json({ error: 'Error al crear producto' });
    } finally {
        conn.release();
    }
};


const updateProducto = async (req, res) => {
    const { id } = req.params;
    const {
        name,
        category,
        price,
        description,
        model,
        stock,
        images = [],
        id_inventario
    } = req.body;

    const nombre = name;
    const tipo = category;
    const precio = price;
    const descripcion = description;
    const imagenes = images;

    // Validar campos básicos
    if (
        nombre === undefined || tipo === undefined || precio === undefined ||
        descripcion === undefined || model === undefined || stock === undefined
    ) {
        console.log('Validation Error: Faltan campos requeridos.'); // Log the specific error
        return res.status(400).json({ message: "Faltan campos requeridos." });
    }

    // Validar inventario seleccionado (permitir -1 como válido para 'Total')
    if (id_inventario === null || id_inventario === undefined || isNaN(id_inventario)) {
        console.log('Validation Error: id_inventario is invalid.'); // Log the specific error
        return res.status(400).json({ message: "Debe seleccionar un inventario válido." });
    }

    // This condition should logically come before the database operations
    // if -1 is truly not allowed for database storage.
    if (id_inventario === -1) {
        console.log('Validation Error: id_inventario is -1.'); // Log the specific error
        return res.status(400).json({ message: "Debe seleccionar un inventario válido." });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Buscar ID del modelo por nombre
        const [[modeloRow]] = await conn.execute(
            `SELECT id FROM modelo WHERE nombre = ? LIMIT 1`, [model]
        );

        if (!modeloRow) {
            await conn.rollback();
            return res.status(400).json({ message: `Modelo '${model}' no encontrado.` });
        }

        const id_modelo = modeloRow.id;

        // Actualizar información del producto
        await conn.execute(
            `UPDATE producto
             SET nombre = ?, tipo = ?, precio = ?, descripcion = ?, estado = 'Activo', id_modelo = ?
             WHERE id = ?`,
            [nombre, tipo, precio, descripcion, id_modelo, id]
        );

        // Actualizar stock
        if (id_inventario === -1) {
            return res.status(400).json({ message: "Debe seleccionar un inventario válido." });
        } else {
            // Verificar existencia del inventario para ese producto
            const [existingStock] = await conn.execute(
                `SELECT id FROM inventario_producto
                 WHERE id_producto = ? AND id_inventario = ?`,
                [id, id_inventario]
            );

            if (existingStock.length > 0) {
                // Actualizar stock si ya existe la entrada
                await conn.execute(
                    `UPDATE inventario_producto SET stock = ? WHERE id_producto = ? AND id_inventario = ?`,
                    [stock, id, id_inventario]
                );
            } else {
                // Insertar nueva entrada si no existe
                await conn.execute(
                    `INSERT INTO inventario_producto (id_producto, id_inventario, stock) VALUES (?, ?, ?)`,
                    [id, id_inventario, stock]
                );
            }
        }

        // Eliminar imágenes actuales
        await conn.execute(`DELETE FROM imagenes_producto WHERE id_producto = ?`, [id]);

        // Insertar nuevas imágenes
        for (const imagen of imagenes) {
            const { url } = imagen;
            if (url) {
                await conn.execute(
                    `INSERT INTO imagenes_producto (id_producto, url_imagen) VALUES (?, ?)`,
                    [id, url]
                );
            }
        }

        await conn.commit();

        // Obtener el producto actualizado
        const [[productoActualizado]] = await conn.execute(`
            SELECT 
                p.id, p.nombre AS name, p.tipo AS category, p.precio AS price,
                p.descripcion AS description, m.nombre AS model,
                p.estado AS estado, ma.nombre AS marca
            FROM producto p
            JOIN modelo m ON p.id_modelo = m.id
            JOIN marcas ma ON m.id_marca = ma.id
            WHERE p.id = ?
        `, [id]);

        // Obtener las imágenes del producto
        const [imagenesProducto] = await conn.execute(
            `SELECT url_imagen AS url FROM imagenes_producto WHERE id_producto = ?`,
            [id]
        );

        // Obtener el stock total del producto
        const [[stockProducto]] = await conn.execute(
            `SELECT SUM(stock) AS stock_total FROM inventario_producto WHERE id_producto = ?`,
            [id]
        );

        // Respuesta final al frontend
        res.status(200).json({
            id: productoActualizado.id,
            name: productoActualizado.name,
            description: productoActualizado.description,
            price: productoActualizado.price,
            model: productoActualizado.model,
            category: productoActualizado.category,
            estado: productoActualizado.estado,
            brand: productoActualizado.marca,
            images: imagenesProducto,
            stock: stockProducto?.stock_total || 0
        });

    } catch (err) {
        await conn.rollback();
        console.error('Error al actualizar producto:', err);
        res.status(500).json({ error: 'Error al actualizar producto' });
    } finally {
        conn.release();
    }
};

function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  // Elimina caracteres no alfanuméricos
        .replace(/\s+/g, '-')      // Reemplaza los espacios por guiones
        .replace(/-+/g, '-');      // Elimina guiones múltiples
}

module.exports = {
    getProductosConImagenes,
    eliminarProducto,
    activarProducto,
    obtenerProductoPorId,
    createProducto,
    updateProducto,
};
