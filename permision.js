// permission.js
const pool = require("./db"); // tu pool de conexión MySQL

// Obtener permisos de un usuario por id_usuario
async function getUserPermissions(req, res) {
  const { id_usuario } = req.params;

  if (!id_usuario) {
    return res.status(400).json({ message: "Falta el parámetro id_usuario" });
  }

  try {
    const sql = `
      SELECT p.nombre AS permiso
      FROM permiso p
      JOIN rol_permiso rp ON rp.id_permiso = p.id
      JOIN usuario_rol ur ON ur.id_rol = rp.id_rol
      WHERE ur.id_usuario = ?
      AND ur.id_rol IN (
        SELECT id_rol FROM usuario_rol WHERE id_usuario = ?
      )
    `;

    // Ejecutamos la consulta para obtener permisos únicos
    const [rows] = await pool.query(sql, [id_usuario, id_usuario]);

    const permisos = rows.map(row => row.permiso);

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
