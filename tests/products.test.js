process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_isekai_2026';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock del modelo Product para ejecutar pruebas CRUD sin base de datos real
jest.mock('../src/models/Product');

const Product = require('../src/models/Product');
const app = require('../src/app');

const ADMIN_ID = '65f000000000000000000010';
const CLIENT_ID = '65f000000000000000000020';
const VALID_PRODUCT_ID = '65f000000000000000000099';

const adminToken = jwt.sign(
    { id: ADMIN_ID, nombre: 'Admin Isekai', email: 'admin@isekai.com', rol: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

const clientToken = jwt.sign(
    { id: CLIENT_ID, nombre: 'Cliente Isekai', email: 'cliente@isekai.com', rol: 'cliente' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

const expiredToken = jwt.sign(
    { id: ADMIN_ID, nombre: 'Admin Isekai', email: 'admin@isekai.com', rol: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '-10s' }
);

describe('Products API (/api/productos)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Autenticación y control de acceso RBAC', () => {
        test('retorna 401 si no se envía header Authorization', async () => {
            const res = await request(app).get('/api/productos');

            expect(res.status).toBe(401);
            expect(res.body.ok).toBe(false);
        });

        test('retorna 401 si el token está expirado', async () => {
            const res = await request(app)
                .get('/api/productos')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(res.status).toBe(401);
            expect(res.body.ok).toBe(false);
        });

        test('retorna 403 si un usuario con rol cliente intenta crear un producto', async () => {
            const res = await request(app)
                .post('/api/productos')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({
                    nombre: 'Poción de Maná',
                    descripcion: 'Restaura 100 puntos de MP',
                    precio: 120,
                    stock: 5
                });

            expect(res.status).toBe(403);
            expect(res.body.ok).toBe(false);
            expect(Product.create).not.toHaveBeenCalled();
        });

        test('retorna 403 si un cliente intenta actualizar o eliminar un producto', async () => {
            const putRes = await request(app)
                .put(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ precio: 200 });
            expect(putRes.status).toBe(403);

            const delRes = await request(app)
                .delete(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${clientToken}`);
            expect(delRes.status).toBe(403);
        });
    });

    describe('GET /api/productos y GET /api/productos/:id', () => {
        test('permite listar productos a un usuario autenticado con rol cliente', async () => {
            const mockLista = [
                { _id: VALID_PRODUCT_ID, nombre: 'Espada Sagrada', descripcion: 'Acero élfico', precio: 950, stock: 2 }
            ];
            // Emula el encadenamiento Mongoose Product.find().sort()
            Product.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockLista)
            });

            const res = await request(app)
                .get('/api/productos')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].nombre).toBe('Espada Sagrada');
        });

        test('obtiene un producto por ObjectId válido', async () => {
            Product.findById.mockResolvedValue({
                _id: VALID_PRODUCT_ID,
                nombre: 'Poción Suprema',
                descripcion: 'Curación completa',
                precio: 300,
                stock: 10
            });

            const res = await request(app)
                .get(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data._id).toBe(VALID_PRODUCT_ID);
        });

        test('retorna 400 cuando el ID no es un ObjectId válido', async () => {
            const res = await request(app)
                .get('/api/productos/id-invalido')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.status).toBe(400);
            expect(res.body.ok).toBe(false);
            expect(Product.findById).not.toHaveBeenCalled();
        });

        test('retorna 404 cuando el producto no existe', async () => {
            Product.findById.mockResolvedValue(null);

            const res = await request(app)
                .get(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.status).toBe(404);
            expect(res.body.ok).toBe(false);
        });

        test('retorna 500 controlado ante fallo de base de datos', async () => {
            Product.find.mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error('Mongo timeout'))
            });

            const res = await request(app)
                .get('/api/productos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(500);
            expect(res.body.ok).toBe(false);
        });
    });

    describe('POST /api/productos', () => {
        test('crea un producto con token admin y asigna creadoPor del JWT', async () => {
            const nuevoMock = {
                _id: VALID_PRODUCT_ID,
                nombre: 'Grimorio Arcano',
                descripcion: 'Hechizos elementales de nivel S',
                precio: 1499.5,
                stock: 3,
                creadoPor: ADMIN_ID
            };
            Product.create.mockResolvedValue(nuevoMock);

            const res = await request(app)
                .post('/api/productos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nombre: 'Grimorio Arcano',
                    descripcion: 'Hechizos elementales de nivel S',
                    precio: 1499.5,
                    stock: 3
                });

            expect(res.status).toBe(201);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.nombre).toBe('Grimorio Arcano');
            expect(Product.create).toHaveBeenCalledWith({
                nombre: 'Grimorio Arcano',
                descripcion: 'Hechizos elementales de nivel S',
                precio: 1499.5,
                stock: 3,
                creadoPor: ADMIN_ID
            });
        });

        test('retorna 400 cuando faltan campos o hay valores numéricos negativos', async () => {
            const res = await request(app)
                .post('/api/productos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nombre: '',
                    descripcion: 'ok',
                    precio: -10,
                    stock: -1
                });

            expect(res.status).toBe(400);
            expect(res.body.ok).toBe(false);
            expect(Array.isArray(res.body.errors)).toBe(true);
            expect(Product.create).not.toHaveBeenCalled();
        });
    });

    describe('PUT /api/productos/:id', () => {
        test('actualiza un producto existente ignorando campos protegidos no permitidos', async () => {
            Product.findByIdAndUpdate.mockResolvedValue({
                _id: VALID_PRODUCT_ID,
                nombre: 'Grimorio Arcano v2',
                descripcion: 'Edición revisada',
                precio: 1600,
                stock: 4
            });

            const res = await request(app)
                .put(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nombre: 'Grimorio Arcano v2',
                    precio: 1600,
                    creadoPor: CLIENT_ID
                });

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
                VALID_PRODUCT_ID,
                { nombre: 'Grimorio Arcano v2', precio: 1600 },
                { new: true, runValidators: true }
            );
        });

        test('retorna 400 si el body no envía ningún campo válido para actualizar', async () => {
            const res = await request(app)
                .put(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.ok).toBe(false);
        });

        test('retorna 404 si el producto a actualizar no existe', async () => {
            Product.findByIdAndUpdate.mockResolvedValue(null);

            const res = await request(app)
                .put(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ precio: 500 });

            expect(res.status).toBe(404);
            expect(res.body.ok).toBe(false);
        });
    });

    describe('DELETE /api/productos/:id', () => {
        test('elimina un producto existente con token admin', async () => {
            Product.findByIdAndDelete.mockResolvedValue({
                _id: VALID_PRODUCT_ID,
                nombre: 'Poción de Maná'
            });

            const res = await request(app)
                .delete(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(Product.findByIdAndDelete).toHaveBeenCalledWith(VALID_PRODUCT_ID);
        });

        test('retorna 404 si el producto a eliminar no existe', async () => {
            Product.findByIdAndDelete.mockResolvedValue(null);

            const res = await request(app)
                .delete(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
            expect(res.body.ok).toBe(false);
        });

        test('retorna 500 si la eliminación falla en base de datos', async () => {
            Product.findByIdAndDelete.mockRejectedValue(new Error('Write concern error'));

            const res = await request(app)
                .delete(`/api/productos/${VALID_PRODUCT_ID}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(500);
            expect(res.body.ok).toBe(false);
        });
    });

    describe('Fallback 404 de API', () => {
        test('retorna 404 JSON para rutas de API inexistentes', async () => {
            const res = await request(app).get('/api/ruta-inexistente');

            expect(res.status).toBe(404);
            expect(res.body.ok).toBe(false);
        });
    });
});
