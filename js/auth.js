// Authentication
function checkAuth() {
    if (!appData.password) {
        showSetPasswordPrompt();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
    }
}

function showSetPasswordPrompt() {
    const password = prompt('Bienvenido! Por favor, establece una contraseña para proteger tu información:');
    if (password && password.length >= 4) {
        appData.password = password;
        saveData();
        login(password);
    } else {
        alert('La contraseña debe tener al menos 4 caracteres.');
        showSetPasswordPrompt();
    }
}

function login(password) {
    if (password === appData.password) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').classList.add('active');
        renderGroups();
    } else {
        showError('Contraseña incorrecta');
    }
}

function logout() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').classList.remove('active');
    document.getElementById('passwordInput').value = '';
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}
