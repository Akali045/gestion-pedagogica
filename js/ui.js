// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', newTheme);
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('themeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// Navigation
function showView(viewName) {
    document.querySelectorAll('.view-groups, .view-group-detail, .view-student-detail, .view-trash').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewName).classList.add('active');
}

// File System: Guardar / Guardar Como
async function exportData() {
    try {
        if (!currentFileHandle) {
            await exportAsData();
            return;
        }

        const success = await saveToFile(currentFileHandle);
        if (success) {
            alert('Archivo guardado correctamente.');
        } else {
            alert('Error al guardar el archivo.');
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error al guardar:', err);
            alert('Hubo un problema al intentar guardar el archivo.');
        }
    }
}

async function exportAsData() {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: `gestion-pedagogica-${new Date().toISOString().split('T')[0]}.json`,
            types: [{
                description: 'Archivo JSON',
                accept: { 'application/json': ['.json'] }
            }]
        });
        currentFileHandle = handle;

        const success = await saveToFile(currentFileHandle);
        if (success) {
            alert('Archivo guardado correctamente.');
        } else {
            alert('Error al guardar el archivo.');
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error al guardar como:', err);
            alert('Hubo un problema al intentar guardar el archivo.');
        }
    }
}

// File System: Abrir Archivo
async function importData() {
    if (hasUnsavedChanges) {
        if (!confirm('Tienes cambios sin guardar. ¿Estás seguro de que deseas abrir otro archivo y perderlos?')) {
            return;
        }
    }

    try {
        const [handle] = await window.showOpenFilePicker({
            types: [{
                description: 'Archivo JSON',
                accept: { 'application/json': ['.json'] }
            }]
        });

        const file = await handle.getFile();
        const content = await file.text();
        const imported = JSON.parse(content);

        if (!imported || !Array.isArray(imported.groups)) {
            throw new Error('Formato de archivo inválido');
        }

        appData = imported;
        if (!appData.deletedItems) appData.deletedItems = [];
        currentFileHandle = handle;
        hasUnsavedChanges = false;

        // Remove legacy LS data if they chose to open a file instead
        localStorage.removeItem('pedagogicalData');

        updateWindowTitle();
        renderGroups();
        alert('Archivo abierto correctamente.');
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error al abrir:', err);
            alert('Error al abrir el archivo. Verifica que sea un archivo de respaldo válido.');
        }
    }
}

// Event Listeners
function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('passwordInput').value;
        login(password);
    });

    // Prevenir el envío por defecto de los formularios en los modales (evita recarga al dar Enter)
    document.getElementById('groupForm').addEventListener('submit', (e) => e.preventDefault());
    document.getElementById('studentForm').addEventListener('submit', (e) => e.preventDefault());

    document.getElementById('setPasswordBtn').addEventListener('click', () => {
        if (confirm('¿Deseas restablecer tu contraseña? Esto borrará todos tus datos.')) {
            appData = { password: '', groups: [] };
            saveData();
            location.reload();
        }
    });

    // Theme
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

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

    // Groups
    document.getElementById('addGroupBtn').addEventListener('click', () => openGroupModal());
    document.getElementById('editGroupBtn').addEventListener('click', () => openGroupModal(currentGroupId));
    document.getElementById('deleteGroupBtn').addEventListener('click', deleteGroup);
    document.getElementById('cancelGroupBtn').addEventListener('click', closeGroupModal);
    document.getElementById('saveGroupBtn').addEventListener('click', saveGroup);

    // Students
    document.getElementById('exportStudentPdfBtn').addEventListener('click', () => exportStudentToPDF(currentStudentId));
    document.getElementById('addStudentBtn').addEventListener('click', () => openStudentModal());
    document.getElementById('editStudentBtn').addEventListener('click', () => openStudentModal(currentStudentId));
    document.getElementById('deleteStudentBtn').addEventListener('click', deleteStudent);
    document.getElementById('cancelStudentBtn').addEventListener('click', closeStudentModal);
    document.getElementById('saveStudentBtn').addEventListener('click', saveStudent);

    // PDA Autocomplete
    document.getElementById('groupPDA').addEventListener('keyup', showPdaSuggestions);
    document.getElementById('groupGrade').addEventListener('change', () => {
        document.getElementById('groupPDA').value = '';
        document.getElementById('groupPDAContent').value = '';
        showPdaSuggestions(); // Update suggestions based on new grade
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

    loginScreen.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        dragCounter = 0;
        dragOverlay.classList.remove('active');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === "application/json" || file.name.endsWith('.json')) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        const imported = JSON.parse(event.target.result);
                        if (!imported || !Array.isArray(imported.groups)) {
                            throw new Error('Formato de archivo inválido');
                        }

                        appData = imported;
                        if (!appData.deletedItems) appData.deletedItems = [];
                        currentFileHandle = null;
                        hasUnsavedChanges = false;

                        localStorage.removeItem('pedagogicalData');

                        updateWindowTitle();

                        if (!appData.password) {
                            appData.password = '';
                            login('');
                        } else {
                            alert('Datos cargados correctamente. Por favor, introduce la contraseña para ingresar.');
                            document.getElementById('passwordInput').value = '';
                            document.getElementById('passwordInput').focus();
                        }
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

// Initialize
function init() {
    loadData();
    setupEventListeners();
    checkAuth();
}

// Start app
init();
