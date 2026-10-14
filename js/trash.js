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
        let typeStr = 'Elemento';
        if (item.type === 'school') typeStr = 'Centro de Trabajo';
        else if (item.type === 'group') typeStr = 'Grupo';
        else if (item.type === 'student') typeStr = 'Alumno';

        const date = new Date(item.deletedAt).toLocaleString();
        return `
            <div class="group-card" style="border-left-color: var(--danger);">
                <div class="group-card-header">
                    <h3>${escapeHTML(item.name || item.data?.name || item.data?.fullName)} <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-tertiary);">(${typeStr})</span></h3>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 0.5rem;">Eliminado: ${escapeHTML(date)}</p>
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
    if (!item) return;

    if (item.type === 'school') {
        if (!appData.schools) appData.schools = [];
        appData.schools.push(item.data);
    } else if (item.type === 'group') {
        let parentSchool = item.parentId ? getSchoolById(item.parentId) : null;
        if (!parentSchool && appData.schools && appData.schools.length > 0) {
            let optionsText = 'Selecciona el Centro de Trabajo donde deseas ubicar este grupo:\n\n';
            appData.schools.forEach((s, i) => {
                optionsText += `${i + 1}. ${s.name} ${s.turn ? `(${s.turn})` : ''}\n`;
            });
            optionsText += `${appData.schools.length + 1}. Restaurar como Grupo sin Asignar\n`;

            const choice = prompt(optionsText, '1');
            if (choice !== null) {
                const chosenIndex = parseInt(choice, 10) - 1;
                if (chosenIndex >= 0 && chosenIndex < appData.schools.length) {
                    parentSchool = appData.schools[chosenIndex];
                }
            }
        }

        if (parentSchool) {
            if (!Array.isArray(parentSchool.groups)) parentSchool.groups = [];
            parentSchool.groups.push(item.data);
        } else {
            if (!Array.isArray(appData.unassignedGroups)) appData.unassignedGroups = [];
            appData.unassignedGroups.push(item.data);
        }
    } else if (item.type === 'student') {
        let parentGroup = findGroupById(item.parentId);
        
        if (!parentGroup) {
            const allGroups = getAllGroups();
            if (allGroups.length === 0) {
                alert('No se puede restaurar el alumno porque no hay ningún grupo activo. Por favor, crea o restaura un grupo primero.');
                return;
            }
            
            let optionsText = 'El grupo original de este alumno ya no existe.\nSelecciona el número del grupo donde deseas ubicarlo:\n\n';
            allGroups.forEach((g, i) => {
                optionsText += `${i + 1}. ${g.name} (${g.grade}° Grado)\n`;
            });
            
            const choice = prompt(optionsText, '1');
            if (choice === null) return;
            
            const chosenIndex = parseInt(choice, 10) - 1;
            if (isNaN(chosenIndex) || !allGroups[chosenIndex]) {
                alert('Selección no válida. No se restauró el alumno.');
                return;
            }
            
            parentGroup = allGroups[chosenIndex];
        }
        
        if (!parentGroup.students) parentGroup.students = [];
        parentGroup.students.push(item.data);
    }

    appData.deletedItems.splice(index, 1);
    saveData();
    renderTrash();
    if (typeof renderSchools === 'function') renderSchools();
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

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('emptyTrashBtn');
    if(btn) btn.addEventListener('click', emptyTrash);
});


