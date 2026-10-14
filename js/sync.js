// Cloud Synchronization Module (Firebase Firestore + Auth)

let currentFirebaseUser = null;
let cloudSyncStatus = 'disconnected'; // 'synced' | 'syncing' | 'offline' | 'disconnected'
let isApplyingCloudUpdate = false;
let syncDebounceTimer = null;
let cloudUnsubscribeListener = null;
let lastCloudSyncTime = null;

/**
 * Initialize Cloud Synchronization
 */
function initSyncModule() {
    if (typeof initFirebase === 'function') {
        const ok = initFirebase();
        if (!ok) return;
    }

    if (!firebaseAuthInstance) return;

    // Listen to network status changes
    window.addEventListener('online', () => {
        if (currentFirebaseUser) {
            setCloudStatus('syncing');
            syncToCloudDebounced(100);
        }
    });

    window.addEventListener('offline', () => {
        if (currentFirebaseUser) {
            setCloudStatus('offline');
        }
    });

    // Listen to Firebase Auth state
    firebaseAuthInstance.onAuthStateChanged(async (user) => {
        currentFirebaseUser = user;

        if (user) {
            console.log("Firebase Auth: Usuario conectado:", user.email);
            setCloudStatus(navigator.onLine ? 'synced' : 'offline');
            updateCloudUI();

            // Auto-advance from login screen if user is authenticated with Google/Firebase
            const loginScreen = document.getElementById('loginScreen');
            const appContainer = document.getElementById('appContainer');
            if (loginScreen && loginScreen.style.display !== 'none') {
                loginScreen.style.display = 'none';
                if (appContainer) appContainer.classList.add('active');
            }

            // Start listening to real-time changes
            listenToCloudData(user.uid);
        } else {
            console.log("Firebase Auth: Sin usuario conectado.");
            if (cloudUnsubscribeListener) {
                cloudUnsubscribeListener();
                cloudUnsubscribeListener = null;
            }
            setCloudStatus('disconnected');
            updateCloudUI();
        }
    });
}

/**
 * Real-time listener for Firestore document
 */
function listenToCloudData(userId) {
    if (!firestoreDb || !userId) return;

    if (cloudUnsubscribeListener) {
        cloudUnsubscribeListener();
    }

    const docRef = firestoreDb.collection('users').doc(userId);

    cloudUnsubscribeListener = docRef.onSnapshot((doc) => {
        if (!doc.exists) {
            // First time on this cloud account: upload local data if present
            if (appData && (appData.schools?.length > 0 || appData.unassignedGroups?.length > 0)) {
                console.log("Inicializando base de datos en la nube con los datos locales...");
                syncToCloudNow();
            }
            return;
        }

        // If changes were made locally and are waiting to be sent, don't overwrite with local snapshot
        if (doc.metadata && doc.metadata.hasPendingWrites) {
            return;
        }

        const cloudPayload = doc.data();
        if (!cloudPayload || !cloudPayload.data) return;

        // Remote update received!
        if (!isApplyingCloudUpdate) {
            isApplyingCloudUpdate = true;
            console.log("Nube: Recibida actualización desde otro dispositivo.");
            
            try {
                // Apply cloud data to local appData
                appData = normalizeAppData(cloudPayload.data);
                
                // Keep local backup up to date
                localStorage.setItem('pedagogicalData', JSON.stringify(appData));
                hasUnsavedChanges = false;
                lastCloudSyncTime = new Date();
                setCloudStatus('synced');

                // Re-render current active view
                refreshCurrentView();
            } catch (err) {
                console.error("Error al aplicar datos de la nube:", err);
            } finally {
                isApplyingCloudUpdate = false;
            }
        }
    }, (error) => {
        console.warn("Error en el listener de Firestore:", error);
        if (!navigator.onLine) {
            setCloudStatus('offline');
        }
    });
}

/**
 * Trigger debounced cloud synchronization
 */
function syncToCloudDebounced(delay = 1200) {
    if (!currentFirebaseUser || !firestoreDb || isApplyingCloudUpdate) return;

    if (!navigator.onLine) {
        setCloudStatus('offline');
        return;
    }

    setCloudStatus('syncing');

    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
    }

    syncDebounceTimer = setTimeout(() => {
        syncToCloudNow();
    }, delay);
}

/**
 * Send current data immediately to Firestore
 */
async function syncToCloudNow() {
    if (!currentFirebaseUser || !firestoreDb) return;

    try {
        setCloudStatus('syncing');
        const docRef = firestoreDb.collection('users').doc(currentFirebaseUser.uid);
        
        await docRef.set({
            data: appData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            userEmail: currentFirebaseUser.email || '',
            deviceInfo: navigator.userAgent
        }, { merge: true });

        lastCloudSyncTime = new Date();
        setCloudStatus('synced');
        console.log("Nube: Sincronización exitosa ✓");
    } catch (err) {
        console.error("Error al sincronizar con la nube:", err);
        setCloudStatus(navigator.onLine ? 'synced' : 'offline');
    }
}

/**
 * Update cloud status state & UI
 */
function setCloudStatus(status) {
    cloudSyncStatus = status;
    updateCloudUI();
}

/**
 * Re-render the currently active view to reflect synchronized data
 */
function refreshCurrentView() {
    const viewSchools = document.getElementById('viewSchools');
    const viewSchoolDetail = document.getElementById('viewSchoolDetail');
    const viewGroupDetail = document.getElementById('viewGroupDetail');

    if (viewGroupDetail && viewGroupDetail.classList.contains('active') && typeof currentGroupId !== 'undefined' && currentGroupId) {
        showGroupDetail(currentGroupId);
    } else if (viewSchoolDetail && viewSchoolDetail.classList.contains('active') && typeof currentSchoolId !== 'undefined' && currentSchoolId) {
        showSchoolDetail(currentSchoolId);
    } else if (viewSchools && viewSchools.classList.contains('active')) {
        renderSchools();
    }
}

/**
 * Update the header Cloud Sync button & modal information
 */
function updateCloudUI() {
    const btn = document.getElementById('cloudSyncBtn');
    const icon = document.getElementById('cloudSyncIcon');
    const text = document.getElementById('cloudSyncText');

    if (!btn || !icon || !text) return;

    if (cloudSyncStatus === 'synced') {
        icon.textContent = '🟢';
        text.textContent = 'Sincronizado';
        btn.className = 'btn btn-small btn-secondary cloud-btn-synced';
        btn.title = `Sincronizado con la nube (${currentFirebaseUser?.email || ''})`;
    } else if (cloudSyncStatus === 'syncing') {
        icon.textContent = '🔄';
        text.textContent = 'Guardando...';
        btn.className = 'btn btn-small btn-secondary cloud-btn-syncing';
        btn.title = 'Sincronizando cambios en la nube...';
    } else if (cloudSyncStatus === 'offline') {
        icon.textContent = '📴';
        text.textContent = 'Sin conexión';
        btn.className = 'btn btn-small btn-secondary cloud-btn-offline';
        btn.title = 'Trabajando sin internet. Los cambios se guardaron localmente y se subirán al reconectar.';
    } else {
        // Disconnected
        icon.textContent = '☁️';
        text.textContent = 'Conectar Nube';
        btn.className = 'btn btn-small btn-secondary';
        btn.title = 'Inicia sesión para sincronizar tus dispositivos en tiempo real.';
    }
}

/**
 * Sign In with Google popup
 */
async function signInWithGoogle() {
    if (!firebaseAuthInstance) {
        alert("Firebase no está disponible.");
        return;
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await firebaseAuthInstance.signInWithPopup(provider);
        console.log("Sesión iniciada con Google:", result.user.email);
        closeCloudModal();
    } catch (error) {
        console.error("Error al iniciar sesión con Google:", error);
        if (error.code === 'auth/popup-blocked') {
            alert("El navegador bloqueó la ventana emergente de Google. Por favor permítela.");
        } else {
            alert("Error al conectar con Google: " + error.message);
        }
    }
}

/**
 * Sign In with Email & Password
 */
async function signInWithEmail(email, password) {
    if (!firebaseAuthInstance) return;
    try {
        await firebaseAuthInstance.signInWithEmailAndPassword(email.trim(), password);
        closeCloudModal();
    } catch (error) {
        alert("Error de acceso: " + error.message);
    }
}

/**
 * Register with Email & Password
 */
async function signUpWithEmail(email, password) {
    if (!firebaseAuthInstance) return;
    try {
        await firebaseAuthInstance.createUserWithEmailAndPassword(email.trim(), password);
        alert("¡Cuenta creada con éxito! Tus datos ahora se sincronizan en la nube.");
        closeCloudModal();
    } catch (error) {
        alert("Error al registrar cuenta: " + error.message);
    }
}

/**
 * Sign Out from Firebase
 */
async function signOutFromCloud() {
    if (!firebaseAuthInstance) return;
    if (confirm("¿Cerrar sesión en la nube? Tu dispositivo dejará de sincronizarse con otros hasta que vuelvas a ingresar.")) {
        await firebaseAuthInstance.signOut();
        currentFirebaseUser = null;
        setCloudStatus('disconnected');
        closeCloudModal();
    }
}

/**
 * Open Cloud Management Modal
 */
function openCloudModal() {
    let modal = document.getElementById('cloudSyncModal');
    if (!modal) {
        createCloudModalDOM();
        modal = document.getElementById('cloudSyncModal');
    }

    renderCloudModalContent();
    modal.classList.add('active');
}

/**
 * Close Cloud Management Modal
 */
function closeCloudModal() {
    const modal = document.getElementById('cloudSyncModal');
    if (modal) modal.classList.remove('active');
}

/**
 * Build Cloud Modal DOM element
 */
function createCloudModalDOM() {
    const div = document.createElement('div');
    div.id = 'cloudSyncModal';
    div.className = 'modal';
    div.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">☁️ Sincronización en la Nube</h3>
                <button type="button" class="close-modal" onclick="closeCloudModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">&times;</button>
            </div>
            <div class="modal-body" id="cloudModalBody" style="padding: 1.5rem 1rem;"></div>
        </div>
    `;
    document.body.appendChild(div);
}

/**
 * Render Content inside Cloud Modal based on auth state
 */
function renderCloudModalContent() {
    const body = document.getElementById('cloudModalBody');
    if (!body) return;

    if (currentFirebaseUser) {
        const timeStr = lastCloudSyncTime ? lastCloudSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recientemente';
        body.innerHTML = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 0.75rem auto;">
                    ${currentFirebaseUser.photoURL ? `<img src="${currentFirebaseUser.photoURL}" style="width: 100%; height: 100%; border-radius: 50%;">` : '👤'}
                </div>
                <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">${escapeHTML(currentFirebaseUser.displayName || 'Docente')}</h4>
                <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">${escapeHTML(currentFirebaseUser.email || '')}</p>
                <div style="margin-top: 0.75rem;">
                    <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.82rem; font-weight: 600; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">
                        ● Nube Activa y Sincronizada
                    </span>
                </div>
            </div>

            <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1.5rem; font-size: 0.88rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-secondary);">Última sincronización:</span>
                    <strong>${timeStr}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-secondary);">Soporte sin conexión:</span>
                    <strong style="color: #10b981;">Habilitado (Offline-First)</strong>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                <button type="button" class="btn btn-primary" onclick="syncToCloudNow(); closeCloudModal();" style="width: 100%;">
                    🔄 Forzar Sincronización Ahora
                </button>
                <button type="button" class="btn btn-secondary" onclick="exportData(); closeCloudModal();" style="width: 100%;">
                    💾 Descargar Copia de Respaldo JSON
                </button>
                <button type="button" class="btn btn-danger" onclick="signOutFromCloud();" style="width: 100%;">
                    🚪 Cerrar Sesión en este Dispositivo
                </button>
            </div>
        `;
    } else {
        body.innerHTML = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">☁️</span>
                <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">Conecta tus Dispositivos</h4>
                <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0.5rem 0 0 0;">
                    Inicia sesión para mantener tus grupos, listas y asistencias sincronizados al instante entre tu teléfono, tablet y computadora.
                </p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <button type="button" class="btn btn-primary" onclick="signInWithGoogle()" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; padding: 0.7rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
                    Continuar con Google
                </button>
            </div>

            <div style="text-align: center; margin: 1.25rem 0; position: relative;">
                <hr style="border: none; border-top: 1px solid var(--border); margin: 0;">
                <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--bg-secondary); padding: 0 0.5rem; font-size: 0.78rem; color: var(--text-tertiary);">o con tu correo</span>
            </div>

            <form onsubmit="event.preventDefault(); handleEmailAuthSubmit(this);">
                <div class="form-group" style="margin-bottom: 0.75rem;">
                    <label style="font-size: 0.85rem;">Correo Electrónico</label>
                    <input type="email" id="cloudEmailInput" required placeholder="tu@correo.com" style="width: 100%; padding: 0.5rem 0.65rem; font-size: 0.9rem;">
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="font-size: 0.85rem;">Contraseña</label>
                    <input type="password" id="cloudPasswordInput" required placeholder="••••••••" style="width: 100%; padding: 0.5rem 0.65rem; font-size: 0.9rem;">
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="submit" class="btn btn-secondary" style="flex: 1;" onclick="this.form.dataset.action='login'">Iniciar Sesión</button>
                    <button type="submit" class="btn btn-secondary" style="flex: 1;" onclick="this.form.dataset.action='register'">Registrarme</button>
                </div>
            </form>
        `;
    }
}

/**
 * Handle Email Login/Register form submit
 */
function handleEmailAuthSubmit(form) {
    const email = document.getElementById('cloudEmailInput').value;
    const pass = document.getElementById('cloudPasswordInput').value;
    const action = form.dataset.action;

    if (!email || !pass) return;

    if (action === 'register') {
        signUpWithEmail(email, pass);
    } else {
        signInWithEmail(email, pass);
    }
}
