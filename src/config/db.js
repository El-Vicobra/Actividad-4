const mongoose = require('mongoose');

let connectionPromise = null;

// Reutiliza la conexión activa o promesa en curso para evitar reconexiones en entornos serverless
const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error('La variable de entorno MONGO_URI no está definida.');
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose
            .connect(mongoUri)
            .then((conn) => conn.connection)
            .catch((error) => {
                // Libera la promesa fallida para permitir reintentos posteriores
                connectionPromise = null;
                throw error;
            });
    }

    return connectionPromise;
};

module.exports = connectDB;
