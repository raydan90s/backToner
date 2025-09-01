// generateApiKey.js
const crypto = require("crypto");

// Genera una clave de 32 bytes y la convierte en string hexadecimal
function generateApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

// Generamos y mostramos
const apiKey = generateApiKey();
console.log("Tu nueva API_KEY es:");
console.log(apiKey);
