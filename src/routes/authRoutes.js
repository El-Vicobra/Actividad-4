const express = require('express');
const { body } = require('express-validator');
const { register, login, logout, perfil } = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

const registerValidation = [
    body('nombre')
        .trim()
        .notEmpty()
        .withMessage('El nombre es obligatorio.')
        .isLength({ min: 2, max: 80 })
        .withMessage('El nombre debe tener entre 2 y 80 caracteres.'),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('El correo electrónico es obligatorio.')
        .isEmail()
        .withMessage('El correo electrónico no tiene un formato válido.'),
    body('password')
        .notEmpty()
        .withMessage('La contraseña es obligatoria.')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres.')
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('El correo electrónico es obligatorio.')
        .isEmail()
        .withMessage('El correo electrónico no tiene un formato válido.'),
    body('password')
        .notEmpty()
        .withMessage('La contraseña es obligatoria.')
];

router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/logout', verificarToken, logout);
router.get('/me', verificarToken, perfil);

module.exports = router;
