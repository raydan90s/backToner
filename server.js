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

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin); // Retorna el origin dinámicamente
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

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
