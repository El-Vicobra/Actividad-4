const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            minlength: 6
        },
        rol: {
            type: String,
            enum: ['cliente', 'admin'],
            default: 'cliente'
        }
    },
    {
        timestamps: true,
        collection: 'usuarios'
    }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
