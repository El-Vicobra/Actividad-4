# The Isekai Items — Gestión de Productos Full Stack

Aplicación web Full Stack para la gestión de inventario de artículos de anime/isekai construida con **Node.js**, **Express**, **MongoDB Atlas (Mongoose)**, **JWT**, **bcryptjs**, **express-validator** y **Tailwind CSS**. Incluye control de acceso basado en roles (RBAC), vista estática integrada, pruebas unitarias con **Jest + Supertest** (mocks) y pipeline de **CI/CD** con GitHub Actions y despliegue en **Vercel**.

---

## Stack tecnológico

- **Backend:** Node.js, Express 5, Mongoose 9, CORS, dotenv
- **Seguridad y validación:** `bcryptjs` (hash de contraseñas), `jsonwebtoken` (JWT Bearer), `express-validator`
- **Base de datos:** MongoDB Atlas
- **Frontend:** HTML5, JavaScript (Fetch API con rutas relativas), Tailwind CSS (CDN) y CSS personalizado
- **Testing y CI/CD:** Jest, Supertest, Nodemon, GitHub Actions, Vercel

---

## Estructura del proyecto

```text
├── .github/
│   └── workflows/
│       └── ci.yml                  # Pipeline CI/CD (pruebas Jest + despliegue Vercel)
├── public/
│   ├── index.html                  # Interfaz de Login, Registro y CRUD por rol
│   ├── styles.css                  # Estilos complementarios
│   └── app.js                      # Cliente Fetch (/api/...), manejo de JWT y DOM
├── scripts/
│   └── crearAdmin.js               # CLI para crear usuarios administradores en Atlas
├── src/
│   ├── config/
│   │   └── db.js                   # Conexión Mongoose cacheada para entornos serverless
│   ├── controllers/
│   │   ├── authController.js       # register, login, logout, perfil
│   │   └── productController.js    # CRUD completo de productos
│   ├── middlewares/
│   │   ├── authMiddleware.js       # verificarToken (401) y soloAdmin (403)
│   │   ├── validateRequest.js      # Respuesta HTTP 400 para express-validator
│   │   └── errorHandler.js         # Manejo global de errores (CastError, duplicados, 500)
│   ├── models/
│   │   ├── User.js                 # Colección usuarios (nombre, email, password, rol)
│   │   └── Product.js              # Colección productos (con referencia creadoPor -> User)
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth/*
│   │   └── productRoutes.js        # /api/productos/*
│   ├── app.js                      # Instancia Express exportable (Jest y Vercel)
│   └── server.js                   # Arranque local del servidor HTTP
├── tests/
│   ├── auth.test.js                # Pruebas unitarias de autenticación con mocks
│   └── products.test.js            # Pruebas unitarias CRUD, RBAC y validaciones con mocks
├── .env.example
├── .gitignore
├── vercel.json
├── package.json
└── README.md
```

---

## Modelo de datos (Entidad-Relación)

Relación **1:N** entre `usuarios` y `productos` mediante el campo `creadoPor` (`ObjectId` con referencia a `User`):

- **`usuarios` (`User`):** `_id`, `nombre`, `email` (único), `password` (hash bcrypt), `rol` (`cliente` | `admin`), `createdAt`, `updatedAt`.
- **`productos` (`Product`):** `_id`, `nombre`, `descripcion`, `precio`, `stock`, `creadoPor` (`ObjectId` → `usuarios._id`), `createdAt`, `updatedAt`.

---

## Instalación y ejecución local

### 1. Clonar e instalar dependencias

```bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_PROYECTO>
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` como `.env` y completa tus credenciales:

```env
PORT=3000
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<nombre_bd>?retryWrites=true&w=majority
JWT_SECRET=tu_clave_secreta_segura
```

> En MongoDB Atlas → **Network Access**, habilita `0.0.0.0/0` para permitir conexiones desde despliegues en Vercel.

### 3. Crear una cuenta administradora en MongoDB Atlas

El registro público asigna siempre el rol `cliente`. Para provisionar una cuenta `admin`, ejecuta:

```bash
node scripts/crearAdmin.js "Admin Isekai" "admin@isekai.com" "TuPasswordSeguro"
```

### 4. Iniciar el servidor

```bash
# Modo producción local
npm start

# Modo desarrollo con recarga automática
npm run dev
```

Abre `http://localhost:3000` en tu navegador.

---

## Documentación de la API

Todas las respuestas siguen el formato JSON `{ ok, message, data }` (y `errors` en errores de validación `400`).

### Salud del servicio

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Público | Verifica que la API esté activa. |

### Autenticación (`/api/auth`)

| Método | Ruta | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Público | Registra un usuario nuevo con rol `cliente`. | `201`, `400`, `500` |
| `POST` | `/api/auth/login` | Público | Valida credenciales y retorna JWT Bearer + rol. | `200`, `400`, `401`, `500` |
| `GET` | `/api/auth/me` | Token válido | Retorna los datos de la sesión activa (`req.user`). | `200`, `401` |
| `POST` | `/api/auth/logout` | Token válido | Confirma el cierre de sesión stateless. | `200`, `401` |

Ejemplo de `POST /api/auth/login`:

```json
{
  "email": "admin@isekai.com",
  "password": "TuPasswordSeguro"
}
```

### Productos (`/api/productos`)

Todas las rutas requieren cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Acceso | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/productos` | `cliente` / `admin` | Lista todos los productos ordenados por fecha. | `200`, `401`, `500` |
| `GET` | `/api/productos/:id` | `cliente` / `admin` | Consulta un producto por su ObjectId. | `200`, `400`, `401`, `404`, `500` |
| `POST` | `/api/productos` | Solo `admin` | Crea un nuevo producto validando campos. | `201`, `400`, `401`, `403`, `500` |
| `PUT` | `/api/productos/:id` | Solo `admin` | Actualiza campos permitidos de un producto. | `200`, `400`, `401`, `403`, `404`, `500` |
| `DELETE` | `/api/productos/:id` | Solo `admin` | Elimina un producto por su ObjectId. | `200`, `400`, `401`, `403`, `404`, `500` |

Ejemplo de `POST /api/productos`:

```json
{
  "nombre": "Espada Sagrada Excalibur",
  "descripcion": "Hoja forjada con mithril de alto daño elemental",
  "precio": 1499.5,
  "stock": 3
}
```

---

## Pruebas unitarias (Jest + Supertest)

La suite utiliza mocks de los modelos Mongoose y `bcryptjs`, por lo que se ejecuta sin conexión a MongoDB Atlas:

```bash
npm test
```

Cobertura funcional incluida en `tests/auth.test.js` y `tests/products.test.js`:
- Registro válido, correo duplicado, bloqueo de escalación de rol y validaciones `400`.
- Login válido con verificación de firma JWT, credenciales incorrectas `401` y errores de BD `500`.
- Protección de rutas sin token o con token expirado (`401`) y bloqueo RBAC para rol `cliente` (`403`).
- CRUD completo de productos, validación de `ObjectId`, prevención de *mass assignment* y respuestas `404`/`500`.

---

## Despliegue en Vercel y CI/CD

1. Sube el repositorio a GitHub (asegurándote de que `.env` y `node_modules/` estén excluidos por `.gitignore`).
2. En **Vercel**, importa el repositorio de GitHub y configura las variables de entorno en *Settings → Environment Variables*:
   - `MONGO_URI`
   - `JWT_SECRET`
3. Cada `push` a `main` dispara automáticamente el flujo de **GitHub Actions** (`.github/workflows/ci.yml`), que instala dependencias y ejecuta `npm test` antes de validar el despliegue.
4. *(Opcional)* Si deseas disparar el despliegue directo desde GitHub Actions con Vercel CLI, agrega los secretos `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` en *GitHub → Settings → Secrets and variables → Actions*.
