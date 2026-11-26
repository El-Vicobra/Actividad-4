// Middleware global que traduce errores de Express, Mongoose y JWT a respuestas JSON uniformes
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
        return res.status(400).json({
            ok: false,
            message: 'El cuerpo de la petición no contiene un JSON válido.'
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            ok: false,
            message: 'El identificador proporcionado no es válido.'
        });
    }

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors || {}).map((item) => ({
            campo: item.path,
            mensaje: item.message
        }));
        return res.status(400).json({
            ok: false,
            message: 'Error de validación en el modelo.',
            errors
        });
    }

    // Código 11000 de MongoDB indica violación de índice único (ej. email duplicado)
    if (err.code === 11000) {
        return res.status(400).json({
            ok: false,
            message: 'Ya existe un registro con ese valor único.'
        });
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            ok: false,
            message: 'Token inválido o expirado.'
        });
    }

    const statusCode = err.statusCode || 500;

    if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
        console.error('[ErrorHandler]', err);
    }

    return res.status(statusCode).json({
        ok: false,
        message: statusCode < 500 ? err.message : 'Error interno del servidor.'
    });
};

module.exports = errorHandler;
