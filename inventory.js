const pool = require("./db");

const createInventario = async (req, res) => {
    const { ubicacion } = req.body;

    if (!ubicacion || !ubicacion.trim()) {
        return res.status(400).json({ error: "La ubicación es requerida" });
    }

    try {
        const query = "INSERT INTO inventario (ubicacion) VALUES (?)";
        const [result] = await pool.query(query, [ubicacion.trim()]);

        const nuevoInventario = {
            id: result.insertId,
            ubicacion: ubicacion.trim(),
        };

        res.status(201).json(nuevoInventario);
    } catch (err) {
        console.error("Error al insertar inventario:", err);
        res.status(500).json({ error: "Error al insertar inventario" });
    }
};

const getInventarios = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM inventario ORDER BY id ASC");
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener inventarios:", err);
        res.status(500).json({ error: "Error al obtener inventarios" });
    }
};

const inventariosConProductos = async (req, res) => {
    try {
        const [inventarios] = await pool.query('SELECT * FROM inventario');

        const inventariosConProductos = await Promise.all(
            inventarios.map(async (inv) => {
                const [productos] = await pool.query(
                    `SELECT p.nombre, ip.stock 
           FROM inventario_producto ip
           JOIN producto p ON ip.id_producto = p.id
           WHERE ip.id_inventario = ?`,
                    [inv.id]
                );

                return {
                    ...inv,
                    productos,
                };
            })
        );

        res.json(inventariosConProductos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener inventarios con productos' });
    }
};

const productoInventario = async (req, res) => {
    const idProducto = req.params.id;

    const query = `
        SELECT 
            inv.id AS id_inventario,
            inv.ubicacion,
            ip.stock
        FROM 
            inventario_producto ip
        JOIN 
            inventario inv ON ip.id_inventario = inv.id
        WHERE 
            ip.id_producto = ?
    `;

    try {
        const [results] = await pool.query(query, [idProducto]);
        res.json(results);
    } catch (err) {
        console.error('Error al obtener el inventario del producto:', err);
        res.status(500).json({ error: 'Error al obtener el inventario del producto' });
    }
};

const getInventarioPorProducto = async (req, res) => {
    const idProducto = req.params.id;

    const query = `
        SELECT 
            i.id AS id_inventario,
            i.ubicacion,
            COALESCE(ip.stock, 0) AS stock
        FROM 
            inventario i
        LEFT JOIN 
            inventario_producto ip 
        ON 
            i.id = ip.id_inventario AND ip.id_producto = ?
        ORDER BY i.id ASC
    `;

    try {
        const [rows] = await pool.query(query, [idProducto]);
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener inventarios por producto:", err);
        res.status(500).json({ error: "Error al obtener inventarios por producto" });
    }
};


module.exports = {
    getInventarios,
    createInventario,
    inventariosConProductos,
    productoInventario,
    getInventarioPorProducto
};
