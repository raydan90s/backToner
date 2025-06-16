require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port:     process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conexion exitosa a la base de datos');
    conn.release();          
  } catch (err) {
    console.error('❌ Error al crear el pool:', err);
  }
})();

module.exports = pool;      