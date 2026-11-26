const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Registra cuentas públicas forzando rol 'cliente' y almacenando solo hash bcrypt
const register = async (req, res, next) => {
    try {
        const { nombre, email, password } = req.body;
        const emailNormalizado = email.toLowerCase().trim();

        const usuarioExistente = await User.findOne({ email: emailNormalizado });
        if (usuarioExistente) {
            return res.status(400).json({
                ok: false,
                message: 'El correo electrónico ya está registrado.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const nuevoUsuario = await User.create({
            nombre: nombre.trim(),
            email: emailNormalizado,
            password: passwordHash,
            rol: 'cliente'
        });

        return res.status(201).json({
            ok: true,
            message: 'Usuario registrado exitosamente.',
            data: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                email: nuevoUsuario.email,
                rol: nuevoUsuario.rol
            }
        });
    } catch (error) {
        return next(error);
    }
};

// Valida credenciales contra el hash almacenado y firma un JWT con expiración de 2h
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const emailNormalizado = email.toLowerCase().trim();

        const usuario = await User.findOne({ email: emailNormalizado });
        if (!usuario) {
            return res.status(401).json({
                ok: false,
                message: 'Correo o contraseña incorrectos.'
            });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({
                ok: false,
                message: 'Correo o contraseña incorrectos.'
            });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('La variable de entorno JWT_SECRET no está definida.');
        }

        const token = jwt.sign(
            {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            },
            secret,
            { expiresIn: '2h' }
        );

        return res.status(200).json({
            ok: true,
            message: 'Inicio de sesión exitoso.',
            data: {
                token,
                usuario: {
                    id: usuario._id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol
                }
            }
        });
    } catch (error) {
        return next(error);
    }
};

// Cierre de sesión stateless; la invalidación efectiva ocurre al descartar el JWT en el cliente
const logout = async (req, res, next) => {
    try {
        return res.status(200).json({
            ok: true,
            message: 'Sesión cerrada correctamente.',
            data: null
        });
    } catch (error) {
        return next(error);
    }
};

const perfil = async (req, res, next) => {
    try {
        return res.status(200).json({
            ok: true,
            message: 'Sesión verificada.',
            data: req.user
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = { register, login, logout, perfil };
