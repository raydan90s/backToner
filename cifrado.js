import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const secretKey = process.env.SECRET_KEY_ENCRYPTATION;

export const cifrar = (texto) => {
    if (!texto) return null;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);

    let cifrado = cipher.update(texto, 'utf8', 'hex');
    cifrado += cipher.final('hex');

    return iv.toString('hex') + ':' + cifrado;
};

export const descifrar = (textoCifrado) => {
    if (!textoCifrado) return null;

    const partes = textoCifrado.split(':');
    const iv = Buffer.from(partes[0], 'hex');
    const textoCifradoFinal = partes[1];

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
    let descifrado = decipher.update(textoCifradoFinal, 'hex', 'utf8');
    descifrado += decipher.final('utf8');

    return descifrado;
};
