import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY;

export function generarTokenVerificacion(email) {
  return jwt.sign({ email }, SECRET_KEY, { expiresIn: "1d" });
}

export function validarToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    return null;
  }
}
