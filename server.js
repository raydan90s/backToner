const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const router = require('./routes');
const morgan = require('morgan');

require("dotenv").config();


const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://tonerexpress-ec.com',
  'https://www.tonerexpress-ec.com',
  'https://www.novafenix-ec.com',
];

// CORS primero
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error(`CORS: Origin ${origin} no permitido`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));


// Tu router
app.use('/api', router);

// 404 handler
app.use((req, res) => {
  console.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en el puerto ${PORT}`);
});
