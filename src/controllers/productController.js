const Product = require('../models/Product');

// Lista el inventario ordenado del más reciente al más antiguo
const obtenerProductos = async (req, res, next) => {
    try {
        const productos = await Product.find().sort({ createdAt: -1 });
        return res.status(200).json({
            ok: true,
            message: 'Productos obtenidos correctamente.',
            data: productos
        });
    } catch (error) {
        return next(error);
    }
};

const obtenerProductoPorId = async (req, res, next) => {
    try {
        const producto = await Product.findById(req.params.id);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                message: 'Producto no encontrado.'
            });
        }

        return res.status(200).json({
            ok: true,
            message: 'Producto obtenido correctamente.',
            data: producto
        });
    } catch (error) {
        return next(error);
    }
};

// Crea un producto vinculando su autoría (creadoPor) al ID del token autenticado
const crearProducto = async (req, res, next) => {
    try {
        const { nombre, descripcion, precio, stock } = req.body;

        const nuevoProducto = await Product.create({
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            precio: Number(precio),
            stock: stock !== undefined ? Number(stock) : 0,
            creadoPor: req.user ? req.user.id : null
        });

        return res.status(201).json({
            ok: true,
            message: 'Producto creado exitosamente.',
            data: nuevoProducto
        });
    } catch (error) {
        return next(error);
    }
};

// Filtra explícitamente los campos permitidos para prevenir mass assignment
const actualizarProducto = async (req, res, next) => {
    try {
        const camposActualizados = {};
        if (req.body.nombre !== undefined) camposActualizados.nombre = req.body.nombre.trim();
        if (req.body.descripcion !== undefined) camposActualizados.descripcion = req.body.descripcion.trim();
        if (req.body.precio !== undefined) camposActualizados.precio = Number(req.body.precio);
        if (req.body.stock !== undefined) camposActualizados.stock = Number(req.body.stock);

        const productoActualizado = await Product.findByIdAndUpdate(
            req.params.id,
            camposActualizados,
            { new: true, runValidators: true }
        );

        if (!productoActualizado) {
            return res.status(404).json({
                ok: false,
                message: 'Producto no encontrado.'
            });
        }

        return res.status(200).json({
            ok: true,
            message: 'Producto actualizado exitosamente.',
            data: productoActualizado
        });
    } catch (error) {
        return next(error);
    }
};

const eliminarProducto = async (req, res, next) => {
    try {
        const productoEliminado = await Product.findByIdAndDelete(req.params.id);

        if (!productoEliminado) {
            return res.status(404).json({
                ok: false,
                message: 'Producto no encontrado.'
            });
        }

        return res.status(200).json({
            ok: true,
            message: 'Producto eliminado exitosamente.',
            data: productoEliminado
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    eliminarProducto
};
