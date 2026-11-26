const express = require('express');
const { body, param } = require('express-validator');
const {
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    eliminarProducto
} = require('../controllers/productController');
const { verificarToken, soloAdmin } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

const idParamValidation = [
    param('id')
        .isMongoId()
        .withMessage('El ID del producto no es un ObjectId válido.')
];

const createProductValidation = [
    body('nombre')
        .trim()
        .notEmpty()
        .withMessage('El nombre del producto es obligatorio.')
        .isLength({ min: 2, max: 120 })
        .withMessage('El nombre debe tener entre 2 y 120 caracteres.'),
    body('descripcion')
        .trim()
        .notEmpty()
        .withMessage('La descripción es obligatoria.')
        .isLength({ min: 3, max: 500 })
        .withMessage('La descripción debe tener entre 3 y 500 caracteres.'),
    body('precio')
        .notEmpty()
        .withMessage('El precio es obligatorio.')
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número mayor o igual a 0.'),
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('El stock debe ser un número entero mayor o igual a 0.')
];

const updateProductValidation = [
    ...idParamValidation,
    body('nombre')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('El nombre no puede estar vacío.')
        .isLength({ min: 2, max: 120 })
        .withMessage('El nombre debe tener entre 2 y 120 caracteres.'),
    body('descripcion')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('La descripción no puede estar vacía.')
        .isLength({ min: 3, max: 500 })
        .withMessage('La descripción debe tener entre 3 y 500 caracteres.'),
    body('precio')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número mayor o igual a 0.'),
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('El stock debe ser un número entero mayor o igual a 0.'),
    body().custom((value) => {
        const campos = ['nombre', 'descripcion', 'precio', 'stock'];
        const tieneAlguno = campos.some((campo) => value[campo] !== undefined);
        if (!tieneAlguno) {
            throw new Error('Debe enviar al menos un campo válido para actualizar.');
        }
        return true;
    })
];

router.get('/', verificarToken, obtenerProductos);
router.get('/:id', verificarToken, idParamValidation, validateRequest, obtenerProductoPorId);
router.post('/', verificarToken, soloAdmin, createProductValidation, validateRequest, crearProducto);
router.put('/:id', verificarToken, soloAdmin, updateProductValidation, validateRequest, actualizarProducto);
router.delete('/:id', verificarToken, soloAdmin, idParamValidation, validateRequest, eliminarProducto);

module.exports = router;
