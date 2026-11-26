process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_isekai_2026';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mocks de modelo Mongoose y bcryptjs para aislar pruebas sin conexión a Atlas
jest.mock('../src/models/User');
jest.mock('bcryptjs');

const User = require('../src/models/User');
const app = require('../src/app');

describe('Auth API (/api/auth)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        test('registra un usuario válido y fuerza rol cliente aunque se envíe admin en el body', async () => {
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('$2a$10$hashedPasswordMock');
            User.create.mockResolvedValue({
                _id: '65f000000000000000000001',
                nombre: 'Kazuma Satou',
                email: 'kazuma@isekai.com',
                password: '$2a$10$hashedPasswordMock',
                rol: 'cliente'
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'Kazuma Satou',
                    email: 'Kazuma@Isekai.com',
                    password: 'Password123',
                    rol: 'admin'
                });

            expect(res.status).toBe(201);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.rol).toBe('cliente');
            expect(res.body.data.password).toBeUndefined();
            expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
            expect(User.create).toHaveBeenCalledWith({
                nombre: 'Kazuma Satou',
                email: 'kazuma@isekai.com',
                password: '$2a$10$hashedPasswordMock',
                rol: 'cliente'
            });
        });

        test('retorna 400 cuando el correo ya está registrado', async () => {
            User.findOne.mockResolvedValue({
                _id: '65f000000000000000000002',
                email: 'duplicado@isekai.com'
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'Megumin',
                    email: 'duplicado@isekai.com',
                    password: 'Password123'
                });

            expect(res.status).toBe(400);
            expect(res.body.ok).toBe(false);
            expect(User.create).not.toHaveBeenCalled();
        });

        test('retorna 400 con detalle de errores ante payload inválido', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'A',
                    email: 'correo-invalido',
                    password: '123'
                });

            expect(res.status).toBe(400);
            expect(res.body.ok).toBe(false);
            expect(Array.isArray(res.body.errors)).toBe(true);
            expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
        });

        test('retorna 500 controlado cuando ocurre un error en la base de datos', async () => {
            User.findOne.mockRejectedValue(new Error('DB connection lost'));

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'Aqua',
                    email: 'aqua@isekai.com',
                    password: 'Password123'
                });

            expect(res.status).toBe(500);
            expect(res.body.ok).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        test('autentica credenciales válidas y emite JWT firmado con el rol del usuario', async () => {
            User.findOne.mockResolvedValue({
                _id: '65f000000000000000000010',
                nombre: 'Admin Isekai',
                email: 'admin@isekai.com',
                password: '$2a$10$hashedPasswordMock',
                rol: 'admin'
            });
            bcrypt.compare.mockResolvedValue(true);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@isekai.com',
                    password: 'Admin1234!'
                });

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.usuario.rol).toBe('admin');

            // Verifica que el token emitido contiene claims válidos firmados con JWT_SECRET
            const decoded = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
            expect(decoded.rol).toBe('admin');
            expect(decoded.email).toBe('admin@isekai.com');
        });

        test('retorna 401 si el usuario no existe', async () => {
            User.findOne.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'noexiste@isekai.com',
                    password: 'Password123'
                });

            expect(res.status).toBe(401);
            expect(res.body.ok).toBe(false);
        });

        test('retorna 401 si la contraseña no coincide', async () => {
            User.findOne.mockResolvedValue({
                _id: '65f000000000000000000010',
                nombre: 'Admin Isekai',
                email: 'admin@isekai.com',
                password: '$2a$10$hashedPasswordMock',
                rol: 'admin'
            });
            bcrypt.compare.mockResolvedValue(false);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@isekai.com',
                    password: 'WrongPassword'
                });

            expect(res.status).toBe(401);
            expect(res.body.ok).toBe(false);
        });

        test('retorna 400 cuando faltan campos obligatorios', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'correo-invalido' });

            expect(res.status).toBe(400);
            expect(res.body.ok).toBe(false);
        });
    });

    describe('Sesión protegida (/api/auth/me y /api/auth/logout)', () => {
        test('retorna 401 en /api/auth/me sin token Bearer', async () => {
            const res = await request(app).get('/api/auth/me');

            expect(res.status).toBe(401);
            expect(res.body.ok).toBe(false);
        });

        test('retorna 200 en /api/auth/me y /api/auth/logout con token válido', async () => {
            const token = jwt.sign(
                { id: '65f000000000000000000010', nombre: 'Admin Isekai', email: 'admin@isekai.com', rol: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(meRes.status).toBe(200);
            expect(meRes.body.data.rol).toBe('admin');

            const logoutRes = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`);
            expect(logoutRes.status).toBe(200);
            expect(logoutRes.body.ok).toBe(true);
        });
    });
});
