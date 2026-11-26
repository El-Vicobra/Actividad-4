const { validationResult } = require('express-validator');

// Recolecta errores de express-validator y corta el flujo con HTTP 400
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            ok: false,
            message: 'Error de validación en los datos enviados.',
            errors: errors.array().map((err) => ({
                campo: err.path,
                mensaje: err.msg
            }))
        });
    }

    return next();
};

module.exports = validateRequest;
