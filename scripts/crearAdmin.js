const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const [nombre, email, password] = process.argv.slice(2);

if (!nombre || !email || !password) {
    console.error('Uso: node scripts/crearAdmin.js "Nombre" "correo@dominio.com" "contraseña"');
    process.exit(1);
}

if (password.length < 6) {
    console.error('Error: la contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
}

const crearAdmin = async () => {
    try {
        await connectDB();

        const emailNormalizado = email.toLowerCase().trim();
        const existente = await User.findOne({ email: emailNormalizado });

        if (existente) {
            console.warn(`El usuario "${emailNormalizado}" ya existe (rol: ${existente.rol}).`);
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await User.create({
            nombre: nombre.trim(),
            email: emailNormalizado,
            password: passwordHash,
            rol: 'admin'
        });

        console.log('Administrador creado correctamente en MongoDB Atlas.');
        console.log(`Nombre: ${nombre.trim()}`);
        console.log(`Correo: ${emailNormalizado}`);
        console.log('Rol:    admin');
    } catch (error) {
        console.error('Error al crear administrador:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

crearAdmin();
