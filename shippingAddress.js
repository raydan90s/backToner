const pool = require("./db");

const createShippingAddress = async (req, res) => {
  const { id_usuario } = req.params;
  const {
    nombre,
    apellido,
    direccion,
    telefono,
    cedula,
    ciudad,
    provincia,
    pastcode,
    es_principal
  } = req.body;

  console.log("Datos recibidos:", req.body);

  if (!id_usuario || !direccion || !telefono || !ciudad || !provincia) {
    return res.status(400).json({ error: "Campos obligatorios faltantes" });
  }

  try {
    // Consultar si ya existen direcciones para este usuario
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS total FROM direccion_envio_usuario WHERE id_usuario = ?",
      [id_usuario]
    );

    const totalDirecciones = rows[0].total;

    // Si es la primera dirección, se marca como principal automáticamente
    let marcarComoPrincipal = totalDirecciones === 0;

    // Si el usuario explícitamente indica que esta es principal
    if (es_principal) {
      marcarComoPrincipal = true;

      // Desmarcar otras direcciones como principal
      await pool.query(
        "UPDATE direccion_envio_usuario SET es_principal = FALSE WHERE id_usuario = ?",
        [id_usuario]
      );
    }

    const query = `
      INSERT INTO direccion_envio_usuario 
      (id_usuario, nombre, apellido, direccion, telefono, cedula, ciudad, provincia, postal, es_principal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      id_usuario,
      nombre,
      apellido,
      direccion,
      telefono,
      cedula,
      ciudad,
      provincia,
      pastcode,
      marcarComoPrincipal
    ]);

    const nuevaDireccion = {
      id: result.insertId,
      id_usuario,
      nombre,
      apellido,
      direccion,
      telefono,
      cedula,
      ciudad,
      provincia,
      es_principal: marcarComoPrincipal
    };

    res.status(201).json(nuevaDireccion);
  } catch (err) {
    console.error("Error al guardar dirección:", err);
    res.status(500).json({ error: "Error al guardar dirección" });
  }
};


const getShippingAddresses = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM direccion_envio_usuario WHERE id_usuario = ?",
      [id_usuario]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error al obtener direcciones:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

const getShippingAddressById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM direccion_envio_usuario WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Dirección no encontrada" });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Error al obtener dirección:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

// ✅ Eliminar una dirección
const deleteShippingAddress = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      "DELETE FROM direccion_envio_usuario WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Dirección no encontrada" });
    }

    res.status(200).json({ message: "Dirección eliminada correctamente" });
  } catch (err) {
    console.error("Error al eliminar dirección:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

// ✅ Actualizar una dirección existente
const updateShippingAddress = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    apellido,
    direccion,
    telefono,
    cedula,
    ciudad,
    provincia,
    es_principal
  } = req.body;

  // Validar que existan datos mínimos
  if (!direccion || !telefono || !ciudad || !provincia) {
    return res.status(400).json({ error: "Campos obligatorios faltantes" });
  }

  try {
    // Si el update incluye marcar como principal, primero desmarco todas
    if (es_principal) {
      // obtener id_usuario de la dirección a actualizar
      const [[row]] = await pool.query(
        "SELECT id_usuario FROM direccion_envio_usuario WHERE id = ?",
        [id]
      );
      if (!row) return res.status(404).json({ error: "Dirección no encontrada" });

      await pool.query(
        "UPDATE direccion_envio_usuario SET es_principal = FALSE WHERE id_usuario = ?",
        [row.id_usuario]
      );
    }

    // Ahora actualizo la dirección
    const query = `
      UPDATE direccion_envio_usuario
      SET nombre = ?, apellido = ?, direccion = ?, telefono = ?,
          cedula = ?, ciudad = ?, provincia = ?, 
          ${es_principal ? "es_principal = TRUE" : "es_principal = FALSE"}
      WHERE id = ?
    `;
    const [result] = await pool.query(query, [
      nombre || null,
      apellido || null,
      direccion,
      telefono,
      cedula || null,
      ciudad,
      provincia,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Dirección no encontrada" });
    }

    // Devolver la dirección actualizada
    const [[updated]] = await pool.query(
      "SELECT * FROM direccion_envio_usuario WHERE id = ?",
      [id]
    );

    res.status(200).json(updated);
  } catch (err) {
    console.error("Error al actualizar dirección:", err);
    res.status(500).json({ error: "Error al actualizar dirección" });
  }
};

const getPrimaryShippingAddress = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM direccion_envio_usuario WHERE id_usuario = ? AND es_principal = 1 LIMIT 1",
      [id_usuario]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "No se encontró dirección principal" });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Error al obtener dirección principal:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};


module.exports = {
  createShippingAddress,
  getShippingAddresses,
  getShippingAddressById,
  deleteShippingAddress,
  updateShippingAddress,      // <--- exportarlo
  getPrimaryShippingAddress

};
