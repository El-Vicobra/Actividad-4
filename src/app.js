const path = require('path');
const express = require('express');
const cors = require('cors');

// Evita cargar .env local durante pruebas unitarias aisladas
if (process.env.NODE_ENV !== 'test') {
    require('dotenv').config({ quiet: true });
}

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
    res.status(200).json({
        ok: true,
        message: 'API de The Isekai Items operativa.'
    });
});

// Garantiza conexión activa a MongoDB Atlas en despliegues serverless (Vercel)
app.use('/api', async (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    try {
        await connectDB();
        return next();
    } catch (error) {
        return next(error);
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/productos', productRoutes);

// Fallback JSON para endpoints /api no registrados (compatible con Express 5)
app.use('/api', (req, res) => {
    res.status(404).json({
        ok: false,
        message: 'Ruta de API no encontrada.'
    });
});

app.use(errorHandler);

module.exports = app;
