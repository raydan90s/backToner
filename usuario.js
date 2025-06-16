const pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const registrarUsuarioPublico = async (req, res) => {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ message: 'Nombre, correo electrónico y contraseña son requeridos.' });
    }

    try {
        // 1. Verificar si el email ya existe
        const [results] = await pool.query('SELECT email FROM usuario WHERE email = ?', [email]);

        if (results.length > 0) {
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // 2. Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const nombreCompleto = `${nombre} ${apellido || ''}`.trim();

        // 3. Insertar nuevo usuario
        const [insertResult] = await pool.query(
            'INSERT INTO usuario (nombre, email, password, estado) VALUES (?, ?, ?, ?)',
            [nombreCompleto, email, hashedPassword, 'Activo']
        );

        const userId = insertResult.insertId;

        // 4. Obtener el id y nombre del rol "Cliente"
        const [rolResult] = await pool.query('SELECT id, nombre FROM rol WHERE nombre = ?', ['Cliente']);
        if (rolResult.length === 0) {
            return res.status(500).json({ message: 'Rol Cliente no existe en la base de datos.' });
        }
        const clienteRolId = rolResult[0].id;
        const clienteTipo = rolResult[0].nombre;

        // 5. Insertar en usuario_rol
        await pool.query(
            'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)',
            [userId, clienteRolId]
        );

        // 6. Devolver el usuario registrado con su tipo (rol)
        res.status(201).json({
            userId,
            tipo: clienteTipo,
            message: '¡Registro exitoso! Serás redirigido en unos segundos...'
        });

    } catch (error) {
        console.error("Error en registrarUsuarioPublico:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};



const registrarUsuarioAdmin = async (req, res) => {
    const { tipo, nombre, email, password, telefono, direccion, permisos = [] } = req.body;

    // Solo puede registrar SuperAdmin
    if (!req.user || req.user.tipo !== 'SuperAdmin') {
        return res.status(403).json({ error: 'No tienes permisos para crear usuarios administradores.' });
    }

    if (!tipo || !nombre || !email || !password) {
        return res.status(400).json({ error: 'Tipo, nombre, correo electrónico y contraseña son requeridos.' });
    }

    try {
        // Verificar si email ya existe
        const [results] = await pool.query('SELECT email FROM usuario WHERE email = ?', [email]);
        if (results.length > 0) {
            return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario
        const [insertResult] = await pool.query(
            'INSERT INTO usuario (nombre, email, password, estado) VALUES (?, ?, ?, ?)',
            [nombre, email, hashedPassword, 'Activo']
        );
        const userId = insertResult.insertId;

        // Verificar o crear el rol
        let [rolResult] = await pool.query('SELECT id FROM rol WHERE nombre = ?', [tipo]);
        let rolId;
        if (rolResult.length === 0) {
            const [rolInsert] = await pool.query('INSERT INTO rol (nombre) VALUES (?)', [tipo]);
            rolId = rolInsert.insertId;
        } else {
            rolId = rolResult[0].id;
        }

        // Asignar rol al usuario
        await pool.query(
            'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)',
            [userId, rolId]
        );

        // Asignar permisos al rol si vienen en el body
        for (const nombrePermiso of permisos) {
            // Verificar si permiso ya existe
            const [permisoResult] = await pool.query('SELECT id FROM permiso WHERE nombre = ?', [nombrePermiso]);
            let permisoId;

            if (permisoResult.length === 0) {
                const [permisoInsert] = await pool.query('INSERT INTO permiso (nombre) VALUES (?)', [nombrePermiso]);
                permisoId = permisoInsert.insertId;
            } else {
                permisoId = permisoResult[0].id;
            }

            // Verificar si ya está asignado el permiso al rol
            const [existe] = await pool.query(
                'SELECT * FROM rol_permiso WHERE id_rol = ? AND id_permiso = ?',
                [rolId, permisoId]
            );
            if (existe.length === 0) {
                await pool.query(
                    'INSERT INTO rol_permiso (id_rol, id_permiso) VALUES (?, ?)',
                    [rolId, permisoId]
                );
            }
        }

        res.status(201).json({
            userId,
            tipo,
            permisos,
            message: 'Usuario administrador registrado exitosamente.'
        });

    } catch (error) {
        console.error("Error en registrarUsuarioAdmin:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};



const inicioSesion = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [results] = await pool.query(`
            SELECT u.*, r.nombre AS tipo
            FROM usuario u
            JOIN usuario_rol ur ON u.id = ur.id_usuario
            JOIN rol r ON ur.id_rol = r.id
            WHERE u.email = ?
        `, [email]);

        const user = results[0];

        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                tipo: user.tipo,  // ← Aquí ya tienes el rol como "tipo"
                nombre: user.nombre
            },
            process.env.SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
        });

        res.json({
            message: 'Inicio de sesión exitoso',
            user: {
                id: user.id,
                email: user.email,
                tipo: user.tipo  // ← También aquí puedes usarlo en el frontend
            }
        });

    } catch (error) {
        console.error('🔥 Error en inicioSesion:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


const eliminarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const [results] = await pool.query(
            'UPDATE usuario SET estado = ? WHERE id = ?',
            ['Inactivo', id]
        );

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Correo electronico no registrado' });
        }

        res.json({ message: 'Usuario inactivado exitosamente.' });

    } catch (error) {
        console.error("Error en eliminarUsuario:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 1. Buscar usuario por correo (incluye rol y permisos)
async function getUsuarioByEmail(req, res) {
    const { email } = req.query;

    if (!email) return res.status(400).json({ error: "Falta el parámetro email" });

    try {
        // Obtener usuario
        const [usuarios] = await pool.query("SELECT id, nombre, email FROM usuario WHERE email = ?", [email]);
        if (usuarios.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const usuario = usuarios[0];

        // Obtener rol
        const [roles] = await pool.query(`
      SELECT r.nombre 
      FROM rol r
      JOIN usuario_rol ur ON ur.id_rol = r.id
      WHERE ur.id_usuario = ?
      LIMIT 1
    `, [usuario.id]);

        const rol = roles[0]?.nombre || "Sin rol";

        // Obtener permisos
        const [permisosRaw] = await pool.query(`
      SELECT p.nombre
      FROM permiso p
      JOIN rol_permiso rp ON rp.id_permiso = p.id
      JOIN usuario_rol ur ON ur.id_rol = rp.id_rol
      WHERE ur.id_usuario = ?
    `, [usuario.id]);

        const permisos = permisosRaw.map(row => row.nombre);

        return res.json({ usuario: { ...usuario, rol, permisos } });
    } catch (error) {
        console.error("Error al obtener usuario:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
}

// 2. Actualizar rol del usuario
async function updateRolUsuario(req, res) {
    const { id_usuario, nuevoRol } = req.body;

    if (!id_usuario || !nuevoRol) return res.status(400).json({ error: "Faltan datos" });

    try {
        // Verificar que el rol exista
        const [roles] = await pool.query("SELECT id FROM rol WHERE nombre = ?", [nuevoRol]);
        if (roles.length === 0) return res.status(400).json({ error: "Rol no válido" });

        const id_rol = roles[0].id;

        // Eliminar roles actuales
        await pool.query("DELETE FROM usuario_rol WHERE id_usuario = ?", [id_usuario]);

        // Asignar nuevo rol
        await pool.query("INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)", [id_usuario, id_rol]);

        return res.json({ success: true });
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        return res.status(500).json({ error: "Error al actualizar rol" });
    }
}

// 3. Actualizar permisos del usuario (vía rol actual)
async function updatePermisosUsuario(req, res) {
    const { id_usuario, permisos } = req.body;

    if (!id_usuario || !Array.isArray(permisos)) {
        return res.status(400).json({ error: "Faltan datos o permisos no es un array" });
    }

    try {
        // Obtener el rol actual
        const [rolResult] = await pool.query("SELECT id_rol FROM usuario_rol WHERE id_usuario = ?", [id_usuario]);
        if (rolResult.length === 0) return res.status(400).json({ error: "El usuario no tiene un rol asignado" });

        const id_rol = rolResult[0].id_rol;

        // Eliminar permisos actuales del rol
        await pool.query("DELETE FROM rol_permiso WHERE id_rol = ?", [id_rol]);

        // Insertar nuevos permisos
        for (const permisoNombre of permisos) {
            const [permisoResult] = await pool.query("SELECT id FROM permiso WHERE nombre = ?", [permisoNombre]);
            if (permisoResult.length > 0) {
                await pool.query("INSERT INTO rol_permiso (id_rol, id_permiso) VALUES (?, ?)", [id_rol, permisoResult[0].id]);
            }
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("Error al actualizar permisos:", error);
        return res.status(500).json({ error: "Error al actualizar permisos del usuario" });
    }
}

module.exports = {
    registrarUsuarioPublico,
    registrarUsuarioAdmin,
    inicioSesion,
    eliminarUsuario,
    getUsuarioByEmail,
    updateRolUsuario,
    updatePermisosUsuario,
};
