// ===== Authentication & Encryption Session Manager =====

let passwordModalMode = 'setup'; // 'setup' | 'change'

/**
 * Verifica el estado de autenticación y seguridad al cargar la app
 */
function checkAuth() {
    const saved = localStorage.getItem('pedagogicalData');

    if (!saved) {
        // No hay datos guardados previamente: mostrar pantalla de bienvenida / login
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').classList.remove('active');
        return;
    }

    if (isEncryptedPayload(saved)) {
        // Datos cifrados con Web Crypto: solicitar contraseña para descifrar
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').classList.remove('active');
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) passwordInput.focus();
    } else {
        // Migración de datos en texto plano heredados
        try {
            const parsed = JSON.parse(saved);
            if (parsed && (parsed.password || Array.isArray(parsed.groups))) {
                document.getElementById('loginScreen').style.display = 'flex';
                document.getElementById('appContainer').classList.remove('active');
            } else {
                document.getElementById('loginScreen').style.display = 'flex';
            }
        } catch (e) {
            document.getElementById('loginScreen').style.display = 'flex';
        }
    }
}

/**
 * Abre el modal para establecer o cambiar la contraseña maestra
 */
function openSetPasswordModal(mode = 'setup') {
    passwordModalMode = mode;
    const modal = document.getElementById('setPasswordModal');
    const title = document.getElementById('setPasswordModalTitle');
    const desc = document.getElementById('setPasswordModalDesc');
    const currentGroup = document.getElementById('currentPasswordGroup');
    const errorDiv = document.getElementById('setPasswordError');

    if (!modal) return;

    if (errorDiv) errorDiv.style.display = 'none';
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';

    if (mode === 'change') {
        title.textContent = '🔐 Cambiar Contraseña Maestra';
        desc.innerHTML = 'Ingresa tu contraseña actual y define una nueva. Tus datos se <strong>re-cifrarán inmediatamente</strong> con la nueva clave.';
        if (currentGroup) {
            currentGroup.style.display = 'block';
            document.getElementById('currentPasswordInput').value = '';
            document.getElementById('currentPasswordInput').required = true;
        }
    } else {
        title.textContent = '🔐 Establecer Contraseña Maestra';
        desc.innerHTML = 'Esta contraseña protegerá y cifrará los datos de tus grupos, sociogramas y bitácoras usando <strong>AES-GCM 256 bits</strong>.';
        if (currentGroup) {
            currentGroup.style.display = 'none';
            document.getElementById('currentPasswordInput').required = false;
        }
    }

    modal.classList.add('active');
    setTimeout(() => {
        if (mode === 'change' && currentGroup) {
            document.getElementById('currentPasswordInput').focus();
        } else {
            document.getElementById('newPasswordInput').focus();
        }
    }, 50);
}

/**
 * Cierra el modal de contraseña
 */
function closeSetPasswordModal() {
    const modal = document.getElementById('setPasswordModal');
    if (modal) modal.classList.remove('active');
}

/**
 * Procesa el formulario de establecimiento/cambio de contraseña
 */
async function handleSetPasswordSubmit(e) {
    if (e) e.preventDefault();

    const errorDiv = document.getElementById('setPasswordError');
    const newPass = document.getElementById('newPasswordInput').value;
    const confirmPass = document.getElementById('confirmPasswordInput').value;

    if (!newPass || newPass.length < 4) {
        showSetPasswordError('La contraseña debe tener al menos 4 caracteres.');
        return;
    }

    if (newPass !== confirmPass) {
        showSetPasswordError('Las contraseñas no coinciden. Verifícalas.');
        return;
    }

    if (passwordModalMode === 'change') {
        const currentPass = document.getElementById('currentPasswordInput').value;
        if (currentPass !== activeSessionPassword) {
            showSetPasswordError('La contraseña actual es incorrecta.');
            return;
        }
    }

    // Establecer nueva contraseña activa y re-cifrar datos
    activeSessionPassword = newPass;

    appData = normalizeAppData(appData);
    delete appData.password; // Asegurarse de que nunca exista en texto plano dentro de appData

    try {
        await saveData();
        closeSetPasswordModal();
        alert('Contraseña guardada con éxito. Tus datos están cifrados con AES-GCM de 256 bits.');

        // Si estábamos en la pantalla de login, ingresar directamente
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && loginScreen.style.display !== 'none') {
            loginScreen.style.display = 'none';
            document.getElementById('appContainer').classList.add('active');
            showView('viewSchools');
            renderSchools();
        }
    } catch (err) {
        console.error('Error al cifrar y guardar:', err);
        showSetPasswordError('Error al cifrar los datos: ' + err.message);
    }
}

function showSetPasswordError(msg) {
    const errorDiv = document.getElementById('setPasswordError');
    if (errorDiv) {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
    }
}

/**
 * Intenta descifrar e iniciar sesión con la contraseña provista
 */
async function login(password) {
    const loginError = document.getElementById('loginError');
    if (loginError) loginError.style.display = 'none';

    if (!password) {
        showError('Por favor, ingresa tu contraseña.');
        return;
    }

    const saved = localStorage.getItem('pedagogicalData');

    // 1. Si no hay datos previos, inicializar base de datos cifrada con esta contraseña
    if (!saved) {
        activeSessionPassword = password;
        appData = { schools: [], unassignedGroups: [], deletedItems: [] };
        await saveData();
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').classList.add('active');
        showView('viewSchools');
        renderSchools();
        updateWindowTitle();
        return;
    }

    // 2. Si los datos están cifrados con Web Crypto
    if (isEncryptedPayload(saved)) {
        try {
            const decrypted = await decryptData(saved, password);
            if (decrypted && typeof decrypted === 'object') {
                appData = normalizeAppData(decrypted);
                delete appData.password;
                activeSessionPassword = password;
                hasUnsavedChanges = false;

                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('appContainer').classList.add('active');
                showView('viewSchools');
                renderSchools();
                updateWindowTitle();
                return;
            } else {
                throw new Error('Estructura de datos inválida');
            }
        } catch (err) {
            console.warn('Fallo de descifrado (clave incorrecta o auth tag inválido):', err);
            showError('Contraseña incorrecta. No se pudo descifrar la información.');
            return;
        }
    }

    // 3. Migración transparente de datos antiguos en texto plano
    try {
        const parsed = JSON.parse(saved);
        if (parsed.password && parsed.password !== password) {
            showError('Contraseña incorrecta.');
            return;
        }

        // Contraseña coincide con la versión antigua: migrar a AES-GCM
        appData = normalizeAppData(parsed);
        delete appData.password;
        activeSessionPassword = password;
        await saveData(); // Re-guarda automáticamente cifrado con AES-GCM

        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').classList.add('active');
        showView('viewSchools');
        renderSchools();
        updateWindowTitle();
        console.log('Datos escolares migrados exitosamente a AES-GCM 256 bits.');
    } catch (e) {
        showError('Error al leer los datos almacenados.');
    }
}

/**
 * Cierra la sesión y destruye la clave criptográfica en memoria
 */
function logout() {
    activeSessionPassword = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').classList.remove('active');
    const passInput = document.getElementById('passwordInput');
    if (passInput) passInput.value = '';
}

/**
 * Muestra mensaje de error en la pantalla de login
 */
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3500);
    }
}
