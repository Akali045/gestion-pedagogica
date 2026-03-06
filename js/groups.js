// Groups Management
function renderGroups() {
    const container = document.getElementById('groupsContainer');

    if (appData.groups.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No tienes grupos registrados</h3>
                <p>Comienza creando tu primer grupo de alumnos</p>
                <button class="btn btn-primary" onclick="openGroupModal()">+ Crear Primer Grupo</button>
            </div>
        `;
        return;
    }

    const cardsHTML = appData.groups.map(group => `
        <div class="card" onclick="showGroupDetail('${group.id}')" style="border-top-color: ${group.color || 'var(--accent)'};">
            <h3>${group.name}</h3>
            <div class="card-meta">
                ${group.grade ? `<span>${group.grade}° Grado</span>` : ''}
                <span>👥 ${group.students?.length || 0} alumnos</span>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="cards-grid">${cardsHTML}</div>`;
}

function showGroupDetail(groupId) {
    currentGroupId = groupId;
    const group = appData.groups.find(g => g.id === groupId);

    if (!group) return;

    // Ensure completedPDAs exists for backward compatibility
    if (!group.completedPDAs) {
        group.completedPDAs = [];
    }

    document.getElementById('groupDetailTitle').textContent = group.name;

    const students = group.students || [];
    const totalStudents = students.length;
    const channels = { Visual: 0, Auditivo: 0, Kinestésico: 0 };
    students.forEach(student => {
        if (channels.hasOwnProperty(student.learningChannel)) {
            channels[student.learningChannel]++;
        }
    });

    const percentages = {
        Visual: totalStudents > 0 ? Math.round((channels.Visual / totalStudents) * 100) : 0,
        Auditivo: totalStudents > 0 ? Math.round((channels.Auditivo / totalStudents) * 100) : 0,
        Kinestésico: totalStudents > 0 ? Math.round((channels.Kinestésico / totalStudents) * 100) : 0
    };

    const groupInfoHTML = `
        <h3>Información del Grupo</h3>
        <div class="group-info-grid">
             <div class="info-item">
                <label>Grado</label>
                <p>${group.grade || 'No especificado'}°</p>
            </div>
            <div class="info-item">
                <label>Total de Alumnos</label>
                <p>${totalStudents}</p>
            </div>
            <div class="info-item" style="grid-column: span 2;">
                <label>Metodología</label>
                <p>${group.methodology || 'No especificada'}</p>
            </div>
            <div class="info-item">
                <label>Horario</label>
                <p style="white-space: pre-wrap;">${group.schedule || 'No especificado'}</p>
            </div>
            <div class="info-item">
                <label>Horas Semanales</label>
                <p>${group.hoursPerWeek || 'No especificadas'}</p>
            </div>
        </div>

        <div class="notes-section" style="margin-top: 2rem; border-left: 5px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="font-size: 1.2rem;">PDA Actualmente Trabajado</h4>
                    <p style="font-weight: 600; color: var(--text-primary); margin-top: 0.5rem;">${group.pdaContent || 'No hay un contenido activo.'}</p>
                    <p style="margin-top: 0.25rem;">${group.pda || 'No hay un PDA activo.'}</p>
                    <p class="dates" style="margin-top: 0.5rem;">Inicio: ${group.pdaDate || 'N/A'}</p>
                </div>
                ${group.pda ? '<button class="btn btn-small btn-success" id="finishPDABtn">✓ Finalizar PDA Actual</button>' : ''}
            </div>
        </div>

        ${group.notes ? `
            <div class="notes-section">
                <h4>Notas del Grupo</h4>
                <p>${group.notes}</p>
            </div>
        ` : ''}

         <div class="channels-chart">
            <h4 style="margin-bottom: 1rem;">Distribución de Canales de Aprendizaje</h4>
            <div class="channel-bar">
                <label><span>👁️ Visual</span><span>${percentages.Visual}%</span></label>
                <div class="progress-bar"><div class="progress-fill" style="width: ${percentages.Visual}%">${percentages.Visual > 0 ? percentages.Visual + '%' : ''}</div></div>
            </div>
            <div class="channel-bar">
                <label><span>👂 Auditivo</span><span>${percentages.Auditivo}%</span></label>
                <div class="progress-bar"><div class="progress-fill" style="width: ${percentages.Auditivo}%">${percentages.Auditivo > 0 ? percentages.Auditivo + '%' : ''}</div></div>
            </div>
            <div class="channel-bar">
                <label><span>🤸 Kinestésico</span><span>${percentages.Kinestésico}%</span></label>
                <div class="progress-bar"><div class="progress-fill" style="width: ${percentages.Kinestésico}%">${percentages.Kinestésico > 0 ? percentages.Kinestésico + '%' : ''}</div></div>
            </div>
        </div>

        <div id="interestStatsContainer" class="notes-section" style="margin-top: 1.5rem;"></div>
    `;

    document.getElementById('groupInfoContainer').innerHTML = groupInfoHTML;

    // Eliminar sección anterior si existe
    const existingHistory = document.querySelector('.pda-history-section');
    if (existingHistory) {
        existingHistory.remove();
    }

    // Add PDA History section
    const pdaHistorySection = document.createElement('div');
    pdaHistorySection.className = 'pda-history-section';

    let historyHTML = `
        <div id="pdaHistoryHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <h3 style="margin: 0;">Historial de PDA Trabajados</h3>
            <span id="pdaHistoryToggleIcon">▼</span>
        </div>
        <div id="pdaHistoryContent" style="display: none; margin-top: 1rem;">
    `;

    if (group.completedPDAs && group.completedPDAs.length > 0) {
        historyHTML += group.completedPDAs.slice().reverse().map(item => `
            <div class="pda-history-card">
                <strong>${item.content}</strong>
                <p>${item.pda}</p>
                <div class="dates">
                    <span>${item.startDate || 'N/A'}</span> → <span>${item.endDate || 'N/A'}</span>
                </div>
            </div>
        `).join('');
    } else {
        historyHTML += '<p>No hay PDAs completados en el historial.</p>';
    }
    historyHTML += '</div>';

    pdaHistorySection.innerHTML = historyHTML;
    // Insert history after the main info container
    const groupInfoContainer = document.getElementById('groupInfoContainer');
    groupInfoContainer.parentNode.insertBefore(pdaHistorySection, groupInfoContainer.nextSibling);

    // Add toggle functionality
    document.getElementById('pdaHistoryHeader').addEventListener('click', () => {
        const content = document.getElementById('pdaHistoryContent');
        const icon = document.getElementById('pdaHistoryToggleIcon');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.textContent = '▲';
        } else {
            content.style.display = 'none';
            icon.textContent = '▼';
        }
    });

    // Add event listener for the finish button if it exists
    const finishBtn = document.getElementById('finishPDABtn');
    if (finishBtn) {
        finishBtn.addEventListener('click', finishCurrentPDA);
    }

    renderInterestFilters(students);
    renderInterestStats(students);
    renderStudentsTable(students);
    renderGroupSociogram(group);
    showView('viewGroupDetail');
}

function finishCurrentPDA() {
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group || !group.pda) {
        alert("No hay un PDA activo para finalizar.");
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const endDate = prompt("Confirma la fecha de finalización (AAAA-MM-DD):", today);

    if (endDate === null) {
        return;
    }

    // Ensure completedPDAs exists
    if (!group.completedPDAs) {
        group.completedPDAs = [];
    }

    group.completedPDAs.push({
        content: group.pdaContent,
        pda: group.pda,
        startDate: group.pdaDate,
        endDate: endDate
    });

    group.pda = '';
    group.pdaContent = '';
    group.pdaDate = '';

    saveData();
    showGroupDetail(currentGroupId);
}

function renderInterestFilters(allStudents) {
    const container = document.getElementById('interestFilterContainer');
    const toggleBtn = document.getElementById('toggleFilterBtn');
    const uniqueInterests = [...new Set(allStudents.flatMap(s => s.interests || []))];

    if (uniqueInterests.length === 0) {
        container.style.display = 'none';
        toggleBtn.style.display = 'none';
        return;
    }
    toggleBtn.style.display = 'inline-block';

    let filtersHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="margin: 0;">Filtrar por Interés</h4>
            <button class="btn btn-small btn-secondary" id="clearFiltersBtn">Limpiar</button>
        </div>
        <div>
            ${uniqueInterests.map(interest => `
                <span class="filter-badge ${activeInterestFilters.includes(interest) ? 'active' : ''}" data-interest="${interest}">
                    ${interest}
                </span>
            `).join('')}
        </div>
    `;
    container.innerHTML = filtersHTML;

    // Event Listeners for filters
    container.querySelectorAll('.filter-badge').forEach(badge => {
        badge.addEventListener('click', () => {
            const interest = badge.dataset.interest;
            if (activeInterestFilters.includes(interest)) {
                activeInterestFilters = activeInterestFilters.filter(i => i !== interest);
            } else {
                activeInterestFilters.push(interest);
            }
            renderInterestFilters(allStudents); // Re-render filters to show active state

            const filteredStudents = allStudents.filter(student =>
                activeInterestFilters.length === 0 ||
                activeInterestFilters.every(filter => student.interests?.includes(filter))
            );
            renderStudentsTable(filteredStudents);
        });
    });

    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        activeInterestFilters = [];
        renderInterestFilters(allStudents);
        renderStudentsTable(allStudents);
    });
}

function renderInterestStats(students) {
    const container = document.getElementById('interestStatsContainer');
    const interestCounts = {};
    let totalInterests = 0;

    students.forEach(student => {
        if (Array.isArray(student.interests)) {
            student.interests.forEach(interest => {
                interestCounts[interest] = (interestCounts[interest] || 0) + 1;
                totalInterests++;
            });
        }
    });

    if (totalInterests === 0) {
        container.innerHTML = `
            <h4>Estadísticas de Intereses</h4>
            <p>No hay intereses registrados para los alumnos de este grupo.</p>
        `;
        return;
    }

    const sortedInterests = Object.entries(interestCounts).sort((a, b) => b[1] - a[1]);

    let statsHTML = `
        <div id="statsHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <h4 style="margin: 0;">Estadísticas de Intereses</h4>
            <span id="statsToggleIcon">▼</span>
        </div>
        <div id="interestStatsContent" style="display: none; margin-top: 1rem;">
    `;

    sortedInterests.forEach(([interest, count]) => {
        statsHTML += `
            <div class="interest-stat-badge">
                <span>${interest}</span>
                <span class="count">${count}</span>
            </div>
        `;
    });

    statsHTML += '</div>';
    container.innerHTML = statsHTML;

    document.getElementById('statsHeader').addEventListener('click', () => {
        const content = document.getElementById('interestStatsContent');
        const icon = document.getElementById('statsToggleIcon');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.textContent = '▲';
        } else {
            content.style.display = 'none';
            icon.textContent = '▼';
        }
    });
}

// PDA Management
function normalizeText(text) {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function filterPDAsByGradeAndQuery(grade, query) {
    if (!grade || !query) return [];

    const gradeData = PDA_DATA[grade];
    if (!gradeData) return [];

    const normalizedQuery = normalizeText(query);
    const results = [];

    for (const content in gradeData) {
        const normalizedContent = normalizeText(content);
        const pdas = gradeData[content];

        pdas.forEach(pda => {
            const normalizedPda = normalizeText(pda);
            if (normalizedContent.includes(normalizedQuery) || normalizedPda.includes(normalizedQuery)) {
                results.push({ content, pda });
            }
        });
    }

    return results.slice(0, 8);
}

function showPdaSuggestions() {
    const query = document.getElementById('groupPDA').value;
    const grade = document.getElementById('groupGrade').value;
    const suggestionsContainer = document.getElementById('pdaSuggestions');

    if (!grade) {
        suggestionsContainer.innerHTML = '<div class="suggestion-item" style="cursor: not-allowed;">Por favor, selecciona primero el grado del grupo.</div>';
        suggestionsContainer.style.display = 'block';
        return;
    }

    if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }

    const suggestions = filterPDAsByGradeAndQuery(grade, query);

    if (suggestions.length === 0) {
        suggestionsContainer.style.display = 'none';
        return;
    }

    suggestionsContainer.innerHTML = suggestions.map(s => `
        <div class="suggestion-item" data-pda="${s.pda}" data-content="${s.content}">
            <span class="content">${s.content}</span>
            <span class="pda">${s.pda}</span>
        </div>
    `).join('');

    suggestionsContainer.style.display = 'block';
}

// Modal Management
function openGroupModal(groupId = null) {
    editingGroupId = groupId;
    const modal = document.getElementById('groupModal');
    const title = document.getElementById('groupModalTitle');

    if (groupId) {
        title.textContent = 'Editar Grupo';
        const group = appData.groups.find(g => g.id === groupId);
        if (group) {
            document.getElementById('groupName').value = group.name;
            document.getElementById('groupGrade').value = group.grade || '';
            document.getElementById('groupPDA').value = group.pda || '';
            document.getElementById('groupPDAContent').value = group.pdaContent || '';
            document.getElementById('groupPDADate').value = group.pdaDate || '';
            document.getElementById('groupMethodology').value = group.methodology || '';
            document.getElementById('groupSchedule').value = group.schedule || '';
            document.getElementById('groupHoursPerWeek').value = group.hoursPerWeek || '';
            document.getElementById('groupNotes').value = group.notes || '';
            document.getElementById('groupColor').value = group.color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        }
    } else {
        title.textContent = 'Crear Grupo';
        document.getElementById('groupForm').reset();
        document.getElementById('groupColor').value = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    }

    modal.classList.add('active');
}

function closeGroupModal() {
    document.getElementById('groupModal').classList.remove('active');
    document.getElementById('groupForm').reset();
    document.getElementById('pdaSuggestions').style.display = 'none';
    editingGroupId = null;
}

function saveGroup() {
    const name = document.getElementById('groupName').value;
    const grade = document.getElementById('groupGrade').value;
    const pda = document.getElementById('groupPDA').value;
    const pdaContent = document.getElementById('groupPDAContent').value;
    const pdaDate = document.getElementById('groupPDADate').value;
    const methodology = document.getElementById('groupMethodology').value;
    const schedule = document.getElementById('groupSchedule').value;
    const hoursPerWeek = document.getElementById('groupHoursPerWeek').value;
    const notes = document.getElementById('groupNotes').value;
    const color = document.getElementById('groupColor').value;

    if (!name || !grade) {
        alert('El nombre y el grado del grupo son obligatorios');
        return;
    }

    if (editingGroupId) {
        const group = appData.groups.find(g => g.id === editingGroupId);
        if (group) {
            group.name = name;
            group.grade = grade;
            group.pda = pda;
            group.pdaContent = pdaContent;
            group.pdaDate = pdaDate;
            group.methodology = methodology;
            group.schedule = schedule;
            group.hoursPerWeek = hoursPerWeek;
            group.notes = notes;
            group.color = color;
        }
    } else {
        const newGroup = {
            id: Date.now().toString(),
            name,
            grade,
            pda,
            pdaContent,
            pdaDate,
            methodology,
            schedule,
            hoursPerWeek,
            notes,
            color: color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
            students: [],
            completedPDAs: []
        };
        appData.groups.push(newGroup);
    }

    saveData();
    closeGroupModal();

    if (editingGroupId) {
        showGroupDetail(editingGroupId);
    } else {
        renderGroups();
    }
}

function deleteGroup() {
    if (!confirm('¿Estás seguro de eliminar este grupo? Se perderán todos los datos de los alumnos.')) {
        return;
    }

    appData.groups = appData.groups.filter(g => g.id !== currentGroupId);
    saveData();
    showView('viewGroups');
    renderGroups();
}
