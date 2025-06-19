// server.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const router = require('./routes'); 
require("dotenv").config();


const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api', router);

app.use((req, res) => {
  console.warn(`Ruta no encontrada o sin respuesta: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
