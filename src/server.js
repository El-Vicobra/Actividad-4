require('dotenv').config({ quiet: true });
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

// Punto de entrada local desacoplado de app.js para permitir pruebas con Supertest y deploy en Vercel
const startServer = async () => {
    try {
        await connectDB();
        console.log('Conexión a MongoDB Atlas establecida.');

        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error.message);
        process.exit(1);
    }
};

startServer();
