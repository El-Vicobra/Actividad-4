const API_AUTH = '/api/auth';
const API_PRODUCTOS = '/api/productos';

let productosCache = [];

const dom = {
    authStatus: document.getElementById('authStatus'),
    globalAlert: document.getElementById('globalAlert'),
    authSection: document.getElementById('authSection'),
    tabLogin: document.getElementById('tabLogin'),
    tabRegister: document.getElementById('tabRegister'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    authFeedback: document.getElementById('authFeedback'),
    appContent: document.getElementById('appContent'),
    adminPanel: document.getElementById('adminPanel'),
    listContainer: document.getElementById('listContainer'),
    productForm: document.getElementById('productForm'),
    formTitle: document.getElementById('formTitle'),
    btnGuardar: document.getElementById('btnGuardar'),
    btnCancelar: document.getElementById('btnCancelar'),
    productList: document.getElementById('productList'),
    productCount: document.getElementById('productCount'),
    searchInput: document.getElementById('searchInput'),
    btnRefresh: document.getElementById('btnRefresh')
};

// Lectura y limpieza centralizada de la sesión en localStorage
function getSession() {
    return {
        token: localStorage.getItem('token'),
        nombre: localStorage.getItem('nombre'),
        rol: localStorage.getItem('rol')
    };
}

function saveSession({ token, usuario }) {
    localStorage.setItem('token', token);
    localStorage.setItem('nombre', usuario.nombre);
    localStorage.setItem('rol', usuario.rol);
}

function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    localStorage.removeItem('rol');
    productosCache = [];
}

// Construye headers autenticados con JWT en esquema Bearer
function getAuthHeaders(includeJson = false) {
    const { token } = getSession();
    const headers = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

// Escapa texto antes de inyectarlo en plantillas HTML para prevenir XSS
function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Extrae mensajes de error detallados incluyendo errores de express-validator
function extractErrorMessage(payload, fallback) {
    if (payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
        return payload.errors.map((e) => e.mensaje).join(' ');
    }
    return (payload && payload.message) || fallback;
}

function showGlobalAlert(message, type = 'info') {
    const styles = {
        success: 'bg-emerald-950/70 border-emerald-700 text-emerald-200',
        error: 'bg-rose-950/70 border-rose-700 text-rose-200',
        info: 'bg-sky-950/70 border-sky-700 text-sky-200'
    };

    dom.globalAlert.className = `mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${styles[type] || styles.info}`;
    dom.globalAlert.textContent = message;
    dom.globalAlert.classList.remove('hidden');

    clearTimeout(showGlobalAlert.timer);
    showGlobalAlert.timer = setTimeout(() => {
        dom.globalAlert.classList.add('hidden');
    }, 4500);
}

function showAuthFeedback(message, isError = true) {
    dom.authFeedback.textContent = message;
    dom.authFeedback.className = isError
        ? 'text-sm mt-4 text-center rounded-lg px-3 py-2 bg-rose-950/70 text-rose-300 border border-rose-800'
        : 'text-sm mt-4 text-center rounded-lg px-3 py-2 bg-emerald-950/70 text-emerald-300 border border-emerald-800';
    dom.authFeedback.classList.remove('hidden');
}

function hideAuthFeedback() {
    dom.authFeedback.classList.add('hidden');
    dom.authFeedback.textContent = '';
}

function switchAuthTab(tab) {
    hideAuthFeedback();
    if (tab === 'login') {
        dom.loginForm.classList.remove('hidden');
        dom.registerForm.classList.add('hidden');
        dom.tabLogin.className = 'tab-btn tab-btn--active-login pb-3 text-sm font-semibold transition';
        dom.tabRegister.className = 'tab-btn pb-3 text-sm font-semibold text-slate-400 hover:text-slate-200 transition';
    } else {
        dom.loginForm.classList.add('hidden');
        dom.registerForm.classList.remove('hidden');
        dom.tabRegister.className = 'tab-btn tab-btn--active-register pb-3 text-sm font-semibold transition';
        dom.tabLogin.className = 'tab-btn pb-3 text-sm font-semibold text-slate-400 hover:text-slate-200 transition';
    }
}

// Sincroniza visibilidad de secciones y acciones según autenticación y rol (RBAC)
function updateUIState() {
    const { token, nombre, rol } = getSession();

    if (!token) {
        dom.authSection.classList.remove('hidden');
        dom.appContent.classList.add('hidden');
        dom.adminPanel.classList.add('hidden');
        dom.authStatus.innerHTML = '<span class="text-slate-500">Sin sesión activa</span>';
        resetProductForm();
        return;
    }

    dom.authSection.classList.add('hidden');
    dom.appContent.classList.remove('hidden');

    const badgeClass = rol === 'admin'
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : 'bg-sky-500/15 text-sky-300 border-sky-500/30';

    dom.authStatus.innerHTML = `
        <span class="text-slate-300">
            Hola, <strong class="text-slate-100">${escapeHtml(nombre)}</strong>
        </span>
        <span class="text-xs uppercase px-2 py-0.5 rounded border ${badgeClass}">${escapeHtml(rol)}</span>
        <button type="button" id="btnLogout" class="bg-rose-600 hover:bg-rose-500 text-xs font-medium px-3 py-1.5 rounded-lg transition">
            Cerrar sesión
        </button>
    `;

    document.getElementById('btnLogout').addEventListener('click', handleLogout);

    if (rol === 'admin') {
        dom.adminPanel.classList.remove('hidden');
        dom.listContainer.className = 'lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl';
    } else {
        dom.adminPanel.classList.add('hidden');
        dom.listContainer.className = 'lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl';
    }
}

// Manejo centralizado de respuestas 401 para expiración o revocación del token
function handleUnauthorized() {
    clearSession();
    updateUIState();
    showAuthFeedback('Tu sesión expiró o no es válida. Inicia sesión nuevamente.', true);
}

async function handleRegister(event) {
    event.preventDefault();
    hideAuthFeedback();

    const payload = {
        nombre: document.getElementById('regNombre').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value
    };

    try {
        const res = await fetch(`${API_AUTH}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            showAuthFeedback(extractErrorMessage(data, 'No se pudo completar el registro.'), true);
            return;
        }

        dom.registerForm.reset();
        switchAuthTab('login');
        showAuthFeedback('Cuenta creada con éxito. Ahora inicia sesión.', false);
    } catch (error) {
        showAuthFeedback('Error de conexión con el servidor.', true);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    hideAuthFeedback();

    const payload = {
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
    };

    try {
        const res = await fetch(`${API_AUTH}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            showAuthFeedback(extractErrorMessage(data, 'Credenciales inválidas.'), true);
            return;
        }

        saveSession(data.data);
        dom.loginForm.reset();
        updateUIState();
        showGlobalAlert(`Bienvenido, ${data.data.usuario.nombre}.`, 'success');
        await loadProducts();
    } catch (error) {
        showAuthFeedback('Error de conexión con el servidor.', true);
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_AUTH}/logout`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
    } catch (error) {
        // El cierre de sesión stateless procede limpiando el token local
    } finally {
        clearSession();
        updateUIState();
        showGlobalAlert('Sesión cerrada correctamente.', 'info');
    }
}

async function loadProducts() {
    dom.productList.innerHTML = '<p class="text-slate-500 text-sm">Cargando inventario...</p>';

    try {
        const res = await fetch(API_PRODUCTOS, {
            headers: getAuthHeaders()
        });

        if (res.status === 401) {
            handleUnauthorized();
            return;
        }

        const payload = await res.json();
        if (!res.ok) {
            showGlobalAlert(extractErrorMessage(payload, 'Error al consultar el inventario.'), 'error');
            return;
        }

        productosCache = payload.data || [];
        renderProducts(productosCache);
    } catch (error) {
        dom.productList.innerHTML = '<p class="text-rose-400 text-sm">No se pudo conectar con la API.</p>';
    }
}

function renderProducts(lista) {
    const { rol } = getSession();
    const termino = dom.searchInput.value.trim().toLowerCase();

    const filtrados = termino
        ? lista.filter((p) =>
            p.nombre.toLowerCase().includes(termino) ||
            p.descripcion.toLowerCase().includes(termino)
        )
        : lista;

    dom.productCount.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'artículo' : 'artículos'}`;

    if (filtrados.length === 0) {
        dom.productList.innerHTML = '<p class="text-slate-500 text-sm py-4 text-center">No se encontraron productos.</p>';
        return;
    }

    dom.productList.innerHTML = filtrados
        .map((producto) => {
            const precioFormateado = Number(producto.precio).toLocaleString('es-MX', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            const accionesAdmin = rol === 'admin'
                ? `
                    <div class="flex items-center gap-2 shrink-0">
                        <button type="button" data-action="edit" data-id="${escapeHtml(producto._id)}"
                            class="bg-amber-600 hover:bg-amber-500 text-xs font-medium px-3 py-1.5 rounded-lg transition">
                            Editar
                        </button>
                        <button type="button" data-action="delete" data-id="${escapeHtml(producto._id)}"
                            class="bg-rose-600 hover:bg-rose-500 text-xs font-medium px-3 py-1.5 rounded-lg transition">
                            Eliminar
                        </button>
                    </div>
                `
                : '';

            return `
                <article class="product-card bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="min-w-0">
                        <h3 class="font-semibold text-amber-300 truncate">${escapeHtml(producto.nombre)}</h3>
                        <p class="text-sm text-slate-400 mt-1 break-words">${escapeHtml(producto.descripcion)}</p>
                        <div class="flex flex-wrap items-center gap-3 mt-2 text-xs">
                            <span class="text-emerald-400 font-semibold">$${precioFormateado} MXN</span>
                            <span class="text-slate-500">|</span>
                            <span class="text-slate-300">Stock: <strong>${escapeHtml(producto.stock)}</strong></span>
                        </div>
                    </div>
                    ${accionesAdmin}
                </article>
            `;
        })
        .join('');
}

function startEditProduct(id) {
    const producto = productosCache.find((item) => item._id === id);
    if (!producto) return;

    document.getElementById('editId').value = producto._id;
    document.getElementById('nombre').value = producto.nombre;
    document.getElementById('descripcion').value = producto.descripcion;
    document.getElementById('precio').value = producto.precio;
    document.getElementById('stock').value = producto.stock;

    dom.formTitle.textContent = 'Editar artículo';
    dom.btnGuardar.textContent = 'Actualizar';
    dom.btnGuardar.className = 'flex-1 bg-amber-600 hover:bg-amber-500 font-semibold py-2 rounded-lg text-sm transition';
    dom.btnCancelar.classList.remove('hidden');
}

function resetProductForm() {
    dom.productForm.reset();
    document.getElementById('editId').value = '';
    document.getElementById('stock').value = '1';
    dom.formTitle.textContent = 'Nuevo artículo';
    dom.btnGuardar.textContent = 'Guardar';
    dom.btnGuardar.className = 'flex-1 bg-emerald-600 hover:bg-emerald-500 font-semibold py-2 rounded-lg text-sm transition';
    dom.btnCancelar.classList.add('hidden');
}

async function handleProductSubmit(event) {
    event.preventDefault();

    const id = document.getElementById('editId').value;
    const body = {
        nombre: document.getElementById('nombre').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        precio: Number(document.getElementById('precio').value),
        stock: Number(document.getElementById('stock').value)
    };

    const url = id ? `${API_PRODUCTOS}/${id}` : API_PRODUCTOS;
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: getAuthHeaders(true),
            body: JSON.stringify(body)
        });

        if (res.status === 401) {
            handleUnauthorized();
            return;
        }

        const payload = await res.json();
        if (!res.ok) {
            showGlobalAlert(extractErrorMessage(payload, 'No se pudo guardar el producto.'), 'error');
            return;
        }

        resetProductForm();
        showGlobalAlert(payload.message || 'Operación completada.', 'success');
        await loadProducts();
    } catch (error) {
        showGlobalAlert('Error de conexión al guardar el producto.', 'error');
    }
}

async function handleDeleteProduct(id) {
    const producto = productosCache.find((item) => item._id === id);
    const etiqueta = producto ? `"${producto.nombre}"` : 'este producto';

    if (!confirm(`¿Seguro que deseas eliminar ${etiqueta}?`)) return;

    try {
        const res = await fetch(`${API_PRODUCTOS}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (res.status === 401) {
            handleUnauthorized();
            return;
        }

        const payload = await res.json();
        if (!res.ok) {
            showGlobalAlert(extractErrorMessage(payload, 'No se pudo eliminar el producto.'), 'error');
            return;
        }

        if (document.getElementById('editId').value === id) {
            resetProductForm();
        }

        showGlobalAlert(payload.message || 'Producto eliminado.', 'success');
        await loadProducts();
    } catch (error) {
        showGlobalAlert('Error de conexión al eliminar el producto.', 'error');
    }
}

// Delegación de eventos para botones dinámicos de editar y eliminar
dom.productList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const { action, id } = button.dataset;
    if (action === 'edit') startEditProduct(id);
    if (action === 'delete') handleDeleteProduct(id);
});

dom.tabLogin.addEventListener('click', () => switchAuthTab('login'));
dom.tabRegister.addEventListener('click', () => switchAuthTab('register'));
dom.loginForm.addEventListener('submit', handleLogin);
dom.registerForm.addEventListener('submit', handleRegister);
dom.productForm.addEventListener('submit', handleProductSubmit);
dom.btnCancelar.addEventListener('click', resetProductForm);
dom.searchInput.addEventListener('input', () => renderProducts(productosCache));
dom.btnRefresh.addEventListener('click', loadProducts);

// Valida la sesión almacenada al cargar la vista contra /api/auth/me
async function initApp() {
    updateUIState();
    const { token } = getSession();
    if (!token) return;

    try {
        const res = await fetch(`${API_AUTH}/me`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            handleUnauthorized();
            return;
        }

        await loadProducts();
    } catch (error) {
        showGlobalAlert('No se pudo verificar la sesión con el servidor.', 'error');
    }
}

initApp();
