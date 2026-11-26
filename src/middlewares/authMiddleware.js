const jwt = require('jsonwebtoken');

// Valida el JWT del header Authorization (Bearer) y adjunta los claims en req.user
const verificarToken = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            ok: false,
            message: 'Acceso denegado. Token no proporcionado o formato inválido.'
        });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
        return res.status(401).json({
            ok: false,
            message: 'Acceso denegado. Token vacío.'
        });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({
            ok: false,
            message: 'Error de configuración del servidor.'
        });
    }

    try {
        const payload = jwt.verify(token, secret);
        req.user = payload;
        return next();
    } catch (error) {
        return res.status(401).json({
            ok: false,
            message: 'Token inválido o expirado.'
        });
    }
};

// Restringe el acceso únicamente a usuarios autenticados con rol administrador
const soloAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            ok: false,
            message: 'Autenticación requerida.'
        });
    }

    if (req.user.rol !== 'admin') {
        return res.status(403).json({
            ok: false,
            message: 'Acceso prohibido. Se requieren privilegios de administrador.'
        });
    }

    return next();
};

module.exports = { verificarToken, soloAdmin };
