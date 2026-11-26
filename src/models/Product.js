const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120
        },
        descripcion: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },
        precio: {
            type: Number,
            required: true,
            min: 0
        },
        stock: {
            type: Number,
            default: 0,
            min: 0
        },
        creadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    {
        timestamps: true,
        collection: 'productos'
    }
);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
