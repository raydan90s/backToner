const pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { cifrar, descifrar } = require('./cifrado');
const crypto = require('crypto');

function cifrarDeterministicoEmail(texto) {
    // Usar SECRET_KEY_ENCRYPTATION de tu archivo .env
    const secretKey = process.env.SECRET_KEY_ENCRYPTATION;
    if (!secretKey) {
        throw new Error('SECRET_KEY_ENCRYPTATION no está definida en las variables de entorno');
    }

    // Tu clave ya tiene 64 caracteres hex, tomar los primeros 32 para AES-256
    const key = Buffer.from(secretKey.substring(0, 64), 'hex'); // Convertir de hex a buffer (32 bytes)

    const iv = Buffer.alloc(16, 0); // IV fijo de 16 bytes en cero (no aleatorio)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(texto.toLowerCase().trim(), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

function descifrarDeterministicoEmail(encrypted) {
    // Usar SECRET_KEY_ENCRYPTATION de tu archivo .env
    const secretKey = process.env.SECRET_KEY_ENCRYPTATION;
    if (!secretKey) {
        throw new Error('SECRET_KEY_ENCRYPTATION no está definida en las variables de entorno');
    }

    // Tu clave ya tiene 64 caracteres hex, convertir a buffer de 32 bytes
    const key = Buffer.from(secretKey.substring(0, 64), 'hex');

    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const descifrarUsuario = (usuario) => {
    if (!usuario) return null;
    return {
        ...usuario,
        nombre: descifrar(usuario.nombre),
        email: descifrarDeterministicoEmail(usuario.email), // Email usa cifrado determinístico
        telefono: usuario.telefono ? descifrar(usuario.telefono) : null,
        direccion: usuario.direccion ? descifrar(usuario.direccion) : null
    };
};


const registrarUsuarioPublico = async (req, res) => {
    const { name, apellido, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Nombre, correo electrónico y contraseña son requeridos.' });
    }

    try {
        // 1. Cifrar email DETERMINÍSTICAMENTE para verificar si ya existe
        const emailCifrado = cifrarDeterministicoEmail(email);

        // Buscar por email cifrado
        const [results] = await pool.query('SELECT email FROM usuario WHERE email = ?', [emailCifrado]);

        if (results.length > 0) {
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // 2. Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Cifrar datos sensibles (nombre usa cifrado REGULAR)
        const nombreCompleto = `${name} ${apellido || ''}`.trim();
        const nombreCifrado = cifrar(nombreCompleto); // Cifrado regular para nombre

        // 4. Generar token de verificación único
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h de expiración


        const [insertResult] = await pool.query(
            'INSERT INTO usuario (nombre, email, password, estado, token_verificacion, token_verificacion_exp) VALUES (?, ?, ?, ?, ?, ?)',
            [nombreCifrado, emailCifrado, hashedPassword, 'Activo', verificationToken, expiresAt]
        );

        const userId = insertResult.insertId;

        // 6. Obtener el id y nombre del rol "Cliente"
        const [rolResult] = await pool.query('SELECT id, nombre FROM rol WHERE nombre = ?', ['Cliente']);
        if (rolResult.length === 0) {
            return res.status(500).json({ message: 'Rol Cliente no existe en la base de datos.' });
        }
        const clienteRolId = rolResult[0].id;
        const clienteTipo = rolResult[0].nombre;

        // 7. Insertar en usuario_rol
        await pool.query(
            'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)',
            [userId, clienteRolId]
        );

        // 8. Devolver respuesta con datos descifrados y token de verificación
        res.status(201).json({
            userId,
            tipo: clienteTipo,
            verificationToken, // El frontend necesita esto para enviar el correo
            message: '¡Registro exitoso! Te hemos enviado un correo de verificación.',
            emailVerificationRequired: true
        });

    } catch (error) {
        console.error("Error en registrarUsuarioPublico:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};


const registrarUsuarioAdmin = async (req, res) => {
    const { tipo, nombre, email, password, permisos = [] } = req.body;

    // Solo puede registrar SuperAdmin
    if (!req.user || req.user.tipo !== 'SuperAdmin') {
        return res.status(403).json({ error: 'No tienes permisos para crear usuarios administradores.' });
    }

    if (!tipo || !nombre || !email || !password) {
        return res.status(400).json({ error: 'Tipo, nombre, correo electrónico y contraseña son requeridos.' });
    }

    try {
        // Cifrar email determinísticamente para verificar si ya existe
        const emailCifrado = cifrarDeterministicoEmail(email);

        // Verificar si email ya existe
        const [existing] = await pool.query('SELECT email FROM usuario WHERE email = ?', [emailCifrado]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Cifrar nombre
        const nombreCifrado = cifrar(nombre);

        // Los usuarios admin se crean verificados por defecto
        // Insertar usuario
        const [insertResult] = await pool.query(
            'INSERT INTO usuario (nombre, email, password, estado, verificado) VALUES (?, ?, ?, ?, ?)',
            [nombreCifrado, emailCifrado, hashedPassword, 'Activo', 0] 
        );
        const userId = insertResult.insertId;

        // Obtener o crear rol
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

        // Si es Admin, asignar permisos personalizados al usuario
        if (tipo !== "SuperAdmin" && permisos.length > 0) {
            for (const nombrePermiso of permisos) {
                // Verificar si el permiso existe
                const [permisoResult] = await pool.query('SELECT id FROM permiso WHERE nombre = ?', [nombrePermiso]);
                let permisoId;

                if (permisoResult.length === 0) {
                    const [permisoInsert] = await pool.query('INSERT INTO permiso (nombre) VALUES (?)', [nombrePermiso]);
                    permisoId = permisoInsert.insertId;
                } else {
                    permisoId = permisoResult[0].id;
                }

                // Insertar en usuario_permiso
                await pool.query(
                    'INSERT INTO usuario_permiso (id_usuario, id_permiso) VALUES (?, ?) ON DUPLICATE KEY UPDATE id_usuario=id_usuario',
                    [userId, permisoId]
                );
            }
        }

        res.status(201).json({
            userId,
            tipo,
            permisos,
            message: 'Usuario administrador registrado exitosamente.',
            verified: true // Los admin se crean verificados
        });

    } catch (error) {
        console.error("Error en registrarUsuarioAdmin:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

async function updateRolUsuario(req, res) {
    const { id_usuario, nuevoRol } = req.body;

    if (!id_usuario || !nuevoRol) {
        return res.status(400).json({ error: "Faltan datos" });
    }

    try {
        // Verificar que el rol exista
        const [roles] = await pool.query("SELECT id FROM rol WHERE nombre = ?", [nuevoRol]);
        if (roles.length === 0) return res.status(400).json({ error: "Rol no válido" });

        const id_rol = roles[0].id;

        // Eliminar roles actuales
        await pool.query("DELETE FROM usuario_rol WHERE id_usuario = ?", [id_usuario]);

        // Asignar nuevo rol
        await pool.query("INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)", [id_usuario, id_rol]);

        // Si es SuperAdmin, no hace falta modificar usuario_permiso
        if (nuevoRol !== "SuperAdmin") {
            // Opcional: si quieres limpiar permisos individuales al cambiar rol
            await pool.query("DELETE FROM usuario_permiso WHERE id_usuario = ?", [id_usuario]);
        }

        return res.json({ success: true, message: `Rol actualizado a ${nuevoRol}` });
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        return res.status(500).json({ error: "Error al actualizar rol" });
    }
}

async function updatePermisosUsuario(req, res) {
    const { id_usuario, permisos } = req.body;

    if (!id_usuario || !Array.isArray(permisos)) {
        return res.status(400).json({ error: "Faltan datos o permisos no es un array" });
    }

    try {
        // Obtener rol del usuario
        const [rolResult] = await pool.query("SELECT r.nombre FROM rol r JOIN usuario_rol ur ON ur.id_rol = r.id WHERE ur.id_usuario = ?", [id_usuario]);
        if (rolResult.length === 0) return res.status(400).json({ error: "El usuario no tiene un rol asignado" });

        const rolNombre = rolResult[0].nombre;

        if (rolNombre === "SuperAdmin") {
            return res.status(400).json({ error: "No se pueden modificar permisos de SuperAdmin" });
        }

        // Eliminar permisos individuales actuales
        await pool.query("DELETE FROM usuario_permiso WHERE id_usuario = ?", [id_usuario]);

        // Insertar nuevos permisos
        for (const nombrePermiso of permisos) {
            const [permisoResult] = await pool.query("SELECT id FROM permiso WHERE nombre = ?", [nombrePermiso]);
            let permisoId;
            if (permisoResult.length === 0) {
                // Crear permiso si no existe
                const [permisoInsert] = await pool.query("INSERT INTO permiso (nombre) VALUES (?)", [nombrePermiso]);
                permisoId = permisoInsert.insertId;
            } else {
                permisoId = permisoResult[0].id;
            }

            // Insertar permiso al usuario
            await pool.query(
                "INSERT INTO usuario_permiso (id_usuario, id_permiso) VALUES (?, ?) ON DUPLICATE KEY UPDATE id_usuario=id_usuario",
                [id_usuario, permisoId]
            );
        }

        return res.json({ success: true, message: "Permisos actualizados correctamente" });
    } catch (error) {
        console.error("Error al actualizar permisos:", error);
        return res.status(500).json({ error: "Error al actualizar permisos del usuario" });
    }
}

const inicioSesion = async (req, res) => {
    const { email, password } = req.body;

    // Validación de campos requeridos
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    try {
        const emailCifrado = cifrarDeterministicoEmail(email);

        const [results] = await pool.query(`
            SELECT u.*, r.nombre AS tipo
            FROM usuario u
            JOIN usuario_rol ur ON u.id = ur.id_usuario
            JOIN rol r ON ur.id_rol = r.id
            WHERE u.email = ?
        `, [emailCifrado]);

        const user = results[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' }); // Más genérico por seguridad
        }

        // Verificar si el usuario está activo
        if (user.estado !== 'Activo') {
            return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
        }

        // Verificar contraseña antes de verificación de email (más eficiente)
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Credenciales inválidas' }); // Más genérico por seguridad
        }

        // Verificar si el email está verificado
        if (!user.verificado || user.verificado === 0) {
            return res.status(403).json({
                error: 'Debes verificar tu correo electrónico antes de iniciar sesión.',
                user: {
                    id: user.id,
                    email: descifrarDeterministicoEmail(user.email), // tu función para descifrar
                    nombre: descifrar(user.nombre),
                },
                emailNotVerified: true,
                showResendOption: true
            });
        }

        // Descifrar datos del usuario
        const usuarioDescifrado = descifrarUsuario(user);

        // Generar token JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: usuarioDescifrado.email,
                tipo: user.tipo,
                nombre: usuarioDescifrado.nombre,
                verificado: true // Confirmamos que está verificado
            },
            process.env.SECRET_KEY,
            { expiresIn: '1h' }
        );

        // Establecer cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 3600000 // 1 hora en milisegundos
        });

        res.json({
            message: 'Inicio de sesión exitoso',
            user: {
                id: user.id,
                email: usuarioDescifrado.email,
                nombre: usuarioDescifrado.nombre, // Incluir nombre en la respuesta
                tipo: user.tipo,
                verificado: true
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
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario inactivado exitosamente.' });

    } catch (error) {
        console.error("Error en eliminarUsuario:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

async function getUsuarioByEmail(req, res) {
    const { email } = req.query;

    if (!email) return res.status(400).json({ error: "Falta el parámetro email" });

    try {
        // Cifrar el email DETERMINÍSTICAMENTE para buscar
        const emailCifrado = cifrarDeterministicoEmail(email);

        // Obtener usuario
        const [usuarios] = await pool.query("SELECT id, nombre, email FROM usuario WHERE email = ?", [emailCifrado]);
        if (usuarios.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const usuario = usuarios[0];

        // Descifrar datos del usuario
        const usuarioDescifrado = descifrarUsuario(usuario);

        // Obtener rol
        const [roles] = await pool.query(`
            SELECT r.nombre 
            FROM rol r
            JOIN usuario_rol ur ON ur.id_rol = r.id
            WHERE ur.id_usuario = ?
            LIMIT 1
        `, [usuario.id]);

        const rol = roles[0]?.nombre || "Sin rol";

        // Obtener permisos asignados directamente al usuario
        const [permisosRaw] = await pool.query(`
            SELECT p.nombre
            FROM permiso p
            JOIN usuario_permiso up ON up.id_permiso = p.id
            WHERE up.id_usuario = ?
        `, [usuario.id]);

        const permisos = permisosRaw.map(row => row.nombre);

        return res.json({
            usuario: {
                ...usuarioDescifrado,
                rol,
                permisos
            }
        });
    } catch (error) {
        console.error("Error al obtener usuario:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
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