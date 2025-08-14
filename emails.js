const pool = require('./db');
const crypto = require('crypto');

const verificarEmail = async (req, res) => {
    const { token } = req.params;
    if (!token) {
        return res.status(400).json({
            message: 'Token de verificación requerido.',
            verified: false
        });
    }

    try {
        const [results] = await pool.query(
            'SELECT id, verificado, nombre, token_verificacion, token_verificacion_exp FROM usuario WHERE token_verificacion = ?',
            [token]
        );
        if (results.length === 0) {
            return res.status(404).json({
                message: 'Token de verificación inválido o expirado.',
                verified: false
            });
        }

        const usuario = results[0];

        // Verificar expiración real (24 horas)
        if (usuario.token_verificacion_exp) {
            const now = new Date();
            const tokenCreated = new Date(usuario.token_verificacion_exp);
            const diffHours = (now.getTime() - tokenCreated.getTime()) / 1000 / 3600;

            if (diffHours > 24) {
                return res.status(400).json({
                    message: 'El token de verificación ha expirado. Solicita un nuevo correo.',
                    verified: false,
                    expired: true
                });
            }
        }

        if (usuario.verificado === 1) {
            return res.status(200).json({
                message: 'Tu cuenta ya está verificada. Puedes iniciar sesión.',
                verified: true,
                alreadyVerified: true
            });
        }

        await pool.query(
            'UPDATE usuario SET verificado = 1, token_verificacion = NULL, token_verificacion_exp = NULL WHERE id = ?',
            [usuario.id]
        );

        res.status(200).json({
            message: '¡Correo verificado exitosamente! Ya puedes iniciar sesión.',
            verified: true,
            alreadyVerified: false
        });

    } catch (error) {
        console.error("❌ Error en verificarEmail:", error);
        res.status(500).json({
            message: 'Error interno del servidor',
            verified: false
        });
    }
};


const reenviarVerificacion = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email requerido.' });
    }

    try {
        const emailCifrado = cifrarDeterministicoEmail(email);

        const [results] = await pool.query(
            'SELECT id, verificado, nombre, token_verificacion, token_verificacion_exp FROM usuario WHERE email = ?',
            [emailCifrado]
        );

        if (results.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const usuario = results[0];

        if (usuario.verificado === 1) {
            return res.status(400).json({
                message: 'Esta cuenta ya está verificada.',
                verified: true
            });
        }

        const now = new Date();
        let tokenToSend = usuario.token_verificacion;
        let tokenExpired = true;

        if (usuario.token_verificacion && usuario.token_verificacion_exp) {
            const tokenExp = new Date(usuario.token_verificacion_exp);
            const diffHours = (now.getTime() - tokenExp.getTime()) / 1000 / 3600;
            if (diffHours < 24) {
                tokenExpired = false; // Token aún válido
            }
        }

        // Si el token no ha expirado, simplemente devolvemos un flag y no generamos nuevo token
        if (!tokenExpired) {
            return res.status(200).json({
                message: 'Token aún válido. No se reenviará correo.',
                verificationToken: null,
                nombre: descifrar(usuario.nombre)
            });
        }

        // Generar nuevo token si no existe o está expirado
        tokenToSend = crypto.randomBytes(32).toString('hex');
        await pool.query(
            'UPDATE usuario SET token_verificacion = ?, token_verificacion_exp = NOW() WHERE id = ?',
            [tokenToSend, usuario.id]
        );

        res.status(200).json({
            message: 'Correo de verificación listo para enviar.',
            verificationToken: tokenToSend,
            nombre: descifrar(usuario.nombre),
        });

    } catch (error) {
        console.error("Error en reenviarVerificacion:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const restablecerContrasena = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Correo electrónico requerido.' });
    }

    try {
        const emailCifrado = cifrarDeterministicoEmail(email);

        const [results] = await pool.query(
            'SELECT id, nombre FROM usuario WHERE email = ?',
            [emailCifrado]
        );

        if (results.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const usuario = results[0];

        // Generar token único de restablecimiento
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // Guardar token en la base de datos
        await pool.query(
            'UPDATE usuario SET token_restablecer = ?, token_restablecer_exp = ? WHERE id = ?',
            [resetToken, expiresAt, usuario.id]
        );

        const nombreDescifrado = descifrar(usuario.nombre);

        // Enviar respuesta al frontend (para enviar correo)
        res.status(200).json({
            message: 'Token de restablecimiento generado exitosamente.',
            resetToken,
            nombre: nombreDescifrado,
            email: email
        });

    } catch (error) {
        console.error("Error en restablecerContrasena:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};


module.exports = {
    verificarEmail,
    reenviarVerificacion
};