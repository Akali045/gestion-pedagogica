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
    document.querySelectorAll('.view-groups, .view-group-detail, .view-student-detail').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewName).classList.add('active');
}

// File System: Guardar / Guardar Como
async function exportData() {
    try {
        if (!currentFileHandle) {
            const handle = await window.showSaveFilePicker({
                suggestedName: `gestion-pedagogica-${new Date().toISOString().split('T')[0]}.json`,
                types: [{
                    description: 'Archivo JSON',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            currentFileHandle = handle;
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
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            exportData();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
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
}

// Initialize
function init() {
    loadData();
    setupEventListeners();
    checkAuth();
}

// Start app
init();
