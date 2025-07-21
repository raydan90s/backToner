// swagger.js
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API TonerExpress',
      version: '1.0.0',
      description: 'Documentación de endpoints para tu backend Node.js',
    },
    servers: [
      {
        url: 'http://localhost:5000/api', // ajusta según entorno
      },
    ],
  },
  apis: ['./routes.js'], // o './routes/*.js' si separas las rutas
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
