// Cloud Synchronization Module (Firebase Firestore + Auth)

let currentFirebaseUser = null;
let cloudSyncStatus = 'disconnected'; // 'synced' | 'syncing' | 'offline' | 'disconnected'
let isApplyingCloudUpdate = false;
let syncDebounceTimer = null;
let cloudUnsubscribeListener = null;
let cloudSchoolsUnsubscribe = null;
let cloudGroupsUnsubscribe = null;
let lastCloudSyncTime = null;
let localEditVersion = 0;
let lastSyncedVersion = 0;
let syncWriteSeq = 0;
let lastConfirmedServerSeq = 0;
let isSyncInFlight = false;
let partitionedSupported = true;
let hasShownRulesWarning = false;
let cloudSchemaVersion = null; // null | 1 | 2
let hasVerifiedCloudState = false;
let pendingLegacyDataCleanup = false;
let pendingCloudMerge = null; // { data, syncBack }
let preMigrationLegacyV1Data = null; // Frozen v1 copy saved to backups/v1_legacy on migration
let lastRootSnapshotFromCache = false;

let cloudPartitionState = {
    root: null,
    schools: new Map(),
    groups: new Map(),
    rootReady: false,
    schoolsReady: false,
    groupsReady: false,
    initialMergeDone: false
};

let syncedEntitySignatures = {
    root: '',
    schools: new Map(),
    groups: new Map()
};

const syncClientId = (() => {
    try {
        let id = sessionStorage.getItem('syncClientId');
        if (!id) {
            id = 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            sessionStorage.setItem('syncClientId', id);
        }
        return id;
    } catch (e) {
        return 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    }
})();

async function persistAppDataLocally() {
    try {
        if (typeof activeSessionPassword !== 'undefined' && activeSessionPassword && typeof encryptData === 'function') {
            const encryptedPayload = await encryptData(appData, activeSessionPassword);
            localStorage.setItem('pedagogicalData', JSON.stringify(encryptedPayload));
        } else {
            localStorage.setItem('pedagogicalData', JSON.stringify(appData));
        }
    } catch (e) {
        console.warn("No se pudo guardar respaldo local en localStorage:", e);
    }
}

function pruneExpiredDeletedItems(items) {
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days
    return (Array.isArray(items) ? items : []).filter(d => {
        if (!d || !d.id) return false;
        if (typeof d.deletedAt === 'number' && d.deletedAt < cutoff) return false;
        return true;
    });
}

function extractPartitionDocs(data) {
    const clean = normalizeAppData(data);
    const rootPayload = {
        schoolPeriods: Array.isArray(clean.schoolPeriods) ? clean.schoolPeriods : [],
        activePeriodId: clean.activePeriodId || '',
        deletedItems: pruneExpiredDeletedItems(clean.deletedItems)
    };

    const schoolsMap = new Map();
    const groupsMap = new Map();

    (clean.schools || []).forEach(school => {
        if (!school || !school.id) return;
        const { groups, ...schoolWithoutGroups } = school;
        schoolsMap.set(school.id, schoolWithoutGroups);

        (Array.isArray(groups) ? groups : []).forEach(grp => {
            if (!grp || !grp.id) return;
            groupsMap.set(grp.id, { ...grp, schoolId: school.id });
        });
    });

    (clean.unassignedGroups || []).forEach(grp => {
        if (!grp || !grp.id) return;
        groupsMap.set(grp.id, { ...grp, schoolId: null });
    });

    return { rootPayload, schoolsMap, groupsMap };
}

function stripSyncDocMeta(docObj) {
    if (!docObj || typeof docObj !== 'object') return docObj;
    const copy = { ...docObj };
    delete copy.lastWriterId;
    delete copy.lastWriteSeq;
    delete copy.cloudSyncedAt;
    return copy;
}

function reconstructAppDataFromPartition(state) {
    const root = state.root || {};
    const schoolsById = new Map();

    state.schools.forEach((schoolData, schoolId) => {
        const cleanSchool = stripSyncDocMeta(schoolData);
        schoolsById.set(schoolId, { ...cleanSchool, id: cleanSchool.id || schoolId, groups: [] });
    });

    const unassignedGroups = [];
    state.groups.forEach((groupData, groupId) => {
        const cleanGroup = stripSyncDocMeta(groupData);
        const parentSchoolId = cleanGroup.schoolId;
        delete cleanGroup.schoolId;
        if (!cleanGroup.id) cleanGroup.id = groupId;

        if (parentSchoolId && schoolsById.has(parentSchoolId)) {
            schoolsById.get(parentSchoolId).groups.push(cleanGroup);
        } else {
            unassignedGroups.push(cleanGroup);
        }
    });

    return normalizeAppData({
        schools: Array.from(schoolsById.values()),
        unassignedGroups,
        deletedItems: Array.isArray(root.deletedItems) ? root.deletedItems : [],
        schoolPeriods: Array.isArray(root.schoolPeriods) ? root.schoolPeriods : [],
        activePeriodId: typeof root.activePeriodId === 'string' ? root.activePeriodId : ''
    });
}

function updateSyncedSignaturesFromData(data) {
    const { rootPayload, schoolsMap, groupsMap } = extractPartitionDocs(data);
    syncedEntitySignatures.root = JSON.stringify(rootPayload);
    syncedEntitySignatures.schools.clear();
    schoolsMap.forEach((val, key) => syncedEntitySignatures.schools.set(key, JSON.stringify(val)));
    syncedEntitySignatures.groups.clear();
    groupsMap.forEach((val, key) => syncedEntitySignatures.groups.set(key, JSON.stringify(val)));
}

function handlePartitionPermissionDenied(err) {
    partitionedSupported = false;
    console.warn("Firestore subcollections permission-denied; usando modo compatibilidad hasta actualizar reglas.", err);
    if (!hasShownRulesWarning) {
        hasShownRulesWarning = true;
        alert("Aviso de Firebase: Para activar la sincronización particionada (subcolecciones por grupo y escuela), actualiza tus Reglas de Firestore en la consola de Firebase agregando el permiso para subcolecciones. Mientras tanto se seguirá usando el modo de respaldo tradicional.");
    }
}

async function applyCloudMergedData(normalizedCloudData, shouldSyncBackIfNeeded = true) {
    if (isApplyingCloudUpdate) {
        pendingCloudMerge = { data: normalizedCloudData, syncBack: shouldSyncBackIfNeeded };
        return;
    }
    isApplyingCloudUpdate = true;

    let hasRemoteChanges = false;
    let hasUnsyncedLocalChanges = false;
    try {
        const preferLocal = localEditVersion > lastSyncedVersion;
        const mergeResult = smartMergeAppData(appData, normalizedCloudData, preferLocal);
        hasRemoteChanges = mergeResult.hasRemoteChanges;
        hasUnsyncedLocalChanges = mergeResult.hasUnsyncedLocalChanges || preferLocal;

        if (hasRemoteChanges) {
            appData = normalizeAppData(mergeResult.mergedData);
            await persistAppDataLocally();
        }

        if (!hasUnsyncedLocalChanges && cloudSchemaVersion === 2) {
            updateSyncedSignaturesFromData(appData);
        }

        if (!preferLocal) {
            hasUnsavedChanges = false;
        }
        lastCloudSyncTime = new Date();
        setCloudStatus(hasUnsyncedLocalChanges ? 'syncing' : 'synced');
    } catch (err) {
        console.error("Error al fusionar y aplicar datos de la nube:", err);
    } finally {
        isApplyingCloudUpdate = false;
    }

    if (hasRemoteChanges) {
        refreshCurrentView();
    }

    if (pendingCloudMerge) {
        const queued = pendingCloudMerge;
        pendingCloudMerge = null;
        await applyCloudMergedData(queued.data, queued.syncBack || shouldSyncBackIfNeeded);
        return;
    }

    if (shouldSyncBackIfNeeded && (hasUnsyncedLocalChanges || pendingLegacyDataCleanup) && navigator.onLine) {
        console.log("Nube: Se detectaron cambios locales combinados. Sincronizando resultado unificado a la nube...");
        syncToCloudDebounced(600);
    }
}

function clearCloudListeners() {
    if (cloudUnsubscribeListener) {
        cloudUnsubscribeListener();
        cloudUnsubscribeListener = null;
    }
    if (cloudSchoolsUnsubscribe) {
        cloudSchoolsUnsubscribe();
        cloudSchoolsUnsubscribe = null;
    }
    if (cloudGroupsUnsubscribe) {
        cloudGroupsUnsubscribe();
        cloudGroupsUnsubscribe = null;
    }
}

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
                    if (cloudPayload && cloudPayload.schemaVersion === 2 && partitionedSupported) {
                        cloudSchemaVersion = 2;
                        const [schoolsSnap, groupsSnap] = await Promise.all([
                            docRef.collection('schools').get(),
                            docRef.collection('groups').get()
                        ]);
                        cloudPartitionState.root = cloudPayload;
                        cloudPartitionState.schools = new Map(schoolsSnap.docs.map(d => [d.id, d.data()]));
                        cloudPartitionState.groups = new Map(groupsSnap.docs.map(d => [d.id, d.data()]));
                        cloudPartitionState.rootReady = true;
                        cloudPartitionState.schoolsReady = true;
                        cloudPartitionState.groupsReady = true;
                        hasVerifiedCloudState = true;

                        let reconstructed = reconstructAppDataFromPartition(cloudPartitionState);
                        if (cloudPayload.data) {
                            reconstructed = smartMergeAppData(reconstructed, normalizeAppData(cloudPayload.data), false).mergedData;
                            pendingLegacyDataCleanup = true;
                        }
                        await applyCloudMergedData(reconstructed, true);
                    } else if (cloudPayload && cloudPayload.data) {
                        cloudSchemaVersion = 1;
                        hasVerifiedCloudState = true;
                        lastRootSnapshotFromCache = false;
                        if (!preMigrationLegacyV1Data) {
                            preMigrationLegacyV1Data = cloudPayload.data;
                        }
                        const normalizedCloud = normalizeAppData(cloudPayload.data);
                        await applyCloudMergedData(normalizedCloud, true);
                    }
                } else {
                    hasVerifiedCloudState = true;
                    syncToCloudDebounced(200);
                }
            } catch (e) {
                if (e && e.code === 'permission-denied') {
                    handlePartitionPermissionDenied(e);
                } else {
                    console.warn("Error al verificar nube al reconectar:", e);
                }
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
                if (typeof renderSchools === 'function') {
                    renderSchools();
                }
            }

            // Start listening to real-time changes
            listenToCloudData(user.uid);
        } else {
            console.log("Firebase Auth: Sin usuario conectado.");
            clearCloudListeners();
            cloudSchemaVersion = null;
            hasVerifiedCloudState = false;
            pendingLegacyDataCleanup = false;
            pendingCloudMerge = null;
            preMigrationLegacyV1Data = null;
            lastRootSnapshotFromCache = false;
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
function smartMergeAppData(local, cloud, preferLocalOnConflict = false) {
    if (!cloud || (!cloud.schools?.length && !cloud.unassignedGroups?.length)) {
        return { mergedData: local, hasUnsyncedLocalChanges: true, hasRemoteChanges: false };
    }
    if (!local || (!local.schools?.length && !local.unassignedGroups?.length)) {
        return { mergedData: cloud, hasUnsyncedLocalChanges: false, hasRemoteChanges: true };
    }

    let hasUnsyncedLocalChanges = false;
    let hasRemoteChanges = false;
    const merged = {
        schools: [],
        unassignedGroups: [],
        deletedItems: [],
        schoolPeriods: [],
        activePeriodId: ''
    };

    // 1. Merge Deleted Items (union of IDs to respect deletions, keeping latest timestamp)
    const deletedMap = new Map();
    (local.deletedItems || []).forEach(d => { if (d && d.id) deletedMap.set(d.id, d); });
    (cloud.deletedItems || []).forEach(d => {
        if (d && d.id) {
            const existing = deletedMap.get(d.id);
            if (!existing || (d.deletedAt || 0) > (existing.deletedAt || 0)) {
                deletedMap.set(d.id, d);
                if (!existing) hasRemoteChanges = true;
            }
        }
    });
    merged.deletedItems = Array.from(deletedMap.values());
    const isDeleted = (id) => deletedMap.has(id);

    // 2. Helper to Merge Attendance Sessions
    function mergeAttendanceSessions(localAtt, cloudAtt, groupId) {
        const localList = Array.isArray(localAtt) ? localAtt : [];
        const cloudList = Array.isArray(cloudAtt) ? cloudAtt : [];
        const sessionsByDate = new Map();

        const isSessionClearedAfter = (dateStr, updatedAt) => {
            const tombstoneId = groupId ? `att_${groupId}_${dateStr}` : null;
            if (!tombstoneId) return false;
            const tomb = deletedMap.get(tombstoneId);
            if (!tomb) return false;
            return (tomb.deletedAt || 0) >= (updatedAt || 0);
        };

        // Put cloud sessions first (unless cleared by a newer local/cloud tombstone)
        cloudList.forEach(cs => {
            if (cs && cs.date && !isSessionClearedAfter(cs.date, cs.updatedAt || 0)) {
                sessionsByDate.set(cs.date, {
                    id: cs.id || ('att_' + cs.date),
                    date: cs.date,
                    updatedAt: cs.updatedAt || 0,
                    records: { ...(cs.records || {}) },
                    studentNotes: { ...(cs.studentNotes || {}) },
                    notes: cs.notes || ''
                });
            }
        });

        // Merge local sessions
        localList.forEach(ls => {
            if (!ls || !ls.date || isSessionClearedAfter(ls.date, ls.updatedAt || 0)) return;
            if (sessionsByDate.has(ls.date)) {
                const existing = sessionsByDate.get(ls.date);
                const localWins = preferLocalOnConflict || ((ls.updatedAt || 0) >= (existing.updatedAt || 0) && (ls.updatedAt || 0) > 0);
                let diffDetected = false;

                // Merge student attendance records (P, A, R, J)
                Object.entries(ls.records || {}).forEach(([stId, status]) => {
                    if (!existing.records[stId]) {
                        existing.records[stId] = status;
                        diffDetected = true;
                    } else if (localWins && existing.records[stId] !== status) {
                        existing.records[stId] = status;
                        diffDetected = true;
                    } else if (!localWins && existing.records[stId] !== status) {
                        hasRemoteChanges = true;
                    }
                });

                // Detect any cloud-only records that local didn't have
                Object.keys(existing.records).forEach(stId => {
                    if (!(ls.records && ls.records[stId])) {
                        hasRemoteChanges = true;
                    }
                });

                // Merge student notes
                Object.entries(ls.studentNotes || {}).forEach(([stId, note]) => {
                    if (!existing.studentNotes[stId] && note) {
                        existing.studentNotes[stId] = note;
                        diffDetected = true;
                    } else if (localWins && note !== undefined && existing.studentNotes[stId] !== note) {
                        existing.studentNotes[stId] = note;
                        diffDetected = true;
                    } else if (!localWins && existing.studentNotes[stId] && existing.studentNotes[stId] !== note) {
                        hasRemoteChanges = true;
                    }
                });

                Object.keys(existing.studentNotes).forEach(stId => {
                    if (!(ls.studentNotes && ls.studentNotes[stId])) {
                        hasRemoteChanges = true;
                    }
                });

                // Session general notes
                if (!existing.notes && ls.notes) {
                    existing.notes = ls.notes;
                    diffDetected = true;
                } else if (localWins && ls.notes !== undefined && existing.notes !== ls.notes) {
                    existing.notes = ls.notes;
                    diffDetected = true;
                } else if (!localWins && existing.notes && existing.notes !== ls.notes) {
                    hasRemoteChanges = true;
                }

                existing.updatedAt = Math.max(existing.updatedAt || 0, ls.updatedAt || 0);
                if (diffDetected) hasUnsyncedLocalChanges = true;
            } else {
                // Session only exists in local! Keep it and mark for cloud upload
                sessionsByDate.set(ls.date, {
                    id: ls.id || ('att_' + ls.date),
                    date: ls.date,
                    updatedAt: ls.updatedAt || Date.now(),
                    records: { ...(ls.records || {}) },
                    studentNotes: { ...(ls.studentNotes || {}) },
                    notes: ls.notes || ''
                });
                hasUnsyncedLocalChanges = true;
            }
        });

        // Detect cloud-only sessions not present locally
        cloudList.forEach(cs => {
            if (cs && cs.date && sessionsByDate.has(cs.date) && !localList.some(ls => ls && ls.date === cs.date)) {
                hasRemoteChanges = true;
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
            if (o && !(o.id && isDeleted(o.id))) {
                const key = o.id || `${o.date}_${(o.text || '').substring(0, 20)}`;
                obsMap.set(key, o);
            }
        });

        localList.forEach(o => {
            if (!o || (o.id && isDeleted(o.id))) return;
            const key = o.id || `${o.date}_${(o.text || '').substring(0, 20)}`;
            if (!obsMap.has(key)) {
                obsMap.set(key, o);
                hasUnsyncedLocalChanges = true;
            } else {
                const co = obsMap.get(key);
                if (preferLocalOnConflict && JSON.stringify(co) !== JSON.stringify(o)) {
                    obsMap.set(key, o);
                    hasUnsyncedLocalChanges = true;
                } else if (!preferLocalOnConflict && JSON.stringify(co) !== JSON.stringify(o)) {
                    hasRemoteChanges = true;
                }
            }
        });

        cloudList.forEach(o => {
            if (o && !(o.id && isDeleted(o.id))) {
                const key = o.id || `${o.date}_${(o.text || '').substring(0, 20)}`;
                if (!localList.some(lo => lo && (lo.id || `${lo.date}_${(lo.text || '').substring(0, 20)}`) === key)) {
                    hasRemoteChanges = true;
                }
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
                const cs = studentsMap.get(ls.id);
                const mergedObs = mergeObservations(ls.observations, cs.observations);
                const primary = preferLocalOnConflict ? ls : cs;
                const secondary = preferLocalOnConflict ? cs : ls;

                const mergedPreferred = primary.preferredName || secondary.preferredName || '';
                const mergedChannels = (primary.learningChannels && primary.learningChannels.length > 0)
                    ? primary.learningChannels
                    : (secondary.learningChannels || []);

                const mergedStudent = {
                    ...secondary,
                    ...primary,
                    preferredName: mergedPreferred,
                    learningChannels: mergedChannels,
                    learningChannel: (primary.learningChannel || secondary.learningChannel || mergedChannels.join(', ')),
                    observations: mergedObs,
                    interests: (primary.interests && primary.interests.length > 0) ? primary.interests : (secondary.interests || []),
                    futureCareer: (primary.futureCareer && primary.futureCareer.length > 0) ? primary.futureCareer : (secondary.futureCareer || []),
                    bap: primary.bap || secondary.bap || { categories: [], description: '' }
                };

                if (!preferLocalOnConflict && JSON.stringify(ls) !== JSON.stringify(mergedStudent)) {
                    hasRemoteChanges = true;
                }
                if (preferLocalOnConflict && JSON.stringify(cs) !== JSON.stringify(mergedStudent)) {
                    hasUnsyncedLocalChanges = true;
                }

                studentsMap.set(ls.id, mergedStudent);
            }
        });

        cloudList.forEach(cs => {
            if (!localList.some(ls => ls.id === cs.id)) {
                hasRemoteChanges = true;
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
        if (!localGrp) {
            hasRemoteChanges = true;
            return cloudGrp;
        }

        const primary = preferLocalOnConflict ? localGrp : cloudGrp;
        const secondary = preferLocalOnConflict ? cloudGrp : localGrp;

        const mergedGrp = {
            ...secondary,
            ...primary,
            name: primary.name || secondary.name,
            grade: primary.grade || secondary.grade,
            color: primary.color || secondary.color,
            disciplines: (primary.disciplines && primary.disciplines.length > 0) ? primary.disciplines : (secondary.disciplines || []),
            schedule: (primary.schedule && primary.schedule.length > 0) ? primary.schedule : (secondary.schedule || []),
            pda: primary.pda || secondary.pda || '',
            pdaContent: primary.pdaContent || secondary.pdaContent || '',
            pdaDate: primary.pdaDate || secondary.pdaDate || '',
            completedPDAs: (primary.completedPDAs && primary.completedPDAs.length > 0) ? primary.completedPDAs : (secondary.completedPDAs || []),
            pdaActivities: (primary.pdaActivities && primary.pdaActivities.length > 0) ? primary.pdaActivities : (secondary.pdaActivities || []),
            teams: (primary.teams && primary.teams.length > 0) ? primary.teams : (secondary.teams || []),
            attendance: mergeAttendanceSessions(localGrp.attendance, cloudGrp.attendance, localGrp.id),
            observations: mergeObservations(localGrp.observations, cloudGrp.observations),
            students: mergeStudents(localGrp.students, cloudGrp.students)
        };

        if (!preferLocalOnConflict && (primary.name !== secondary.name || primary.pda !== secondary.pda || primary.notes !== secondary.notes)) {
            hasRemoteChanges = true;
        }

        return mergedGrp;
    }

    // 6. Merge Schools and their Groups
    const localSchools = (local.schools || []).filter(s => s && s.id && !isDeleted(s.id));
    const cloudSchools = (cloud.schools || []).filter(s => s && s.id && !isDeleted(s.id));
    const schoolsMap = new Map();

    cloudSchools.forEach(cs => {
        schoolsMap.set(cs.id, { ...cs, groups: (cs.groups || []).filter(g => g && g.id && !isDeleted(g.id)).map(g => ({ ...g })) });
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

            (cs.groups || []).forEach(cg => {
                if (!isDeleted(cg.id) && !(ls.groups || []).some(lg => lg.id === cg.id)) {
                    hasRemoteChanges = true;
                }
            });

            const primarySchool = preferLocalOnConflict ? ls : cs;
            const secondarySchool = preferLocalOnConflict ? cs : ls;
            const mergedSchoolObs = mergeObservations(ls.observations, cs.observations);

            if (!preferLocalOnConflict && (
                primarySchool.name !== secondarySchool.name ||
                primarySchool.internalContext !== secondarySchool.internalContext ||
                primarySchool.externalContext !== secondarySchool.externalContext ||
                primarySchool.schoolProblems !== secondarySchool.schoolProblems
            )) {
                hasRemoteChanges = true;
            }

            schoolsMap.set(ls.id, {
                ...secondarySchool,
                ...primarySchool,
                internalContext: primarySchool.internalContext || secondarySchool.internalContext || '',
                externalContext: primarySchool.externalContext || secondarySchool.externalContext || '',
                schoolProblems: primarySchool.schoolProblems || secondarySchool.schoolProblems || '',
                observations: mergedSchoolObs,
                groups: Array.from(groupsMap.values())
            });
        }
    });

    cloudSchools.forEach(cs => {
        if (!localSchools.some(ls => ls.id === cs.id)) {
            hasRemoteChanges = true;
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
    cloudUnassigned.forEach(cg => {
        if (!localUnassigned.some(lg => lg.id === cg.id)) {
            hasRemoteChanges = true;
        }
    });
    merged.unassignedGroups = Array.from(unassignedMap.values());

    // 8. Merge School Periods (Trimesters / Terms)
    const localPeriods = (local.schoolPeriods || []).filter(p => p && p.id && !isDeleted(p.id));
    const cloudPeriods = (cloud.schoolPeriods || []).filter(p => p && p.id && !isDeleted(p.id));
    const periodsMap = new Map();

    cloudPeriods.forEach(cp => periodsMap.set(cp.id, { ...cp }));
    localPeriods.forEach(lp => {
        if (!periodsMap.has(lp.id)) {
            periodsMap.set(lp.id, { ...lp });
            hasUnsyncedLocalChanges = true;
        } else {
            const cp = periodsMap.get(lp.id);
            const localNewer = preferLocalOnConflict || (lp.updatedAt || 0) >= (cp.updatedAt || 0);
            const chosen = localNewer ? lp : cp;
            if (!localNewer && JSON.stringify(lp) !== JSON.stringify(cp)) {
                hasRemoteChanges = true;
            } else if (localNewer && JSON.stringify(lp) !== JSON.stringify(cp)) {
                hasUnsyncedLocalChanges = true;
            }
            periodsMap.set(lp.id, { ...chosen });
        }
    });
    cloudPeriods.forEach(cp => {
        if (!localPeriods.some(lp => lp.id === cp.id)) {
            hasRemoteChanges = true;
        }
    });
    merged.schoolPeriods = Array.from(periodsMap.values()).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    const candidatePeriodId = preferLocalOnConflict ? (local.activePeriodId || '') : (cloud.activePeriodId || local.activePeriodId || '');
    merged.activePeriodId = merged.schoolPeriods.some(p => p.id === candidatePeriodId) ? candidatePeriodId : '';
    if (!preferLocalOnConflict && (local.activePeriodId || '') !== merged.activePeriodId) {
        hasRemoteChanges = true;
    }

    return { mergedData: merged, hasUnsyncedLocalChanges, hasRemoteChanges };
}

/**
 * Real-time listener for Firestore document (v2 partitioned subcollections + v1 legacy fallback)
 */
function listenToCloudData(userId) {
    if (!firestoreDb || !userId) return;

    clearCloudListeners();
    cloudSchemaVersion = null;
    hasVerifiedCloudState = false;
    pendingLegacyDataCleanup = false;
    pendingCloudMerge = null;
    preMigrationLegacyV1Data = null;
    lastRootSnapshotFromCache = false;
    cloudPartitionState = {
        root: null,
        schools: new Map(),
        groups: new Map(),
        rootReady: false,
        schoolsReady: false,
        groupsReady: false,
        initialMergeDone: false,
        strayLegacyData: null
    };
    syncedEntitySignatures.root = '';
    syncedEntitySignatures.schools.clear();
    syncedEntitySignatures.groups.clear();

    const docRef = firestoreDb.collection('users').doc(userId);

    const tryReconstructAndMergePartition = async (hasRemoteUpdateHint) => {
        if (!cloudPartitionState.rootReady || !cloudPartitionState.schoolsReady || !cloudPartitionState.groupsReady) {
            return;
        }
        if (cloudPartitionState.initialMergeDone && !hasRemoteUpdateHint) {
            return;
        }
        cloudPartitionState.initialMergeDone = true;
        let reconstructed = reconstructAppDataFromPartition(cloudPartitionState);
        if (cloudPartitionState.strayLegacyData) {
            reconstructed = smartMergeAppData(reconstructed, cloudPartitionState.strayLegacyData, false).mergedData;
            cloudPartitionState.strayLegacyData = null;
            pendingLegacyDataCleanup = true;
        }
        await applyCloudMergedData(reconstructed, true);
    };

    const handleSubcollectionFallbackToLegacy = async (err) => {
        handlePartitionPermissionDenied(err);
        if (cloudSchoolsUnsubscribe) {
            cloudSchoolsUnsubscribe();
            cloudSchoolsUnsubscribe = null;
        }
        if (cloudGroupsUnsubscribe) {
            cloudGroupsUnsubscribe();
            cloudGroupsUnsubscribe = null;
        }
        if (cloudPartitionState.root && cloudPartitionState.root.data) {
            cloudSchemaVersion = 1;
            const normalizedLegacy = normalizeAppData(cloudPartitionState.root.data);
            await applyCloudMergedData(normalizedLegacy, true);
        }
    };

    const attachPartitionSubListeners = () => {
        if (!partitionedSupported || cloudSchoolsUnsubscribe || cloudGroupsUnsubscribe) return;

        cloudSchoolsUnsubscribe = docRef.collection('schools').onSnapshot(async (snapshot) => {
            if (cloudPartitionState.schoolsReady && snapshot.metadata && snapshot.metadata.hasPendingWrites) {
                return;
            }
            cloudPartitionState.schools = new Map(snapshot.docs.map(d => [d.id, d.data()]));
            cloudPartitionState.schoolsReady = true;

            const hasExternalChange = !cloudPartitionState.initialMergeDone || snapshot.docChanges().some(ch => {
                if (ch.type === 'removed') return !isSyncInFlight;
                const d = ch.doc.data();
                return !d || d.lastWriterId !== syncClientId;
            });

            if (hasExternalChange) {
                await tryReconstructAndMergePartition(true);
            }
        }, (error) => {
            if (error && error.code === 'permission-denied') {
                handleSubcollectionFallbackToLegacy(error);
            } else {
                console.warn("Error en listener de subcolección schools:", error);
            }
        });

        cloudGroupsUnsubscribe = docRef.collection('groups').onSnapshot(async (snapshot) => {
            if (cloudPartitionState.groupsReady && snapshot.metadata && snapshot.metadata.hasPendingWrites) {
                return;
            }
            cloudPartitionState.groups = new Map(snapshot.docs.map(d => [d.id, d.data()]));
            cloudPartitionState.groupsReady = true;

            const hasExternalChange = !cloudPartitionState.initialMergeDone || snapshot.docChanges().some(ch => {
                if (ch.type === 'removed') return !isSyncInFlight;
                const d = ch.doc.data();
                return !d || d.lastWriterId !== syncClientId;
            });

            if (hasExternalChange) {
                await tryReconstructAndMergePartition(true);
            }
        }, (error) => {
            if (error && error.code === 'permission-denied') {
                handleSubcollectionFallbackToLegacy(error);
            } else {
                console.warn("Error en listener de subcolección groups:", error);
            }
        });
    };

    cloudUnsubscribeListener = docRef.onSnapshot(async (doc) => {
        if (!doc.exists) {
            cloudSchemaVersion = null;
            hasVerifiedCloudState = true;
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
        if (!cloudPayload) return;
        const isFromCache = Boolean(doc.metadata && doc.metadata.fromCache);
        lastRootSnapshotFromCache = isFromCache;
        if (!isFromCache) {
            hasVerifiedCloudState = true;
        }

        // Partitioned v2 schema
        if (cloudPayload.schemaVersion === 2 && partitionedSupported) {
            cloudSchemaVersion = 2;
            preMigrationLegacyV1Data = null;
            cloudPartitionState.root = cloudPayload;
            cloudPartitionState.rootReady = true;
            if (cloudPayload.data) {
                cloudPartitionState.strayLegacyData = normalizeAppData(cloudPayload.data);
                pendingLegacyDataCleanup = true;
            }
            attachPartitionSubListeners();

            const isSelfEcho = Boolean(cloudPayload.lastWriterId && cloudPayload.lastWriterId === syncClientId);
            if (isSelfEcho && !cloudPartitionState.strayLegacyData) {
                lastConfirmedServerSeq = cloudPayload.lastWriteSeq || lastConfirmedServerSeq;
                lastCloudSyncTime = new Date();
                if (localEditVersion <= lastSyncedVersion) {
                    setCloudStatus('synced');
                }
                if (!cloudPartitionState.initialMergeDone) {
                    await tryReconstructAndMergePartition(false);
                }
                return;
            }

            console.log("Nube (v2): Recibida actualización desde otro dispositivo. Fusionando...");
            await tryReconstructAndMergePartition(true);
            return;
        }

        // Legacy v1 single-document format
        if (!cloudPayload.data) return;

        const isSelfEcho = Boolean(cloudPayload.lastWriterId && cloudPayload.lastWriterId === syncClientId);
        if (isSelfEcho && !partitionedSupported) {
            lastConfirmedServerSeq = cloudPayload.lastWriteSeq || lastConfirmedServerSeq;
            lastCloudSyncTime = new Date();
            if (localEditVersion <= lastSyncedVersion) {
                setCloudStatus('synced');
            }
            return;
        }

        cloudSchemaVersion = 1;
        if (!preMigrationLegacyV1Data) {
            preMigrationLegacyV1Data = cloudPayload.data;
        }
        const normalizedCloudData = normalizeAppData(cloudPayload.data);

        if (partitionedSupported) {
            // Merge legacy data locally; only schedule v1 -> v2 migration once confirmed by server (not stale offline cache)
            await applyCloudMergedData(normalizedCloudData, false);
            if (navigator.onLine && !isFromCache) {
                console.log("Nube: Migrando automáticamente de formato único (v1) a base particionada (v2)...");
                syncToCloudDebounced(400);
            }
        } else {
            if (!isSelfEcho) {
                console.log("Nube: Recibida actualización desde otro dispositivo. Ejecutando fusión inteligente sin sobrescritura...");
            }
            await applyCloudMergedData(normalizedCloudData, true);
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
    if (isApplyingCloudUpdate) return;

    localEditVersion++;

    if (!currentFirebaseUser || !firestoreDb) return;

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
 * Commit Firestore write/delete operations in safe batch chunks (<= 400 ops per batch)
 */
async function commitBatchedOps(ops) {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        const batch = firestoreDb.batch();
        chunk.forEach(op => {
            if (op.type === 'delete') {
                batch.delete(op.ref);
            } else if (op.options) {
                batch.set(op.ref, op.data, op.options);
            } else {
                batch.set(op.ref, op.data);
            }
        });
        await batch.commit();
    }
}

/**
 * Send current data immediately to Firestore (partitioned v2 incremental batch with v1 fallback)
 */
async function syncToCloudNow() {
    if (!currentFirebaseUser || !firestoreDb) return;

    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
    }

    if (isSyncInFlight) {
        // Another write is in flight; schedule follow-up after it completes
        syncToCloudDebounced(500);
        return;
    }

    const versionAtSend = localEditVersion;
    const currentSeq = ++syncWriteSeq;
    isSyncInFlight = true;

    try {
        setCloudStatus('syncing');
        const docRef = firestoreDb.collection('users').doc(currentFirebaseUser.uid);

        // Pre-flight guard: never migrate or overwrite cloud state before verifying against server
        if (!hasVerifiedCloudState || (lastRootSnapshotFromCache && navigator.onLine && cloudSchemaVersion !== 2)) {
            let existingSnap = null;
            try {
                existingSnap = await docRef.get(navigator.onLine ? { source: 'server' } : undefined);
            } catch (serverReadErr) {
                existingSnap = await docRef.get();
            }
            if (existingSnap && existingSnap.exists) {
                const remotePayload = existingSnap.data() || {};
                let remoteAppData = null;

                if (remotePayload.schemaVersion === 2 && partitionedSupported) {
                    cloudSchemaVersion = 2;
                    preMigrationLegacyV1Data = null;
                    try {
                        const [schoolsSnap, groupsSnap] = await Promise.all([
                            docRef.collection('schools').get(navigator.onLine ? { source: 'server' } : undefined).catch(() => docRef.collection('schools').get()),
                            docRef.collection('groups').get(navigator.onLine ? { source: 'server' } : undefined).catch(() => docRef.collection('groups').get())
                        ]);
                        cloudPartitionState.root = remotePayload;
                        cloudPartitionState.schools = new Map(schoolsSnap.docs.map(d => [d.id, d.data()]));
                        cloudPartitionState.groups = new Map(groupsSnap.docs.map(d => [d.id, d.data()]));
                        cloudPartitionState.rootReady = true;
                        cloudPartitionState.schoolsReady = true;
                        cloudPartitionState.groupsReady = true;
                        remoteAppData = reconstructAppDataFromPartition(cloudPartitionState);
                        if (remotePayload.data) {
                            remoteAppData = smartMergeAppData(remoteAppData, normalizeAppData(remotePayload.data), false).mergedData;
                            pendingLegacyDataCleanup = true;
                        }
                    } catch (preflightErr) {
                        if (preflightErr && preflightErr.code === 'permission-denied') {
                            handlePartitionPermissionDenied(preflightErr);
                            if (remotePayload.data) {
                                remoteAppData = normalizeAppData(remotePayload.data);
                            }
                        } else {
                            throw preflightErr;
                        }
                    }
                } else if (remotePayload.data) {
                    cloudSchemaVersion = 1;
                    if (!preMigrationLegacyV1Data) {
                        preMigrationLegacyV1Data = remotePayload.data;
                    }
                    remoteAppData = normalizeAppData(remotePayload.data);
                }

                if (remoteAppData) {
                    const preMerge = smartMergeAppData(appData, remoteAppData, true);
                    if (preMerge.hasRemoteChanges) {
                        appData = normalizeAppData(preMerge.mergedData);
                        await persistAppDataLocally();
                        refreshCurrentView();
                    }
                }
            }
            if (!existingSnap || !(existingSnap.metadata && existingSnap.metadata.fromCache)) {
                hasVerifiedCloudState = true;
                lastRootSnapshotFromCache = false;
            }
        }

        if (partitionedSupported) {
            const { rootPayload, schoolsMap, groupsMap } = extractPartitionDocs(appData);
            const needsFullMigration = cloudSchemaVersion !== 2;
            const shouldDeleteLegacyData = needsFullMigration || pendingLegacyDataCleanup;
            const ops = [];
            const nextSchoolSigs = new Map();
            const nextGroupSigs = new Map();
            const metaFields = {
                lastWriterId: syncClientId,
                lastWriteSeq: currentSeq,
                cloudSyncedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            schoolsMap.forEach((schoolObj, schoolId) => {
                const sig = JSON.stringify(schoolObj);
                nextSchoolSigs.set(schoolId, sig);
                if (needsFullMigration || syncedEntitySignatures.schools.get(schoolId) !== sig) {
                    ops.push({
                        type: 'set',
                        ref: docRef.collection('schools').doc(schoolId),
                        data: { ...schoolObj, ...metaFields }
                    });
                }
            });

            const knownSchoolIds = new Set(syncedEntitySignatures.schools.keys());
            if (cloudPartitionState.schoolsReady) {
                cloudPartitionState.schools.forEach((_, id) => knownSchoolIds.add(id));
            }
            knownSchoolIds.forEach((oldSchoolId) => {
                if (!schoolsMap.has(oldSchoolId)) {
                    ops.push({
                        type: 'delete',
                        ref: docRef.collection('schools').doc(oldSchoolId)
                    });
                }
            });

            groupsMap.forEach((groupObj, groupId) => {
                const sig = JSON.stringify(groupObj);
                nextGroupSigs.set(groupId, sig);
                if (needsFullMigration || syncedEntitySignatures.groups.get(groupId) !== sig) {
                    ops.push({
                        type: 'set',
                        ref: docRef.collection('groups').doc(groupId),
                        data: { ...groupObj, ...metaFields }
                    });
                }
            });

            const knownGroupIds = new Set(syncedEntitySignatures.groups.keys());
            if (cloudPartitionState.groupsReady) {
                cloudPartitionState.groups.forEach((_, id) => knownGroupIds.add(id));
            }
            knownGroupIds.forEach((oldGroupId) => {
                if (!groupsMap.has(oldGroupId)) {
                    ops.push({
                        type: 'delete',
                        ref: docRef.collection('groups').doc(oldGroupId)
                    });
                }
            });

            if (needsFullMigration && preMigrationLegacyV1Data) {
                try {
                    const serializedV1Len = JSON.stringify(preMigrationLegacyV1Data).length;
                    if (serializedV1Len < 900000) {
                        ops.push({
                            type: 'set',
                            ref: docRef.collection('backups').doc('v1_legacy'),
                            data: {
                                data: preMigrationLegacyV1Data,
                                migratedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                migratedByClientId: syncClientId
                            }
                        });
                    }
                } catch (backupSizeErr) {
                    console.warn("No se pudo preparar copia v1_legacy:", backupSizeErr);
                }
            }

            const rootSig = JSON.stringify(rootPayload);
            if (shouldDeleteLegacyData || syncedEntitySignatures.root !== rootSig || ops.length > 0) {
                const rootDocData = {
                    ...rootPayload,
                    schemaVersion: 2,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    userEmail: currentFirebaseUser.email || '',
                    deviceInfo: navigator.userAgent,
                    lastWriterId: syncClientId,
                    lastWriteSeq: currentSeq
                };
                if (shouldDeleteLegacyData) {
                    rootDocData.data = firebase.firestore.FieldValue.delete();
                }
                ops.push({
                    type: 'set',
                    ref: docRef,
                    data: rootDocData,
                    options: { merge: true }
                });
            }

            try {
                if (ops.length > 0) {
                    await commitBatchedOps(ops);
                }
                cloudSchemaVersion = 2;
                pendingLegacyDataCleanup = false;
                preMigrationLegacyV1Data = null;
                syncedEntitySignatures.root = rootSig;
                syncedEntitySignatures.schools = nextSchoolSigs;
                syncedEntitySignatures.groups = nextGroupSigs;
            } catch (partitionErr) {
                if (partitionErr && partitionErr.code === 'permission-denied') {
                    handlePartitionPermissionDenied(partitionErr);
                } else {
                    throw partitionErr;
                }
            }
        }

        if (!partitionedSupported) {
            await docRef.set({
                data: appData,
                schemaVersion: 1,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                userEmail: currentFirebaseUser.email || '',
                deviceInfo: navigator.userAgent,
                lastWriterId: syncClientId,
                lastWriteSeq: currentSeq
            }, { merge: true });
            cloudSchemaVersion = 1;
        }

        lastSyncedVersion = Math.max(lastSyncedVersion, versionAtSend);
        lastCloudSyncTime = new Date();

        if (localEditVersion > lastSyncedVersion) {
            // More edits happened while this write was in flight; sync them too
            syncToCloudDebounced(600);
        } else {
            setCloudStatus('synced');
            console.log(`Nube: Sincronización exitosa (${partitionedSupported ? 'v2 particionado' : 'v1 compatible'}) ✓`);
        }
    } catch (err) {
        console.error("Error al sincronizar con la nube:", err);
        setCloudStatus(navigator.onLine ? 'synced' : 'offline');
    } finally {
        isSyncInFlight = false;
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
 * while preserving in-progress inputs, drafts, scroll position, and section states.
 */
function refreshCurrentView() {
    const viewSchools = document.getElementById('viewSchools');
    const viewSchoolDetail = document.getElementById('viewSchoolDetail');
    const viewGroupDetail = document.getElementById('viewGroupDetail');
    const viewStudentDetail = document.getElementById('viewStudentDetail');

    // Snapshot unsaved DOM inputs, focus, selection, collapsible states, and scroll
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const activeEl = document.activeElement;
    const activeId = activeEl && activeEl.id ? activeEl.id : null;
    const activeStudentNoteId = activeEl && activeEl.classList && activeEl.classList.contains('attendance-note-input')
        ? activeEl.closest('.attendance-row')?.dataset?.studentId
        : null;
    const selStart = activeEl && typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null;
    const selEnd = activeEl && typeof activeEl.selectionEnd === 'number' ? activeEl.selectionEnd : null;

    const draftGroupObs = document.getElementById('newGroupObservationText')?.value;
    const draftSchoolObs = document.getElementById('newSchoolObservationText')?.value;
    const draftStudentObs = document.getElementById('newObservationText')?.value;
    const draftSessionNote = document.getElementById('attendanceSessionNote')?.value;
    const draftStudentNotes = {};
    document.querySelectorAll('.attendance-row').forEach(row => {
        const stId = row.dataset.studentId;
        const inp = row.querySelector('.attendance-note-input');
        if (stId && inp && inp.value) {
            draftStudentNotes[stId] = inp.value;
        }
    });

    const wasGroupInfoOpen = document.getElementById('groupInfoContent')?.style.display === 'block';
    const wasPdaHistoryOpen = document.getElementById('pdaHistoryContent')?.style.display === 'block';
    const wasStudentsOpen = document.getElementById('studentsSectionContent')?.style.display === 'block';

    if (viewStudentDetail && viewStudentDetail.classList.contains('active') && typeof currentStudentId !== 'undefined' && currentStudentId) {
        if (typeof showStudentDetail === 'function') showStudentDetail(currentStudentId);
    } else if (viewGroupDetail && viewGroupDetail.classList.contains('active') && typeof currentGroupId !== 'undefined' && currentGroupId) {
        showGroupDetail(currentGroupId);
    } else if (viewSchoolDetail && viewSchoolDetail.classList.contains('active') && typeof currentSchoolId !== 'undefined' && currentSchoolId) {
        showSchoolDetail(currentSchoolId);
    } else if (viewSchools && viewSchools.classList.contains('active')) {
        renderSchools();
    }

    // Restore collapsible states on group detail
    if (wasGroupInfoOpen) {
        const el = document.getElementById('groupInfoContent');
        const ic = document.getElementById('groupInfoToggleIcon');
        if (el) el.style.display = 'block';
        if (ic) ic.textContent = '▲';
    }
    if (wasPdaHistoryOpen) {
        const el = document.getElementById('pdaHistoryContent');
        const ic = document.getElementById('pdaHistoryToggleIcon');
        if (el) el.style.display = 'block';
        if (ic) ic.textContent = '▲';
    }
    if (wasStudentsOpen) {
        const el = document.getElementById('studentsSectionContent');
        const ic = document.getElementById('studentsSectionToggleIcon');
        if (el) el.style.display = 'block';
        if (ic) ic.textContent = '▲';
    }

    // Restore unsaved input drafts
    if (typeof draftGroupObs === 'string' && draftGroupObs.length > 0) {
        const ta = document.getElementById('newGroupObservationText');
        if (ta) ta.value = draftGroupObs;
    }
    if (typeof draftSchoolObs === 'string' && draftSchoolObs.length > 0) {
        const ta = document.getElementById('newSchoolObservationText');
        if (ta) ta.value = draftSchoolObs;
    }
    if (typeof draftStudentObs === 'string' && draftStudentObs.length > 0) {
        const ta = document.getElementById('newObservationText');
        if (ta) ta.value = draftStudentObs;
    }
    if (typeof draftSessionNote === 'string' && draftSessionNote.length > 0) {
        const inp = document.getElementById('attendanceSessionNote');
        if (inp) inp.value = draftSessionNote;
    }
    Object.entries(draftStudentNotes).forEach(([stId, val]) => {
        const inp = document.querySelector(`.attendance-row[data-student-id="${stId}"] .attendance-note-input`);
        if (inp) inp.value = val;
    });

    // Restore focus and cursor position
    let targetToFocus = null;
    if (activeId) {
        targetToFocus = document.getElementById(activeId);
    } else if (activeStudentNoteId) {
        targetToFocus = document.querySelector(`.attendance-row[data-student-id="${activeStudentNoteId}"] .attendance-note-input`);
    }
    if (targetToFocus && typeof targetToFocus.focus === 'function') {
        targetToFocus.focus({ preventScroll: true });
        if (selStart !== null && typeof targetToFocus.setSelectionRange === 'function') {
            try {
                targetToFocus.setSelectionRange(selStart, selEnd ?? selStart);
            } catch (e) { }
        }
    }

    window.scrollTo(scrollX, scrollY);
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
