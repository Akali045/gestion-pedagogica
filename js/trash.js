function renderTrash() {
    const container = document.getElementById('trashContainer');
    if (!appData.deletedItems || appData.deletedItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>La papelera está vacía</h3>
                <p>No hay elementos eliminados recientemente</p>
            </div>
        `;
        return;
    }

    const html = appData.deletedItems.map((item, index) => {
        const typeStr = item.type === 'group' ? 'Grupo' : 'Alumno';
        const date = new Date(item.deletedAt).toLocaleString();
        return `
            <div class="group-card" style="border-left-color: var(--danger);">
                <div class="group-card-header">
                    <h3>${item.name} <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-tertiary);">(${typeStr})</span></h3>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 0.5rem;">Eliminado: ${date}</p>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-small btn-secondary" onclick="restoreItem(${index})">Restaurar</button>
                    <button class="btn btn-small btn-danger" onclick="permanentDeleteItem(${index})">Borrar</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="groups-grid">${html}</div>`;
}

function restoreItem(index) {
    const item = appData.deletedItems[index];

    if (item.type === 'group') {
        appData.groups.push(item.data);
    } else if (item.type === 'student') {
        const parentGroup = appData.groups.find(g => g.id === item.parentId);
        if (!parentGroup) {
            alert('Error: No se puede restaurar el alumno porque su grupo original ha sido eliminado. Restaura primero el grupo.');
            return;
        }
        parentGroup.students.push(item.data);
    }

    appData.deletedItems.splice(index, 1);
    saveData();
    renderTrash();
    renderGroups(); // Ensure the groups view stays updated
}

function permanentDeleteItem(index) {
    if (confirm('Esta acción eliminará permanentemente el elemento y todos sus datos. ¿Deseas continuar?')) {
        appData.deletedItems.splice(index, 1);
        saveData();
        renderTrash();
    }
}

function emptyTrash() {
    if (!appData.deletedItems || appData.deletedItems.length === 0) return;
    if (confirm('¿Estás seguro de que deseas vaciar toda la papelera? Esta acción eliminará permanentemente todos los elementos y no se puede deshacer.')) {
        appData.deletedItems = [];
        saveData();
        renderTrash();
    }
}

// Attach listener later from UI, but inline for scope is fine if the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('emptyTrashBtn');
    if(btn) btn.addEventListener('click', emptyTrash);
});
