require('dotenv').config();

const API_KEY = process.env.API_KEY;

const verifyApiKey = (req, res, next) => {
  const providedKey = req.headers['x-api-key']; 

  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Access Denied</title>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
            color: #333;
          }
          .container {
            text-align: center;
          }
          h1 {
            color: #dc3545;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1> Access Denied</h1>
        </div>
      </body>
      </html>
    `); 
  }

  next();
}

module.exports = { verifyApiKey };
