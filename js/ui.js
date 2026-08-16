// Theme & Appearance Settings
function setThemeMode(mode) {
    const html = document.documentElement;
    html.setAttribute('data-theme', mode);
    localStorage.setItem('themeMode', mode);
    updateSettingsUI();
}

function setThemePalette(palette) {
    const html = document.documentElement;
    html.setAttribute('data-palette', palette);
    localStorage.setItem('themePalette', palette);
    updateSettingsUI();
}

function setUiStyle(style) {
    const html = document.documentElement;
    html.setAttribute('data-ui-style', style);
    localStorage.setItem('uiStyle', style);
    updateSettingsUI();
}

function updateSettingsUI() {
    const html = document.documentElement;
    const currentMode = html.getAttribute('data-theme') || 'light';
    const currentPalette = html.getAttribute('data-palette') || 'classic';
    const currentStyle = html.getAttribute('data-ui-style') || 'classic';

    // Update UI Style buttons
    const classicStyleBtn = document.getElementById('uiStyleClassic');
    const modernStyleBtn = document.getElementById('uiStyleModern');
    if (classicStyleBtn && modernStyleBtn) {
        classicStyleBtn.classList.toggle('active', currentStyle === 'classic');
        modernStyleBtn.classList.toggle('active', currentStyle === 'modern');
    }

    // Update mode buttons
    const lightBtn = document.getElementById('themeModeLight');
    const darkBtn = document.getElementById('themeModeDark');
    if (lightBtn && darkBtn) {
        lightBtn.classList.toggle('active', currentMode === 'light');
        darkBtn.classList.toggle('active', currentMode === 'dark');
    }

    // Update palette cards
    document.querySelectorAll('.palette-card').forEach(card => {
        const pal = card.dataset.palette;
        card.classList.toggle('active', pal === currentPalette);
    });
}

function openSettingsModal() {
    updateSettingsUI();
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('active');
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('active');
}

// Load saved theme & palette on startup
function initThemeSettings() {
    const savedMode = localStorage.getItem('themeMode') || localStorage.getItem('theme') || 'light';
    const savedPalette = localStorage.getItem('themePalette') || 'classic';
    const savedStyle = localStorage.getItem('uiStyle') || 'classic';

    const html = document.documentElement;
    html.setAttribute('data-theme', savedMode);
    html.setAttribute('data-palette', savedPalette);
    html.setAttribute('data-ui-style', savedStyle);
    updateSettingsUI();
}

initThemeSettings();

// Navigation
function showView(viewName) {
    document.querySelectorAll('.view-groups, .view-group-detail, .view-student-detail, .view-trash').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewName).classList.add('active');
}

// Helper for fallback download
function downloadJsonFile(data, defaultName) {
    const fileNameToUse = defaultName || getDefaultFileName();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileNameToUse;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    hasUnsavedChanges = false;
    currentFileName = a.download;
    localStorage.setItem('lastFileName', a.download);
    updateWindowTitle();
}

// File System: Guardar / Guardar Como
async function exportData() {
    try {
        if (currentFileHandle) {
            const success = await saveToFile(currentFileHandle);
            if (success) {
                alert('Archivo guardado correctamente.');
                return;
            }
        }
        await exportAsData();
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error al guardar:', err);
            downloadJsonFile(appData, getDefaultFileName());
            alert('Archivo descargado correctamente.');
        }
    }
}

async function exportAsData() {
    const suggested = getDefaultFileName();
    if (typeof window.showSaveFilePicker === 'function') {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggested,
                types: [{
                    description: 'Archivo JSON (*.json)',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            currentFileHandle = handle;
            if (handle.name) {
                currentFileName = handle.name;
                localStorage.setItem('lastFileName', handle.name);
            }
            await setStoredHandle('activeFileHandle', handle);

            const success = await saveToFile(currentFileHandle);
            if (success) {
                alert('Archivo guardado correctamente.');
            } else {
                alert('Error al escribir en el archivo.');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error al guardar como:', err);
                downloadJsonFile(appData, suggested);
                alert('Archivo descargado correctamente.');
            }
        }
    } else {
        // Fallback for Firefox/Safari
        downloadJsonFile(appData, suggested);
        alert('Archivo descargado correctamente.');
    }
}

// File System: Abrir Archivo
async function importData() {
    if (hasUnsavedChanges) {
        if (!confirm('Tienes cambios sin guardar. ¿Estás seguro de que deseas abrir otro archivo y perderlos?')) {
            return;
        }
    }

    if (typeof window.showOpenFilePicker === 'function') {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Archivo JSON (*.json)',
                    accept: { 'application/json': ['.json'] }
                }]
            });

            const file = await handle.getFile();
            const content = await file.text();
            let imported = JSON.parse(content);

            if (typeof isEncryptedPayload === 'function' && isEncryptedPayload(imported)) {
                const pass = prompt('Este archivo de respaldo está protegido con contraseña. Por favor, ingrésala para descifrarlo:');
                if (!pass) return;
                imported = await decryptData(imported, pass);
                activeSessionPassword = pass;
            }

            if (!imported || !Array.isArray(imported.groups)) {
                throw new Error('Formato de archivo inválido');
            }

            appData = imported;
            delete appData.password;
            if (!appData.deletedItems) appData.deletedItems = [];
            currentFileHandle = handle;
            if (handle.name) {
                currentFileName = handle.name;
                localStorage.setItem('lastFileName', handle.name);
            }
            await setStoredHandle('activeFileHandle', handle);
            hasUnsavedChanges = false;

            await saveData();

            updateWindowTitle();
            renderGroups();
            alert('Archivo abierto y cargado correctamente.');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error al abrir:', err);
                alert('Error al abrir el archivo. Verifica que la contraseña sea correcta o que sea un respaldo válido.');
            }
        }
    } else {
        // Fallback for Firefox/Safari using hidden file input
        const fileInput = document.getElementById('fallbackFileInput');
        if (!fileInput) return;

        fileInput.value = '';
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    let imported = JSON.parse(event.target.result);
                    if (typeof isEncryptedPayload === 'function' && isEncryptedPayload(imported)) {
                        const pass = prompt('Este archivo está cifrado. Por favor, introduce la contraseña para descifrarlo:');
                        if (!pass) return;
                        imported = await decryptData(imported, pass);
                        activeSessionPassword = pass;
                    }

                    if (!imported || !Array.isArray(imported.groups)) {
                        throw new Error('Formato de archivo inválido');
                    }

                    appData = imported;
                    delete appData.password;
                    if (!appData.deletedItems) appData.deletedItems = [];
                    currentFileHandle = null;
                    currentFileName = file.name;
                    localStorage.setItem('lastFileName', file.name);
                    hasUnsavedChanges = false;

                    await saveData();

                    updateWindowTitle();
                    renderGroups();
                    alert('Archivo abierto y cargado correctamente.');
                } catch (err) {
                    console.error('Error al abrir archivo fallback:', err);
                    alert('Error al abrir el archivo. Verifica que la contraseña sea correcta.');
                }
            };
            reader.readAsText(file);
        };
        fileInput.click();
    }
}

// Event Listeners
function setupEventListeners() {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('passwordInput').value;
            login(password);
        });
    }

    // Set / Change Password Modal listeners
    const setPasswordBtn = document.getElementById('setPasswordBtn');
    if (setPasswordBtn) {
        setPasswordBtn.addEventListener('click', () => {
            const saved = localStorage.getItem('pedagogicalData');
            if (!saved) {
                openSetPasswordModal('setup');
            } else {
                if (confirm('¿Deseas restablecer o configurar una nueva contraseña? (Si ya tienes datos guardados, se requerirá ingresar la contraseña activa o se iniciará una base de datos nueva).')) {
                    openSetPasswordModal('setup');
                }
            }
        });
    }

    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            closeSettingsModal();
            openSetPasswordModal('change');
        });
    }

    const setPasswordForm = document.getElementById('setPasswordForm');
    if (setPasswordForm) {
        setPasswordForm.addEventListener('submit', handleSetPasswordSubmit);
    }

    const closeSetPasswordModalBtn = document.getElementById('closeSetPasswordModalBtn');
    if (closeSetPasswordModalBtn) {
        closeSetPasswordModalBtn.addEventListener('click', closeSetPasswordModal);
    }

    const cancelSetPasswordBtn = document.getElementById('cancelSetPasswordBtn');
    if (cancelSetPasswordBtn) {
        cancelSetPasswordBtn.addEventListener('click', closeSetPasswordModal);
    }

    const setPasswordModal = document.getElementById('setPasswordModal');
    if (setPasswordModal) {
        setPasswordModal.addEventListener('click', (e) => {
            if (e.target.id === 'setPasswordModal') closeSetPasswordModal();
        });
    }

    // Prevenir el envío por defecto de los formularios en los modales (evita recarga al dar Enter)
    document.getElementById('groupForm')?.addEventListener('submit', (e) => e.preventDefault());
    document.getElementById('studentForm')?.addEventListener('submit', (e) => e.preventDefault());

    // Settings & Appearance
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
    }
    const loginSettingsBtn = document.getElementById('loginSettingsBtn');
    if (loginSettingsBtn) {
        loginSettingsBtn.addEventListener('click', openSettingsModal);
    }
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }

    const styleClassicBtn = document.getElementById('uiStyleClassic');
    if (styleClassicBtn) {
        styleClassicBtn.addEventListener('click', () => setUiStyle('classic'));
    }
    const styleModernBtn = document.getElementById('uiStyleModern');
    if (styleModernBtn) {
        styleModernBtn.addEventListener('click', () => setUiStyle('modern'));
    }

    const modeLightBtn = document.getElementById('themeModeLight');
    if (modeLightBtn) {
        modeLightBtn.addEventListener('click', () => setThemeMode('light'));
    }
    const modeDarkBtn = document.getElementById('themeModeDark');
    if (modeDarkBtn) {
        modeDarkBtn.addEventListener('click', () => setThemeMode('dark'));
    }

    document.querySelectorAll('.palette-card').forEach(card => {
        card.addEventListener('click', () => {
            const palette = card.dataset.palette;
            if (palette) setThemePalette(palette);
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Export/Import
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('exportAsDataBtn').addEventListener('click', exportAsData);
    document.getElementById('importDataBtn').addEventListener('click', importData);

    // Alert on beforeunload if unsaved
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = ''; // Required for some browsers
        }
    });

    // Keyboard shortcuts for Save/Open
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (e.shiftKey) {
                exportAsData();
            } else {
                exportData();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
            e.preventDefault();
            importData();
        }
    });


    // Navigation
    document.getElementById('backToGroups').addEventListener('click', (e) => {
        e.preventDefault();
        showView('viewGroups');
        renderGroups();
    });

    document.getElementById('backToGroup').addEventListener('click', (e) => {
        e.preventDefault();
        showGroupDetail(currentGroupId);
    });

    // Trash View
    document.getElementById('viewTrashBtn').addEventListener('click', () => {
        showView('viewTrash');
        renderTrash(); // defined in trash.js
    });
    document.getElementById('backToGroupsFromTrash').addEventListener('click', (e) => {
        e.preventDefault();
        showView('viewGroups');
        renderGroups();
    });

    // Filter Toggle
    document.getElementById('toggleFilterBtn').addEventListener('click', () => {
        const container = document.getElementById('interestFilterContainer');
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    });

    // Students Section Header Toggle
    const studentsHeader = document.getElementById('studentsSectionHeader');
    if (studentsHeader) {
        studentsHeader.addEventListener('click', () => {
            const content = document.getElementById('studentsSectionContent');
            const icon = document.getElementById('studentsSectionToggleIcon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▲';
            } else {
                content.style.display = 'none';
                icon.textContent = '▼';
            }
        });
    }

    // Student Search Input
    const searchStudentInput = document.getElementById('searchStudentInput');
    if (searchStudentInput) {
        searchStudentInput.addEventListener('input', (e) => {
            currentStudentSearchQuery = e.target.value;
            const group = appData.groups.find(g => g.id === currentGroupId);
            if (group) {
                renderStudentsTable(filterStudentsList(group.students || []));
            }
        });
    }

    // Groups
    document.getElementById('addGroupBtn').addEventListener('click', () => openGroupModal());
    document.getElementById('editGroupBtn').addEventListener('click', () => openGroupModal(currentGroupId));
    document.getElementById('deleteGroupBtn').addEventListener('click', deleteGroup);
    document.getElementById('cancelGroupBtn').addEventListener('click', closeGroupModal);
    document.getElementById('saveGroupBtn').addEventListener('click', saveGroup);

    // Students
    document.getElementById('exportStudentPdfBtn').addEventListener('click', () => exportStudentToPDF(currentStudentId));
    document.getElementById('addStudentBtn').addEventListener('click', () => openStudentModal());
    document.getElementById('importStudentsBtn').addEventListener('click', openImportStudentsModal);
    document.getElementById('exportStudentsBtn').addEventListener('click', openExportStudentsModal);
    document.getElementById('editStudentBtn').addEventListener('click', () => openStudentModal(currentStudentId));
    document.getElementById('deleteStudentBtn').addEventListener('click', deleteStudent);
    document.getElementById('cancelStudentBtn').addEventListener('click', closeStudentModal);
    document.getElementById('saveStudentBtn').addEventListener('click', saveStudent);

    // Mass Import & Export Event Handlers
    const tabPasteBtn = document.getElementById('importTabPaste');
    if (tabPasteBtn) {
        tabPasteBtn.addEventListener('click', () => switchImportTab('paste'));
    }
    const tabFileBtn = document.getElementById('importTabFile');
    if (tabFileBtn) {
        tabFileBtn.addEventListener('click', () => switchImportTab('file'));
    }

    const pasteTextarea = document.getElementById('importPasteTextarea');
    if (pasteTextarea) {
        const updatePreviewFromPaste = () => {
            const raw = pasteTextarea.value;
            const parsed = parseStudentsText(raw);
            renderImportPreview(parsed);
        };
        pasteTextarea.addEventListener('input', updatePreviewFromPaste);
        pasteTextarea.addEventListener('paste', () => {
            setTimeout(updatePreviewFromPaste, 50);
        });
    }

    const dropzone = document.getElementById('importDropzone');
    const csvFileInput = document.getElementById('importCsvFileInput');
    if (dropzone && csvFileInput) {
        dropzone.addEventListener('click', () => csvFileInput.click());

        const handleCsvFile = (file) => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                pasteTextarea.value = text;
                const parsed = parseStudentsText(text);
                renderImportPreview(parsed);
                switchImportTab('paste');
            };
            reader.readAsText(file, 'UTF-8');
        };

        csvFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleCsvFile(e.target.files[0]);
            }
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleCsvFile(e.dataTransfer.files[0]);
            }
        });
    }

    const clearImportBtn = document.getElementById('importClearBtn');
    if (clearImportBtn) {
        clearImportBtn.addEventListener('click', () => {
            if (pasteTextarea) pasteTextarea.value = '';
            if (csvFileInput) csvFileInput.value = '';
            renderImportPreview([]);
        });
    }

    const cancelImportBtn = document.getElementById('cancelImportBtn');
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', closeImportStudentsModal);
    }

    const confirmImportBtn = document.getElementById('confirmImportBtn');
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', executeStudentsImport);
    }

    const cancelExportStudentsBtn = document.getElementById('cancelExportStudentsBtn');
    if (cancelExportStudentsBtn) {
        cancelExportStudentsBtn.addEventListener('click', closeExportStudentsModal);
    }

    const confirmExportStudentsBtn = document.getElementById('confirmExportStudentsBtn');
    if (confirmExportStudentsBtn) {
        confirmExportStudentsBtn.addEventListener('click', executeExportStudentsCSV);
    }

    // PDA Autocomplete
    document.getElementById('groupPDA').addEventListener('keyup', showPdaSuggestions);
    document.getElementById('groupPDA').addEventListener('focus', showPdaSuggestions);
    document.getElementById('groupGrade').addEventListener('change', () => {
        showPdaSuggestions(); // Actualizar sugerencias si hay texto escrito
    });
    document.getElementById('pdaSuggestions').addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (item && item.dataset.pda) {
            document.getElementById('groupPDA').value = item.dataset.pda;
            document.getElementById('groupPDAContent').value = item.dataset.content;
            document.getElementById('pdaSuggestions').style.display = 'none';
        }
    });
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        const suggestionsContainer = document.getElementById('pdaSuggestions');
        const pdaInput = document.getElementById('groupPDA');
        if (!suggestionsContainer.contains(e.target) && e.target !== pdaInput) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Close modals on outside click
    document.getElementById('groupModal').addEventListener('click', (e) => {
        if (e.target.id === 'groupModal') closeGroupModal();
    });

    document.getElementById('studentModal').addEventListener('click', (e) => {
        if (e.target.id === 'studentModal') closeStudentModal();
    });

    document.getElementById('importStudentsModal').addEventListener('click', (e) => {
        if (e.target.id === 'importStudentsModal') closeImportStudentsModal();
    });

    document.getElementById('exportStudentsModal').addEventListener('click', (e) => {
        if (e.target.id === 'exportStudentsModal') closeExportStudentsModal();
    });

    document.getElementById('pdaHistoryModal').addEventListener('click', (e) => {
        if (e.target.id === 'pdaHistoryModal') closePdaHistoryModal();
    });

    document.getElementById('cancelPdaHistoryBtn').addEventListener('click', closePdaHistoryModal);
    document.getElementById('savePdaHistoryBtn').addEventListener('click', savePdaHistory);
    document.getElementById('pdaHistoryForm').addEventListener('submit', (e) => e.preventDefault());

    // Activity Modal
    document.getElementById('activityModal').addEventListener('click', (e) => {
        if (e.target.id === 'activityModal') closeActivityModal();
    });
    document.getElementById('cancelActivityBtn').addEventListener('click', closeActivityModal);
    document.getElementById('saveActivityBtn').addEventListener('click', saveActivity);
    document.getElementById('activityForm').addEventListener('submit', (e) => e.preventDefault());

    document.getElementById('interestInput').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const tagValue = this.value.trim();
            if (tagValue && !currentStudentInterests.includes(tagValue)) {
                currentStudentInterests.push(tagValue);
                this.value = '';
                renderInterestTags();
            }
        }
    });

    document.getElementById('careerInput').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const tagValue = this.value.trim();
            if (tagValue && !currentStudentFutureCareers.includes(tagValue)) {
                currentStudentFutureCareers.push(tagValue);
                this.value = '';
                renderCareerTags();
            }
        }
    });

    setupDragAndDrop();
}
function setupDragAndDrop() {
    const loginScreen = document.getElementById('loginScreen');
    const loginContainer = document.querySelector('.login-container');
    const dragOverlay = document.getElementById('dragOverlay');

    if (!loginScreen || !loginContainer || !dragOverlay) return;

    let dragCounter = 0;

    // Prevent defaults for drag events at window level
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    loginScreen.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Convert types to array to safely use includes
        const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : [];
        if (types.includes('Files') || types.includes('application/json')) {
            dragCounter++;
            dragOverlay.classList.add('active');
        }
    }, false);

    loginScreen.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);

    loginScreen.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : [];
        if (types.includes('Files') || types.includes('application/json')) {
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                dragOverlay.classList.remove('active');
            }
        }
    }, false);

    loginScreen.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        dragCounter = 0;
        dragOverlay.classList.remove('active');

        // Check if File System Handle can be acquired from drop
        let droppedHandle = null;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && typeof e.dataTransfer.items[0].getAsFileSystemHandle === 'function') {
            try {
                const itemHandle = await e.dataTransfer.items[0].getAsFileSystemHandle();
                if (itemHandle && itemHandle.kind === 'file') {
                    droppedHandle = itemHandle;
                }
            } catch (err) {
                console.log('No se pudo obtener el FileSystemHandle del arrastre:', err);
            }
        }

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === "application/json" || file.name.endsWith('.json')) {
                reader.onload = async function(event) {
                    try {
                        let imported = JSON.parse(event.target.result);
                        
                        if (typeof isEncryptedPayload === 'function' && isEncryptedPayload(imported)) {
                            // El archivo arrastrado está cifrado con Web Crypto: guardarlo y pedir contraseña en el login
                            localStorage.setItem('pedagogicalData', JSON.stringify(imported));
                            currentFileHandle = droppedHandle;
                            currentFileName = droppedHandle ? droppedHandle.name : file.name;
                            localStorage.setItem('lastFileName', currentFileName);
                            if (droppedHandle) setStoredHandle('activeFileHandle', droppedHandle);
                            hasUnsavedChanges = false;
                            updateWindowTitle();
                            alert('Archivo protegido detectado. Por favor, introduce la contraseña para ingresar.');
                            document.getElementById('passwordInput').value = '';
                            document.getElementById('passwordInput').focus();
                            return;
                        }

                        if (!imported || !Array.isArray(imported.groups)) {
                            throw new Error('Formato de archivo inválido');
                        }

                        appData = imported;
                        delete appData.password;
                        if (!appData.deletedItems) appData.deletedItems = [];
                        currentFileHandle = droppedHandle;
                        currentFileName = droppedHandle ? droppedHandle.name : file.name;
                        localStorage.setItem('lastFileName', currentFileName);
                        if (droppedHandle) {
                            setStoredHandle('activeFileHandle', droppedHandle);
                        }
                        hasUnsavedChanges = false;

                        if (typeof activeSessionPassword !== 'undefined' && activeSessionPassword) {
                            await saveData();
                            document.getElementById('loginScreen').style.display = 'none';
                            document.getElementById('appContainer').classList.add('active');
                            renderGroups();
                        } else {
                            openSetPasswordModal('setup');
                        }
                        updateWindowTitle();
                    } catch (err) {
                        console.error('Error al importar archivo arrastrado:', err);
                        alert('Error al importar el archivo. Asegúrate de que sea un archivo de respaldo de gestión pedagógica válido.');
                    }
                };
                reader.readAsText(file);
            } else {
                alert('Por favor, arrastra únicamente un archivo con extensión .json');
            }
        }
    }, false);
}

// ===== Progressive Web App (PWA) Support =====
var deferredInstallPrompt = null;

function setupPwaSupport() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('[PWA] Service Worker registrado exitosamente con scope:', reg.scope);
                })
                .catch(err => {
                    console.warn('[PWA] Error al registrar Service Worker:', err);
                });
        });
    }

    // 2. Intercept install prompt for custom install buttons
    const installAppBtn = document.getElementById('installAppBtn');
    const settingsInstallAppBtn = document.getElementById('settingsInstallAppBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (installAppBtn) installAppBtn.style.display = 'inline-flex';
        if (settingsInstallAppBtn) settingsInstallAppBtn.style.display = 'inline-block';
    });

    const triggerInstall = async () => {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            console.log(`[PWA] Respuesta de instalación del usuario: ${outcome}`);
            deferredInstallPrompt = null;
            if (installAppBtn) installAppBtn.style.display = 'none';
        } else {
            alert('Para instalar esta aplicación:\n\n📱 En Android (Chrome/Edge): Toca el menú de 3 puntos (⋮) y selecciona "Instalar aplicación" o "Agregar a la pantalla principal".\n\n🍎 En iPhone / iPad (Safari): Toca el botón Compartir (⬆) y selecciona "Agregar al inicio".\n\n💻 En Windows / Mac (Chrome/Edge): Haz clic en el icono de instalación (⊕ o pantalla) en la barra de direcciones.');
        }
    };

    if (installAppBtn) installAppBtn.addEventListener('click', triggerInstall);
    if (settingsInstallAppBtn) settingsInstallAppBtn.addEventListener('click', triggerInstall);

    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Aplicación instalada con éxito en el dispositivo.');
        deferredInstallPrompt = null;
        if (installAppBtn) installAppBtn.style.display = 'none';
        if (settingsInstallAppBtn) settingsInstallAppBtn.textContent = '✅ Aplicación ya instalada';
    });
}

// Initialize
function init() {
    loadData();
    setupEventListeners();
    setupPwaSupport();
    checkAuth();
}

// Start app
init();
