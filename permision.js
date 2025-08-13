// permission.js
const pool = require("./db"); // tu pool de conexión MySQL

// Obtener permisos de un usuario por id_usuario
async function getUserPermissions(req, res) {
    const { id_usuario } = req.params;

    if (!id_usuario) {
        return res.status(400).json({ message: "Falta el parámetro id_usuario" });
    }

    try {
        // Obtener el rol del usuario
        const [rolResult] = await pool.query(`
            SELECT r.nombre AS rol
            FROM rol r
            JOIN usuario_rol ur ON ur.id_rol = r.id
            WHERE ur.id_usuario = ?
        `, [id_usuario]);

        if (rolResult.length === 0) {
            return res.status(400).json({ message: "El usuario no tiene un rol asignado" });
        }

        const rolNombre = rolResult[0].rol;
        let permisos = [];

        if (rolNombre === "SuperAdmin") {
            // Si es SuperAdmin, obtiene todos los permisos
            const [allPermisos] = await pool.query("SELECT nombre FROM permiso ORDER BY nombre ASC");
            permisos = allPermisos.map(p => p.nombre);
        } else {
            // Para Admin, obtener solo los permisos asignados individualmente
            const [userPermisos] = await pool.query(`
                SELECT p.nombre
                FROM permiso p
                JOIN usuario_permiso up ON up.id_permiso = p.id
                WHERE up.id_usuario = ?
            `, [id_usuario]);
            permisos = userPermisos.map(p => p.nombre);
        }

        return res.json({ permisos });
    } catch (error) {
        console.error("Error al obtener permisos:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
}

async function getAllPermissions(req, res) {
  try {
    const [rows] = await pool.query("SELECT id, nombre FROM permiso ORDER BY nombre ASC");
    return res.json({ permisos: rows });
  } catch (error) {
    console.error("Error al obtener todos los permisos:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}


module.exports = { getUserPermissions, getAllPermissions };
