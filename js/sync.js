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

    // Listen to network status changes: fetch latest cloud snapshot and smart-merge first!
    window.addEventListener('online', async () => {
        if (currentFirebaseUser && firestoreDb) {
            setCloudStatus('syncing');
            console.log("Nube: Conexión a internet reestablecida. Verificando y fusionando con la nube...");
            try {
                const docRef = firestoreDb.collection('users').doc(currentFirebaseUser.uid);
                const snap = await docRef.get();
                if (snap.exists) {
                    const cloudPayload = snap.data();
                    if (cloudPayload && cloudPayload.data && !isApplyingCloudUpdate) {
                        isApplyingCloudUpdate = true;
                        const normalizedCloud = normalizeAppData(cloudPayload.data);
                        const { mergedData, hasUnsyncedLocalChanges } = smartMergeAppData(appData, normalizedCloud);
                        appData = normalizeAppData(mergedData);
                        localStorage.setItem('pedagogicalData', JSON.stringify(appData));
                        isApplyingCloudUpdate = false;
                        refreshCurrentView();

                        if (hasUnsyncedLocalChanges) {
                            console.log("Nube: Sincronizando datos fusionados con la nube...");
                            await syncToCloudNow();
                        } else {
                            setCloudStatus('synced');
                        }
                    }
                } else {
                    syncToCloudDebounced(200);
                }
            } catch (e) {
                console.warn("Error al verificar nube al reconectar:", e);
                setCloudStatus('synced');
            }
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
 * Smart Two-Way Merge for Pedagogical AppData
 * Merges local and cloud copies without destructive overwrites.
 * Specifically designed so that attendance taken on a phone, observations,
 * and local offline edits to students or groups are all safely unified.
 */
function smartMergeAppData(local, cloud) {
    if (!cloud || (!cloud.schools?.length && !cloud.unassignedGroups?.length)) {
        return { mergedData: local, hasUnsyncedLocalChanges: true };
    }
    if (!local || (!local.schools?.length && !local.unassignedGroups?.length)) {
        return { mergedData: cloud, hasUnsyncedLocalChanges: false };
    }

    let hasUnsyncedLocalChanges = false;
    const merged = {
        schools: [],
        unassignedGroups: [],
        deletedItems: []
    };

    // 1. Merge Deleted Items (union of IDs to respect deletions)
    const deletedMap = new Map();
    (local.deletedItems || []).forEach(d => { if (d && d.id) deletedMap.set(d.id, d); });
    (cloud.deletedItems || []).forEach(d => { if (d && d.id) deletedMap.set(d.id, d); });
    merged.deletedItems = Array.from(deletedMap.values());
    const isDeleted = (id) => deletedMap.has(id);

    // 2. Helper to Merge Attendance Sessions
    function mergeAttendanceSessions(localAtt, cloudAtt) {
        const localList = Array.isArray(localAtt) ? localAtt : [];
        const cloudList = Array.isArray(cloudAtt) ? cloudAtt : [];
        const sessionsByDate = new Map();

        // Put cloud sessions first
        cloudList.forEach(cs => {
            if (cs && cs.date) {
                sessionsByDate.set(cs.date, {
                    id: cs.id || ('att_' + cs.date),
                    date: cs.date,
                    records: { ...(cs.records || {}) },
                    studentNotes: { ...(cs.studentNotes || {}) },
                    notes: cs.notes || ''
                });
            }
        });

        // Merge local sessions
        localList.forEach(ls => {
            if (!ls || !ls.date) return;
            if (sessionsByDate.has(ls.date)) {
                // Session exists in both: merge records and student notes!
                const existing = sessionsByDate.get(ls.date);
                let diffDetected = false;
                
                // Merge student attendance records (P, A, R, J)
                Object.entries(ls.records || {}).forEach(([stId, status]) => {
                    if (!existing.records[stId]) {
                        existing.records[stId] = status;
                        diffDetected = true;
                    }
                });

                // Merge student notes
                Object.entries(ls.studentNotes || {}).forEach(([stId, note]) => {
                    if (!existing.studentNotes[stId] && note) {
                        existing.studentNotes[stId] = note;
                        diffDetected = true;
                    }
                });

                // Notes: keep the most complete
                if (!existing.notes && ls.notes) {
                    existing.notes = ls.notes;
                    diffDetected = true;
                }

                if (diffDetected) hasUnsyncedLocalChanges = true;
            } else {
                // Session only exists in local! Keep it and mark for cloud upload
                sessionsByDate.set(ls.date, {
                    id: ls.id || ('att_' + ls.date),
                    date: ls.date,
                    records: { ...(ls.records || {}) },
                    studentNotes: { ...(ls.studentNotes || {}) },
                    notes: ls.notes || ''
                });
                hasUnsyncedLocalChanges = true;
            }
        });

        return Array.from(sessionsByDate.values()).sort((a, b) => b.date.localeCompare(a.date));
    }

    // 3. Helper to Merge Observations
    function mergeObservations(localObs, cloudObs) {
        const localList = Array.isArray(localObs) ? localObs : [];
        const cloudList = Array.isArray(cloudObs) ? cloudObs : [];
        const obsMap = new Map();

        cloudList.forEach(o => {
            if (o) {
                const key = o.id || `${o.date}_${(o.text || '').substring(0, 20)}`;
                obsMap.set(key, o);
            }
        });

        localList.forEach(o => {
            if (!o) return;
            const key = o.id || `${o.date}_${(o.text || '').substring(0, 20)}`;
            if (!obsMap.has(key)) {
                obsMap.set(key, o);
                hasUnsyncedLocalChanges = true;
            }
        });

        return Array.from(obsMap.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    // 4. Helper to Merge Students in a Group
    function mergeStudents(localStudents, cloudStudents) {
        const localList = (Array.isArray(localStudents) ? localStudents : []).filter(s => s && s.id && !isDeleted(s.id));
        const cloudList = (Array.isArray(cloudStudents) ? cloudStudents : []).filter(s => s && s.id && !isDeleted(s.id));
        const studentsMap = new Map();

        cloudList.forEach(cs => studentsMap.set(cs.id, { ...cs }));

        localList.forEach(ls => {
            if (!studentsMap.has(ls.id)) {
                studentsMap.set(ls.id, { ...ls });
                hasUnsyncedLocalChanges = true;
            } else {
                // Merge student details: preserve non-empty preferredName, VAK channels, and observations
                const cs = studentsMap.get(ls.id);
                const mergedObs = mergeObservations(ls.observations, cs.observations);
                
                const mergedPreferred = cs.preferredName || ls.preferredName || '';
                const mergedChannels = (cs.learningChannels && cs.learningChannels.length > 0)
                    ? cs.learningChannels
                    : (ls.learningChannels || []);

                studentsMap.set(ls.id, {
                    ...cs,
                    preferredName: mergedPreferred,
                    learningChannels: mergedChannels,
                    learningChannel: (cs.learningChannel || ls.learningChannel || mergedChannels.join(', ')),
                    observations: mergedObs,
                    interests: (cs.interests && cs.interests.length > 0) ? cs.interests : (ls.interests || []),
                    futureCareer: (cs.futureCareer && cs.futureCareer.length > 0) ? cs.futureCareer : (ls.futureCareer || []),
                    bap: cs.bap || ls.bap || { categories: [], description: '' }
                });
            }
        });

        return Array.from(studentsMap.values()).sort((a, b) => (parseInt(a.listNumber, 10) || 0) - (parseInt(b.listNumber, 10) || 0));
    }

    // 5. Helper to Merge a Single Group
    function mergeGroup(localGrp, cloudGrp) {
        if (!cloudGrp) {
            hasUnsyncedLocalChanges = true;
            return localGrp;
        }
        if (!localGrp) return cloudGrp;

        return {
            ...cloudGrp,
            name: cloudGrp.name || localGrp.name,
            grade: cloudGrp.grade || localGrp.grade,
            color: cloudGrp.color || localGrp.color,
            disciplines: (cloudGrp.disciplines && cloudGrp.disciplines.length > 0) ? cloudGrp.disciplines : (localGrp.disciplines || []),
            schedule: (cloudGrp.schedule && cloudGrp.schedule.length > 0) ? cloudGrp.schedule : (localGrp.schedule || []),
            pda: cloudGrp.pda || localGrp.pda || '',
            pdaContent: cloudGrp.pdaContent || localGrp.pdaContent || '',
            pdaDate: cloudGrp.pdaDate || localGrp.pdaDate || '',
            completedPDAs: (cloudGrp.completedPDAs && cloudGrp.completedPDAs.length > 0) ? cloudGrp.completedPDAs : (localGrp.completedPDAs || []),
            pdaActivities: (cloudGrp.pdaActivities && cloudGrp.pdaActivities.length > 0) ? cloudGrp.pdaActivities : (localGrp.pdaActivities || []),
            teams: (cloudGrp.teams && cloudGrp.teams.length > 0) ? cloudGrp.teams : (localGrp.teams || []),
            attendance: mergeAttendanceSessions(localGrp.attendance, cloudGrp.attendance),
            observations: mergeObservations(localGrp.observations, cloudGrp.observations),
            students: mergeStudents(localGrp.students, cloudGrp.students)
        };
    }

    // 6. Merge Schools and their Groups
    const localSchools = (local.schools || []).filter(s => s && s.id && !isDeleted(s.id));
    const cloudSchools = (cloud.schools || []).filter(s => s && s.id && !isDeleted(s.id));
    const schoolsMap = new Map();

    cloudSchools.forEach(cs => {
        schoolsMap.set(cs.id, { ...cs, groups: (cs.groups || []).map(g => ({ ...g })) });
    });

    localSchools.forEach(ls => {
        if (!schoolsMap.has(ls.id)) {
            schoolsMap.set(ls.id, { ...ls });
            hasUnsyncedLocalChanges = true;
        } else {
            const cs = schoolsMap.get(ls.id);
            const groupsMap = new Map();
            (cs.groups || []).forEach(g => { if (!isDeleted(g.id)) groupsMap.set(g.id, g); });

            (ls.groups || []).forEach(lg => {
                if (isDeleted(lg.id)) return;
                if (!groupsMap.has(lg.id)) {
                    groupsMap.set(lg.id, lg);
                    hasUnsyncedLocalChanges = true;
                } else {
                    const cg = groupsMap.get(lg.id);
                    groupsMap.set(lg.id, mergeGroup(lg, cg));
                }
            });

            schoolsMap.set(ls.id, {
                ...cs,
                contextInternal: cs.contextInternal || ls.contextInternal || '',
                contextExternal: cs.contextExternal || ls.contextExternal || '',
                priorities: cs.priorities || ls.priorities || '',
                incidents: mergeObservations(ls.incidents, cs.incidents),
                cteNotes: mergeObservations(ls.cteNotes, cs.cteNotes),
                groups: Array.from(groupsMap.values())
            });
        }
    });
    merged.schools = Array.from(schoolsMap.values());

    // 7. Merge Unassigned Groups
    const localUnassigned = (local.unassignedGroups || []).filter(g => g && g.id && !isDeleted(g.id));
    const cloudUnassigned = (cloud.unassignedGroups || []).filter(g => g && g.id && !isDeleted(g.id));
    const unassignedMap = new Map();

    cloudUnassigned.forEach(cg => unassignedMap.set(cg.id, cg));
    localUnassigned.forEach(lg => {
        if (!unassignedMap.has(lg.id)) {
            unassignedMap.set(lg.id, lg);
            hasUnsyncedLocalChanges = true;
        } else {
            const cg = unassignedMap.get(lg.id);
            unassignedMap.set(lg.id, mergeGroup(lg, cg));
        }
    });
    merged.unassignedGroups = Array.from(unassignedMap.values());

    return { mergedData: merged, hasUnsyncedLocalChanges };
}

/**
 * Real-time listener for Firestore document with Smart Two-Way Merge
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

        // Remote update received! Perform Smart Two-Way Merge
        if (!isApplyingCloudUpdate) {
            isApplyingCloudUpdate = true;
            console.log("Nube: Recibida actualización desde otro dispositivo. Ejecutando fusión inteligente sin sobrescritura...");
            
            try {
                const normalizedCloudData = normalizeAppData(cloudPayload.data);
                const { mergedData, hasUnsyncedLocalChanges } = smartMergeAppData(appData, normalizedCloudData);
                
                appData = normalizeAppData(mergedData);
                
                // Keep local backup up to date
                localStorage.setItem('pedagogicalData', JSON.stringify(appData));
                hasUnsavedChanges = false;
                lastCloudSyncTime = new Date();
                setCloudStatus('synced');

                // If local had changes that were not yet in the cloud, upload the unified merge!
                if (hasUnsyncedLocalChanges && navigator.onLine) {
                    console.log("Nube: Se detectaron cambios locales combinados. Sincronizando resultado unificado a la nube...");
                    setTimeout(() => {
                        syncToCloudNow();
                    }, 800);
                }

                // Re-render current active view
                refreshCurrentView();
            } catch (err) {
                console.error("Error al fusionar y aplicar datos de la nube:", err);
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

/**
 * Switch between Cloud and Local Login tabs on the Login screen
 */
function switchLoginMode(mode) {
    const cloudSection = document.getElementById('loginCloudSection');
    const localSection = document.getElementById('loginLocalSection');
    const cloudTabBtn = document.getElementById('loginTabCloudBtn');
    const localTabBtn = document.getElementById('loginTabLocalBtn');
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.style.display = 'none';

    if (mode === 'cloud') {
        if (cloudSection) cloudSection.style.display = 'block';
        if (localSection) localSection.style.display = 'none';
        if (cloudTabBtn) {
            cloudTabBtn.className = 'btn btn-small btn-primary';
        }
        if (localTabBtn) {
            localTabBtn.className = 'btn btn-small btn-secondary';
        }
    } else {
        if (cloudSection) cloudSection.style.display = 'none';
        if (localSection) localSection.style.display = 'block';
        if (localTabBtn) {
            localTabBtn.className = 'btn btn-small btn-primary';
        }
        if (cloudTabBtn) {
            cloudTabBtn.className = 'btn btn-small btn-secondary';
        }
    }
}

/**
 * Handle Cloud Email Login from main Login screen
 */
async function handleCloudEmailLogin() {
    const email = document.getElementById('cloudLoginEmail')?.value;
    const pass = document.getElementById('cloudLoginPass')?.value;
    const errorDiv = document.getElementById('loginError');

    if (!email || !pass) {
        if (errorDiv) {
            errorDiv.textContent = 'Por favor ingresa tu correo y contraseña.';
            errorDiv.style.display = 'block';
        } else {
            alert('Por favor ingresa tu correo y contraseña.');
        }
        return;
    }

    try {
        if (errorDiv) errorDiv.style.display = 'none';
        await signInWithEmail(email, pass);
    } catch (err) {
        if (errorDiv) {
            errorDiv.textContent = 'Error al ingresar: ' + err.message;
            errorDiv.style.display = 'block';
        }
    }
}

/**
 * Handle Cloud Email Registration from main Login screen
 */
async function handleCloudEmailRegister() {
    const email = document.getElementById('cloudLoginEmail')?.value;
    const pass = document.getElementById('cloudLoginPass')?.value;
    const errorDiv = document.getElementById('loginError');

    if (!email || !pass) {
        if (errorDiv) {
            errorDiv.textContent = 'Por favor ingresa un correo y contraseña para crear tu cuenta.';
            errorDiv.style.display = 'block';
        } else {
            alert('Por favor ingresa un correo y contraseña.');
        }
        return;
    }

    if (pass.length < 6) {
        if (errorDiv) {
            errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            errorDiv.style.display = 'block';
        } else {
            alert('La contraseña debe tener al menos 6 caracteres.');
        }
        return;
    }

    try {
        if (errorDiv) errorDiv.style.display = 'none';
        await signUpWithEmail(email, pass);
    } catch (err) {
        if (errorDiv) {
            errorDiv.textContent = 'Error al registrarse: ' + err.message;
            errorDiv.style.display = 'block';
        }
    }
}
