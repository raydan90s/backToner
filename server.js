// server.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const router = require('./routes'); 
require("dotenv").config();


const app = express();


const allowedOrigins = [
  'http://localhost:3000',
  'https://tonerexpress-ec.com',
  'https://www.tonerexpress-ec.com',
  'https://www.novafenix-ec.com',
  'http://localhost:5173',

];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  // Maneja preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cookieParser());
app.use(express.json());

app.use('/api', router);

app.use((req, res) => {
  console.warn(`Ruta no encontrada o sin respuesta: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((req, res, next) => {
  res.on('finish', () => {
    console.log('Access-Control-Allow-Origin:', res.getHeader('Access-Control-Allow-Origin'));
  });
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
