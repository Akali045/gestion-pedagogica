// Groups Management
function renderGroups() {
    const container = document.getElementById('groupsContainer');
    if (!container) return;

    const school = getCurrentSchool();
    const groupsList = school ? (school.groups || []) : getAllGroups();

    if (groupsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No tienes grupos registrados</h3>
                <p>Comienza creando tu primer grupo de alumnos</p>
                <button class="btn btn-primary" onclick="openGroupModal()">+ Crear Primer Grupo</button>
            </div>
        `;
        return;
    }

    const cardsHTML = groupsList.map(group => `
        <div class="card" onclick="showGroupDetail('${escapeHTML(group.id)}')" style="border-top-color: ${escapeHTML(group.color || 'var(--accent)')};">
            <h3>${escapeHTML(group.name)}</h3>
            <div class="card-meta">
                ${group.grade ? `<span>${escapeHTML(group.grade)}° Grado</span>` : ''}
                <span>👥 ${group.students?.length || 0} alumnos</span>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="cards-grid">${cardsHTML}</div>`;
}

function showGroupDetail(groupId) {
    currentGroupId = groupId;
    const group = findGroupById(groupId);

    if (!group) return;

    const school = findSchoolByGroupId(groupId);
    if (school) {
        currentSchoolId = school.id;
    }

    const backBtn = document.getElementById('backToSchool') || document.getElementById('backToGroups');
    if (backBtn) {
        backBtn.textContent = school ? `← Volver a ${school.name}` : '← Volver a Centros de Trabajo';
    }

    if (!group.completedPDAs) {
        group.completedPDAs = [];
    }
    if (!group.observations) {
        group.observations = [];
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
        <div id="groupInfoHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <h3 style="margin: 0;">ℹ️ Información del Grupo</h3>
            <span id="groupInfoToggleIcon">▼</span>
        </div>
        <div id="groupInfoContent" style="display: none; margin-top: 1.5rem;">
            <div class="group-info-grid">
                <div class="info-item">
                    <label>Grado</label>
                    <p>${escapeHTML(group.grade || 'No especificado')}°</p>
                </div>
                <div class="info-item">
                    <label>Total de Alumnos</label>
                    <p>${totalStudents}</p>
                </div>
                <div class="info-item">
                    <label>Horas Semanales</label>
                    <p>${escapeHTML(group.hoursPerWeek || '5')} hrs</p>
                </div>
                <div class="info-item">
                    <label>Metodología</label>
                    <p>${escapeHTML(group.methodology || 'No especificada')}</p>
                </div>
            </div>

            <!-- Visual Schedule Section (Full Horizontal Width) -->
            ${renderGroupScheduleVisual(group)}

            <div class="notes-section" style="margin-top: 2rem; border-left: 5px solid var(--accent);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="font-size: 1.2rem;">PDA Actualmente Trabajado</h4>
                        <p style="font-weight: 600; color: var(--text-primary); margin-top: 0.5rem;">${escapeHTML(group.pdaContent || 'No hay un contenido activo.')}</p>
                        <p style="margin-top: 0.25rem;">${escapeHTML(group.pda || 'No hay un PDA activo.')}</p>
                        <p class="dates" style="margin-top: 0.5rem;">Inicio: ${escapeHTML(group.pdaDate || 'N/A')}</p>
                    </div>
                    ${group.pda ? '<button class="btn btn-small btn-success" id="finishPDABtn">✓ Finalizar PDA Actual</button>' : ''}
                </div>
                ${group.pda ? `
                    <div class="pda-activities-section" style="margin-top: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Actividades del PDA</h4>
                            <button class="btn btn-small btn-primary" id="addActivityBtn" style="width: auto;">+ Agregar Actividad</button>
                        </div>
                        <div id="pdaActivitiesContainer">
                            ${(!group.pdaActivities || group.pdaActivities.length === 0) ? `
                                <p style="color: var(--text-tertiary); font-size: 0.9rem; margin: 0;">No hay actividades registradas para este PDA.</p>
                            ` : group.pdaActivities.map(act => {
                                const statusInfo = ACTIVITY_STATUSES[act.status] || { label: 'Desconocido', class: '' };
                                return `
                                    <div class="activity-card" style="margin-bottom: 0.5rem; padding: 0.65rem; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px;">
                                        <div class="activity-info">
                                            <div class="activity-title-row" style="display: flex; justify-content: space-between; align-items: center;">
                                                <span class="activity-name" style="font-weight: 600;">${escapeHTML(act.name)}</span>
                                                <span class="activity-badge ${statusInfo.class}" style="font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px;">${escapeHTML(statusInfo.label)}</span>
                                            </div>
                                            ${act.description ? `<p class="activity-description" style="font-size: 0.9rem; margin: 0.25rem 0 0;">${escapeHTML(act.description)}</p>` : ''}
                                        </div>
                                        <div class="activity-actions" style="display: flex; gap: 0.25rem; justify-content: flex-end; margin-top: 0.5rem;">
                                            <button class="btn btn-small btn-secondary edit-activity-btn" data-act-id="${escapeHTML(act.id)}" title="Editar" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; width: auto;">✏️</button>
                                            <button class="btn btn-small btn-danger delete-activity-btn" data-act-id="${escapeHTML(act.id)}" title="Eliminar" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; width: auto;">🗑️</button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>

            ${group.notes ? `
                <div class="notes-section">
                    <h4>Notas del Grupo</h4>
                    <p>${escapeHTML(group.notes)}</p>
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
        </div>
    `;

    document.getElementById('groupInfoContainer').innerHTML = groupInfoHTML;

    // Add toggle functionality for Group Info
    document.getElementById('groupInfoHeader').addEventListener('click', () => {
        const content = document.getElementById('groupInfoContent');
        const icon = document.getElementById('groupInfoToggleIcon');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.textContent = '▲';
        } else {
            content.style.display = 'none';
            icon.textContent = '▼';
        }
    });

    // Render PDA History into fixed container
    const pdaHistoryContainer = document.getElementById('pdaHistoryContainer');
    if (pdaHistoryContainer) {
        let historyHTML = `
            <div class="pda-history-section group-info" style="margin-top: 2rem;">
                <div id="pdaHistoryHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                    <h3 style="margin: 0;">📋 Historial de PDA Trabajados</h3>
                    <span id="pdaHistoryToggleIcon">▼</span>
                </div>
                <div id="pdaHistoryContent" style="display: none; margin-top: 1.5rem;">
        `;

        if (group.completedPDAs && group.completedPDAs.length > 0) {
            const completedWithIndices = group.completedPDAs.map((item, idx) => ({ ...item, idx }));
            historyHTML += completedWithIndices.slice().reverse().map(item => `
                <div class="pda-history-card" data-idx="${item.idx}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                        <div style="flex-grow: 1;">
                            <strong>${escapeHTML(item.content)}</strong>
                            <p style="margin: 0.25rem 0 0.5rem 0; font-size: 0.95rem; color: var(--text-secondary);">${escapeHTML(item.pda)}</p>
                            <div class="dates">
                                <span>${escapeHTML(item.startDate || 'N/A')}</span> → <span>${escapeHTML(item.endDate || 'N/A')}</span>
                            </div>
                            ${(item.activities && item.activities.length > 0) ? `
                                <div class="pda-history-activities" style="margin-top: 0.75rem; border-top: 1px dashed var(--border); padding-top: 0.5rem;">
                                    <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">Actividades registradas:</span>
                                    <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                                        ${item.activities.map(act => {
                                            const statusInfo = ACTIVITY_STATUSES[act.status] || { label: 'Desconocido', class: '' };
                                            return `
                                                <div style="display: flex; flex-direction: column; background: var(--bg-tertiary); padding: 0.5rem 0.65rem; border-radius: 6px; border: 1px solid var(--border); font-size: 0.85rem;">
                                                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.25rem;">
                                                        <span style="font-weight: 600; color: var(--text-primary);">${escapeHTML(act.name)}</span>
                                                        <span class="activity-badge ${statusInfo.class}" style="font-size: 0.7rem; padding: 0.1rem 0.3rem; border-radius: 4px;">${escapeHTML(statusInfo.label)}</span>
                                                    </div>
                                                    ${act.description ? `<p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary); white-space: pre-wrap;">${escapeHTML(act.description)}</p>` : ''}
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div style="display: flex; gap: 0.4rem; flex-shrink: 0;">
                            <button class="btn btn-small btn-secondary edit-completed-pda-btn" data-idx="${item.idx}" title="Editar" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">✏️</button>
                            <button class="btn btn-small btn-danger delete-completed-pda-btn" data-idx="${item.idx}" title="Eliminar" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            historyHTML += '<p>No hay PDAs completados en el historial.</p>';
        }
        historyHTML += '</div></div>';

        pdaHistoryContainer.innerHTML = historyHTML;

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

        pdaHistoryContainer.querySelectorAll('.edit-completed-pda-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                openPdaHistoryModal(idx);
            });
        });

        pdaHistoryContainer.querySelectorAll('.delete-completed-pda-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                deleteCompletedPDA(idx);
            });
        });
    }

    // Add event listener for the finish button if it exists
    const finishBtn = document.getElementById('finishPDABtn');
    if (finishBtn) {
        finishBtn.addEventListener('click', finishCurrentPDA);
    }

    // Add event listeners for PDA activities
    const addActivityBtn = document.getElementById('addActivityBtn');
    if (addActivityBtn) {
        addActivityBtn.addEventListener('click', () => openActivityModal());
    }

    const groupInfoContainerRef = document.getElementById('groupInfoContainer');
    groupInfoContainerRef.querySelectorAll('.edit-activity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const actId = btn.dataset.actId;
            openActivityModal(actId);
        });
    });

    groupInfoContainerRef.querySelectorAll('.delete-activity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const actId = btn.dataset.actId;
            deleteActivity(actId);
        });
    });

    // Reset Students Section search and toggle state
    currentStudentSearchQuery = '';
    activeInterestFilters = [];
    const searchInput = document.getElementById('searchStudentInput');
    if (searchInput) searchInput.value = '';

    const studentsContent = document.getElementById('studentsSectionContent');
    const studentsIcon = document.getElementById('studentsSectionToggleIcon');
    if (studentsContent && studentsIcon) {
        studentsContent.style.display = 'none';
        studentsIcon.textContent = '▼';
    }

    renderInterestFilters(students);
    renderInterestStats(students);
    renderStudentsTable(filterStudentsList(students));
    renderGroupSociogram(group);
    renderGroupObservations(group);
    
    // Render Teams Section
    if (typeof renderTeamsSection === 'function') {
        renderTeamsSection(group);
    }
    
    showView('viewGroupDetail');
}

function finishCurrentPDA() {
    const group = getCurrentGroup();
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
        endDate: endDate,
        activities: group.pdaActivities || []
    });

    group.pda = '';
    group.pdaContent = '';
    group.pdaDate = '';
    group.pdaActivities = [];

    saveData();
    showGroupDetail(currentGroupId);
}

// ===== Activities Management =====
const ACTIVITY_STATUSES = {
    '1': { label: 'Estaba en la planeación y se pudo llevar a cabo', class: 'act-planned-done' },
    '2': { label: 'Estaba en la planeación pero no se pudo llevar a cabo', class: 'act-planned-undone' },
    '3': { label: 'Estaba en la planeación pero se modificaron aspectos al momento de implementarla', class: 'act-planned-modified' },
    '4': { label: 'No estaba en la planeación y aun así se implementó', class: 'act-unplanned-done' }
};

let editingActivityId = null;

function openActivityModal(activityId = null) {
    editingActivityId = activityId;
    const modal = document.getElementById('activityModal');
    const title = document.getElementById('activityModalTitle');
    const form = document.getElementById('activityForm');

    form.reset();

    if (activityId) {
        title.textContent = 'Editar Actividad';
        const group = getCurrentGroup();
        if (group && group.pdaActivities) {
            const activity = group.pdaActivities.find(act => act.id === activityId);
            if (activity) {
                document.getElementById('activityName').value = activity.name || '';
                document.getElementById('activityDescription').value = activity.description || '';
                document.getElementById('activityStatus').value = activity.status || '1';
            }
        }
    } else {
        title.textContent = 'Agregar Actividad';
    }

    modal.classList.add('active');
}

function closeActivityModal() {
    document.getElementById('activityModal').classList.remove('active');
    document.getElementById('activityForm').reset();
    editingActivityId = null;
}

function saveActivity() {
    const name = document.getElementById('activityName').value.trim();
    const description = document.getElementById('activityDescription').value.trim();
    const status = document.getElementById('activityStatus').value;

    if (!name) {
        alert('El nombre de la actividad es obligatorio');
        return;
    }

    const group = getCurrentGroup();
    if (!group) return;

    if (!group.pdaActivities) {
        group.pdaActivities = [];
    }

    if (editingActivityId) {
        const activity = group.pdaActivities.find(act => act.id === editingActivityId);
        if (activity) {
            activity.name = name;
            activity.description = description;
            activity.status = status;
        }
    } else {
        const newActivity = {
            id: generateUniqueId(),
            name,
            description,
            status
        };
        group.pdaActivities.push(newActivity);
    }

    saveData();
    closeActivityModal();
    showGroupDetail(currentGroupId);
}

function deleteActivity(activityId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta actividad?')) {
        return;
    }

    const group = getCurrentGroup();
    if (group && group.pdaActivities) {
        group.pdaActivities = group.pdaActivities.filter(act => act.id !== activityId);
        saveData();
        showGroupDetail(currentGroupId);
    }
}

let editingCompletedPdaIndex = null;

function openPdaHistoryModal(idx) {
    const group = getCurrentGroup();
    if (!group || !group.completedPDAs || !group.completedPDAs[idx]) return;

    editingCompletedPdaIndex = idx;
    const item = group.completedPDAs[idx];

    document.getElementById('pdaHistoryContentInput').value = item.content || '';
    document.getElementById('pdaHistoryPdaInput').value = item.pda || '';
    document.getElementById('pdaHistoryStartDateInput').value = item.startDate || '';
    document.getElementById('pdaHistoryEndDateInput').value = item.endDate || '';

    document.getElementById('pdaHistoryModal').classList.add('active');
}

function closePdaHistoryModal() {
    document.getElementById('pdaHistoryModal').classList.remove('active');
    document.getElementById('pdaHistoryForm').reset();
    editingCompletedPdaIndex = null;
}

function savePdaHistory() {
    const group = getCurrentGroup();
    if (!group || editingCompletedPdaIndex === null || !group.completedPDAs[editingCompletedPdaIndex]) return;

    const content = document.getElementById('pdaHistoryContentInput').value;
    const pda = document.getElementById('pdaHistoryPdaInput').value;
    const startDate = document.getElementById('pdaHistoryStartDateInput').value;
    const endDate = document.getElementById('pdaHistoryEndDateInput').value;

    if (!content || !pda) {
        alert('El contenido y el PDA son obligatorios');
        return;
    }

    group.completedPDAs[editingCompletedPdaIndex] = {
        ...group.completedPDAs[editingCompletedPdaIndex],
        content,
        pda,
        startDate,
        endDate
    };

    saveData();
    closePdaHistoryModal();
    showGroupDetail(currentGroupId);
}

function deleteCompletedPDA(idx) {
    const group = getCurrentGroup();
    if (!group || !group.completedPDAs || !group.completedPDAs[idx]) return;

    if (!confirm('¿Estás seguro de que deseas eliminar este PDA del historial?')) {
        return;
    }

    group.completedPDAs.splice(idx, 1);
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

            const filteredStudents = filterStudentsList(allStudents);
            renderStudentsTable(filteredStudents);
        });
    });

    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        activeInterestFilters = [];
        renderInterestFilters(allStudents);
        const filteredStudents = filterStudentsList(allStudents);
        renderStudentsTable(filteredStudents);
    });
}

function renderInterestStats(students) {
    const container = document.getElementById('interestStatsContainer');
    if (!container) return;

    const interestCounts = {};
    const careerCounts = {};
    let totalInterests = 0;
    let totalCareers = 0;

    students.forEach(student => {
        if (Array.isArray(student.interests)) {
            student.interests.forEach(interest => {
                interestCounts[interest] = (interestCounts[interest] || 0) + 1;
                totalInterests++;
            });
        }

        const careers = Array.isArray(student.futureCareer) ? student.futureCareer : (student.futureCareer ? [student.futureCareer] : []);
        careers.forEach(career => {
            careerCounts[career] = (careerCounts[career] || 0) + 1;
            totalCareers++;
        });
    });

    if (totalInterests === 0 && totalCareers === 0) {
        container.innerHTML = `
            <h4>📊 Estadísticas de Intereses y Aspiraciones</h4>
            <p style="margin-top: 0.5rem; color: var(--text-tertiary);">No hay intereses ni aspiraciones registradas en el grupo para generar estadísticas.</p>
        `;
        return;
    }

    const sortedInterests = Object.entries(interestCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const sortedCareers = Object.entries(careerCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    let statsHTML = `
        <div id="statsHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <h4 style="margin: 0;">📊 Estadísticas de Intereses y Aspiraciones</h4>
            <span id="statsToggleIcon">▼</span>
        </div>
        <div id="interestStatsContent" style="display: none; margin-top: 1.5rem;">
            <div class="visual-dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                
                <!-- Columna: Intereses -->
                <div class="dashboard-col">
                    <h5 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem; font-family: 'Crimson Pro', serif; font-weight: 700; border-bottom: 2px solid var(--border); padding-bottom: 0.25rem;">🎯 Intereses del Grupo</h5>
    `;

    if (sortedInterests.length === 0) {
        statsHTML += `<p style="color: var(--text-tertiary); font-size: 0.9rem;">No hay intereses particulares registrados.</p>`;
    } else {
        sortedInterests.forEach(([interest, count]) => {
            const pct = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
            statsHTML += `
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <span style="font-weight: 600;">${interest}</span>
                        <span style="color: var(--text-secondary); font-weight: 500;">${count} alumno(s) (${pct}%)</span>
                    </div>
                    <div style="height: 8px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: var(--accent); border-radius: 4px;"></div>
                    </div>
                </div>
            `;
        });
    }

    statsHTML += `
                </div>
                
                <!-- Columna: Aspiraciones -->
                <div class="dashboard-col">
                    <h5 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem; font-family: 'Crimson Pro', serif; font-weight: 700; border-bottom: 2px solid var(--border); padding-bottom: 0.25rem;">🚀 Aspiraciones de Futuro</h5>
    `;

    if (sortedCareers.length === 0) {
        statsHTML += `<p style="color: var(--text-tertiary); font-size: 0.9rem;">No hay aspiraciones profesionales registradas.</p>`;
    } else {
        sortedCareers.forEach(([career, count]) => {
            const pct = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
            statsHTML += `
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <span style="font-weight: 600;">${career}</span>
                        <span style="color: var(--text-secondary); font-weight: 500;">${count} alumno(s) (${pct}%)</span>
                    </div>
                    <div style="height: 8px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: var(--warning); border-radius: 4px;"></div>
                    </div>
                </div>
            `;
        });
    }

    statsHTML += `
                </div>
            </div>
        </div>
    `;

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

    if (!grade || query.length < 2) {
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

// ===== Group Schedule Management & Smart Class Status =====
const SCHEDULE_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_INDEX_MAP = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo' };
let currentGroupScheduleSessions = [];

function calculateMinutesDiff(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function formatMinutesDuration(minutes) {
    if (!minutes || minutes <= 0) return '0 min';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
}

function parseScheduleStringToSessions(text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const sessions = [];
    const dayKeywords = [
        { name: 'Lunes', regex: /lun(es)?/i },
        { name: 'Martes', regex: /mar(tes)?/i },
        { name: 'Miércoles', regex: /mi[eé](rcoles)?/i },
        { name: 'Jueves', regex: /jue(ves)?/i },
        { name: 'Viernes', regex: /vie(rnes)?/i },
        { name: 'Sábado', regex: /s[aá]b(ado)?/i }
    ];

    lines.forEach(line => {
        let matchedDay = 'Lunes';
        for (const dk of dayKeywords) {
            if (dk.regex.test(line)) {
                matchedDay = dk.name;
                break;
            }
        }

        const timeMatch = line.match(/(\d{1,2}:\d{2})\s*(?:-|a|to)\s*(\d{1,2}:\d{2})/i);
        let startTime = '07:00';
        let endTime = '07:50';
        if (timeMatch) {
            startTime = timeMatch[1].padStart(5, '0');
            endTime = timeMatch[2].padStart(5, '0');
        }

        let room = '';
        const roomMatch = line.match(/(?:aula|sal[oó]n|lab|laboratorio|taller)\s*([A-Za-z0-9\-_]+)?/i);
        if (roomMatch) {
            room = roomMatch[0];
        }

        sessions.push({
            id: 'sess_' + Math.random().toString(36).substr(2, 9),
            day: matchedDay,
            startTime,
            endTime,
            room
        });
    });

    return sessions;
}

function formatSessionsToText(sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) return '';
    return sessions.map(s => {
        const roomStr = s.room ? ` (${s.room})` : '';
        return `${s.day} ${s.startTime} - ${s.endTime}${roomStr}`;
    }).join('\n');
}

function calculateTotalWeeklyHours(sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) return 0;
    const totalMin = sessions.reduce((acc, s) => acc + Math.max(0, calculateMinutesDiff(s.startTime, s.endTime)), 0);
    return Math.round((totalMin / 50) * 10) / 10;
}

function renderScheduleSessionsBuilder(sessions) {
    currentGroupScheduleSessions = Array.isArray(sessions) ? [...sessions] : [];
    const container = document.getElementById('scheduleSessionsList');
    if (!container) return;

    if (currentGroupScheduleSessions.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; color: var(--text-tertiary); font-size: 0.88rem;">
                No hay sesiones de clase programadas. Usa los botones rápidos de arriba o <strong>+ Agregar Día / Módulo</strong>.
            </div>
        `;
    } else {
        container.innerHTML = currentGroupScheduleSessions.map((s, idx) => {
            const diffMin = calculateMinutesDiff(s.startTime, s.endTime);
            const durationLabel = formatMinutesDuration(diffMin);
            return `
                <div class="schedule-session-item" data-id="${escapeHTML(s.id)}">
                    <div>
                        <label class="schedule-sublabel">Día</label>
                        <select onchange="updateScheduleSessionField('${escapeHTML(s.id)}', 'day', this.value)">
                            ${SCHEDULE_DAYS.map(d => `<option value="${d}" ${s.day === d ? 'selected' : ''}>${d}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="schedule-sublabel">Hora Inicio</label>
                        <input type="time" value="${escapeHTML(s.startTime)}" onchange="updateScheduleSessionField('${escapeHTML(s.id)}', 'startTime', this.value)" title="Hora de inicio">
                    </div>
                    <div>
                        <label class="schedule-sublabel">Hora Fin</label>
                        <input type="time" value="${escapeHTML(s.endTime)}" onchange="updateScheduleSessionField('${escapeHTML(s.id)}', 'endTime', this.value)" title="Hora de fin">
                    </div>
                    <div>
                        <label class="schedule-sublabel">Aula / Espacio (Opcional)</label>
                        <input type="text" value="${escapeHTML(s.room || '')}" placeholder="Aula 12 / Taller / Lab" onchange="updateScheduleSessionField('${escapeHTML(s.id)}', 'room', this.value)">
                    </div>
                    <div style="text-align: center;">
                        <label class="schedule-sublabel">Duración</label>
                        <span class="schedule-duration-tag">${durationLabel}</span>
                    </div>
                    <button type="button" class="btn btn-small btn-danger schedule-del-btn" onclick="removeScheduleSessionRow('${escapeHTML(s.id)}')" title="Eliminar clase">🗑️</button>
                </div>
            `;
        }).join('');
    }

    updateScheduleSummaryUI();
}

function addScheduleSessionRow(data = {}) {
    const lastSession = currentGroupScheduleSessions[currentGroupScheduleSessions.length - 1];
    let defaultDay = 'Lunes';
    let defaultStart = '07:00';
    let defaultEnd = '07:50';

    if (lastSession) {
        const currentIdx = SCHEDULE_DAYS.indexOf(lastSession.day);
        defaultDay = currentIdx >= 0 && currentIdx < SCHEDULE_DAYS.length - 1 ? SCHEDULE_DAYS[currentIdx + 1] : lastSession.day;
        defaultStart = lastSession.startTime || '07:00';
        defaultEnd = lastSession.endTime || '07:50';
    }

    const newSession = {
        id: 'sess_' + Math.random().toString(36).substr(2, 9),
        day: data.day || defaultDay,
        startTime: data.startTime || defaultStart,
        endTime: data.endTime || defaultEnd,
        room: data.room || (lastSession ? lastSession.room : '')
    };

    currentGroupScheduleSessions.push(newSession);
    renderScheduleSessionsBuilder(currentGroupScheduleSessions);
}

function removeScheduleSessionRow(id) {
    currentGroupScheduleSessions = currentGroupScheduleSessions.filter(s => s.id !== id);
    renderScheduleSessionsBuilder(currentGroupScheduleSessions);
}

function updateScheduleSessionField(id, field, value) {
    const sess = currentGroupScheduleSessions.find(s => s.id === id);
    if (sess) {
        sess[field] = value;
        const textTa = document.getElementById('groupSchedule');
        if (textTa) textTa.value = formatSessionsToText(currentGroupScheduleSessions);
        renderScheduleSessionsBuilder(currentGroupScheduleSessions);
    }
}

function addScheduleSessionPreset(type) {
    if (type === '50min') {
        addScheduleSessionRow({ startTime: '07:00', endTime: '07:50' });
    } else if (type === '45min') {
        addScheduleSessionRow({ startTime: '07:00', endTime: '07:45' });
    } else {
        addScheduleSessionRow({ startTime: '08:00', endTime: '09:00' });
    }
}

function toggleRawScheduleMode() {
    const rawContainer = document.getElementById('rawScheduleContainer');
    const toggleBtn = document.getElementById('toggleRawScheduleBtn');
    if (!rawContainer) return;
    const isHidden = rawContainer.style.display === 'none';
    rawContainer.style.display = isHidden ? 'block' : 'none';
    if (toggleBtn) {
        toggleBtn.textContent = isHidden ? '▲ Ocultar texto libre' : '📝 Ver / Editar texto libre';
    }
    if (isHidden) {
        const textTa = document.getElementById('groupSchedule');
        if (textTa) textTa.value = formatSessionsToText(currentGroupScheduleSessions);
    }
}

function updateScheduleSummaryUI() {
    const countBadge = document.getElementById('scheduleWeeklySummaryBadge');
    const summaryCalc = document.getElementById('scheduleCalcSummary');
    const hoursInput = document.getElementById('groupHoursPerWeek');
    const textTa = document.getElementById('groupSchedule');

    const totalCount = currentGroupScheduleSessions.length;
    const totalMinutes = currentGroupScheduleSessions.reduce((acc, s) => acc + Math.max(0, calculateMinutesDiff(s.startTime, s.endTime)), 0);
    const formattedTime = formatMinutesDuration(totalMinutes);

    if (countBadge) {
        countBadge.textContent = `${totalCount} ${totalCount === 1 ? 'sesión' : 'sesiones'} semanales`;
    }
    if (summaryCalc) {
        summaryCalc.innerHTML = `<span>Total: <strong>${totalCount} clases a la semana</strong> (~${formattedTime} total)</span>`;
    }
    if (hoursInput && !hoursInput.value) {
        hoursInput.value = totalCount > 0 ? totalCount : '5';
    }
    if (textTa && document.activeElement !== textTa) {
        textTa.value = formatSessionsToText(currentGroupScheduleSessions);
    }
}

function getSmartClassStatus(sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
        return {
            type: 'idle',
            badgeClass: 'status-banner-idle',
            text: 'Horario no configurado para este grupo.',
            icon: '📅'
        };
    }

    const now = new Date();
    const currentDayIdx = now.getDay();
    const currentDayName = DAY_INDEX_MAP[currentDayIdx] || '';
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todaySessions = sessions
        .filter(s => s.day === currentDayName)
        .sort((a, b) => {
            const [ha, ma] = a.startTime.split(':').map(Number);
            const [hb, mb] = b.startTime.split(':').map(Number);
            return (ha * 60 + ma) - (hb * 60 + mb);
        });

    if (todaySessions.length > 0) {
        for (const s of todaySessions) {
            const [h1, m1] = s.startTime.split(':').map(Number);
            const [h2, m2] = s.endTime.split(':').map(Number);
            const startMin = h1 * 60 + m1;
            const endMin = h2 * 60 + m2;

            if (currentMinutes >= startMin && currentMinutes <= endMin) {
                const roomStr = s.room ? ` (📍 ${s.room})` : '';
                return {
                    type: 'live',
                    badgeClass: 'status-banner-live',
                    text: `EN CLASE AHORA: ${s.startTime} - ${s.endTime}${roomStr}`,
                    icon: '<span class="pulsing-indicator"></span>'
                };
            }
        }

        const nextToday = todaySessions.find(s => {
            const [h1, m1] = s.startTime.split(':').map(Number);
            return (h1 * 60 + m1) > currentMinutes;
        });

        if (nextToday) {
            const [h1, m1] = nextToday.startTime.split(':').map(Number);
            const diffMin = (h1 * 60 + m1) - currentMinutes;
            const roomStr = nextToday.room ? ` (📍 ${nextToday.room})` : '';
            return {
                type: 'upcoming',
                badgeClass: 'status-banner-upcoming',
                text: `CLASE HOY: Inicia a las ${nextToday.startTime} (en ${diffMin} min)${roomStr}`,
                icon: '🟡'
            };
        }

        return {
            type: 'finished',
            badgeClass: 'status-banner-idle',
            text: `Las clases de hoy (${currentDayName}) para este grupo han concluido.`,
            icon: '⚪'
        };
    }

    const orderedDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayIndex = orderedDays.indexOf(currentDayName);
    let nextDaySession = null;

    if (todayIndex >= 0) {
        for (let i = 1; i <= 6; i++) {
            const checkDay = orderedDays[(todayIndex + i) % orderedDays.length];
            const found = sessions.find(s => s.day === checkDay);
            if (found) {
                nextDaySession = found;
                break;
            }
        }
    }

    if (nextDaySession) {
        const roomStr = nextDaySession.room ? ` (📍 ${nextDaySession.room})` : '';
        return {
            type: 'next',
            badgeClass: 'status-banner-idle',
            text: `Próxima clase: ${nextDaySession.day} ${nextDaySession.startTime} - ${nextDaySession.endTime}${roomStr}`,
            icon: '📅'
        };
    }

    return {
        type: 'idle',
        badgeClass: 'status-banner-idle',
        text: 'Sin clases activas hoy.',
        icon: '📅'
    };
}

function renderGroupScheduleVisual(group) {
    const sessions = Array.isArray(group.scheduleSessions) && group.scheduleSessions.length > 0
        ? group.scheduleSessions
        : parseScheduleStringToSessions(group.schedule);

    const smartStatus = getSmartClassStatus(sessions);
    const currentDayIdx = new Date().getDay();
    const currentDayName = DAY_INDEX_MAP[currentDayIdx] || '';

    const daysToShow = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    if (sessions.some(s => s.day === 'Sábado')) {
        daysToShow.push('Sábado');
    }

    const totalMinutes = sessions.reduce((acc, s) => acc + Math.max(0, calculateMinutesDiff(s.startTime, s.endTime)), 0);
    const weeklyDuration = formatMinutesDuration(totalMinutes);
    const totalSessions = sessions.length;

    return `
        <div class="group-schedule-container" style="margin-top: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                <h4 style="margin: 0; font-size: 1.15rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <span>📅 Horario Semanal</span>
                    ${totalSessions > 0 ? `<span style="font-size: 0.8rem; font-weight: normal; color: var(--text-tertiary);">(${totalSessions} ${totalSessions === 1 ? 'clase' : 'clases'} / ${weeklyDuration} a la semana)</span>` : ''}
                </h4>
                <button class="btn btn-small btn-secondary" onclick="openGroupModal('${escapeHTML(group.id)}')" style="font-size: 0.8rem; padding: 0.3rem 0.65rem;">✏️ Modificar Horario</button>
            </div>

            <!-- Smart Live Status Banner -->
            <div class="smart-class-status-banner ${smartStatus.badgeClass}">
                <span>${smartStatus.icon}</span>
                <span>${smartStatus.text}</span>
            </div>

            <!-- Week Grid -->
            <div class="schedule-week-grid">
                ${daysToShow.map(dayName => {
                    const isToday = dayName === currentDayName;
                    const daySessions = sessions
                        .filter(s => s.day === dayName)
                        .sort((a, b) => {
                            const [ha, ma] = a.startTime.split(':').map(Number);
                            const [hb, mb] = b.startTime.split(':').map(Number);
                            return (ha * 60 + ma) - (hb * 60 + mb);
                        });

                    return `
                        <div class="schedule-day-column ${isToday ? 'today-column' : ''}">
                            <div class="schedule-day-header">
                                <span>${escapeHTML(dayName)}</span>
                                ${isToday ? '<span style="font-size: 0.7rem; background: var(--accent); color: var(--accent-contrast, #ffffff); padding: 1px 6px; border-radius: 4px;">HOY</span>' : ''}
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                                ${daySessions.length === 0 ? `
                                    <div style="padding: 0.6rem 0.2rem; text-align: center; color: var(--text-tertiary); font-size: 0.8rem; font-style: italic;">
                                        Sin clases
                                    </div>
                                ` : daySessions.map(s => {
                                    const diffMin = calculateMinutesDiff(s.startTime, s.endTime);
                                    const durationStr = formatMinutesDuration(diffMin);
                                    return `
                                        <div class="schedule-session-chip" style="border-left-color: ${escapeHTML(group.color || 'var(--accent)')};">
                                            <div class="schedule-time-range">
                                                <span>🕒 ${escapeHTML(s.startTime)} - ${escapeHTML(s.endTime)}</span>
                                            </div>
                                            <div class="schedule-chip-details">
                                                <span>⏱️ ${durationStr}</span>
                                                ${s.room ? `<span>📍 ${escapeHTML(s.room)}</span>` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Modal Management
function openGroupModal(groupId = null, targetSchoolId = null) {
    editingGroupId = groupId;
    const modal = document.getElementById('groupModal');
    const title = document.getElementById('groupModalTitle');
    const schoolSelect = document.getElementById('groupSchoolSelect');

    // Populate school options
    if (schoolSelect) {
        schoolSelect.innerHTML = `
            <option value="">-- Sin Centro de Trabajo (Grupo sin asignar) --</option>
            ${(appData.schools || []).map(s => `
                <option value="${escapeHTML(s.id)}">${escapeHTML(s.name)} ${s.turn ? `(${escapeHTML(s.turn)})` : ''}</option>
            `).join('')}
        `;
    }

    if (groupId) {
        title.textContent = 'Editar Grupo';
        const group = findGroupById(groupId);
        const parentSchool = findSchoolByGroupId(groupId);
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
            if (schoolSelect) {
                schoolSelect.value = parentSchool ? parentSchool.id : '';
            }

            const sessions = Array.isArray(group.scheduleSessions) && group.scheduleSessions.length > 0
                ? group.scheduleSessions
                : parseScheduleStringToSessions(group.schedule);
            renderScheduleSessionsBuilder(sessions);
        }
    } else {
        title.textContent = 'Crear Grupo';
        document.getElementById('groupForm').reset();
        document.getElementById('groupColor').value = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        if (schoolSelect) {
            schoolSelect.value = targetSchoolId || currentSchoolId || (appData.schools && appData.schools.length === 1 ? appData.schools[0].id : '');
        }
        renderScheduleSessionsBuilder([]);
    }

    modal.classList.add('active');
}

function closeGroupModal() {
    document.getElementById('groupModal').classList.remove('active');
    document.getElementById('groupForm').reset();
    document.getElementById('pdaSuggestions').style.display = 'none';
    const rawContainer = document.getElementById('rawScheduleContainer');
    if (rawContainer) rawContainer.style.display = 'none';
    currentGroupScheduleSessions = [];
    editingGroupId = null;
}

function saveGroup() {
    const name = document.getElementById('groupName').value.trim();
    const grade = document.getElementById('groupGrade').value;
    const pda = document.getElementById('groupPDA').value;
    const pdaContent = document.getElementById('groupPDAContent').value;
    const pdaDate = document.getElementById('groupPDADate').value;
    const methodology = document.getElementById('groupMethodology').value;
    const schedule = formatSessionsToText(currentGroupScheduleSessions) || document.getElementById('groupSchedule').value.trim();
    const hoursPerWeek = document.getElementById('groupHoursPerWeek').value.trim() || String(currentGroupScheduleSessions.length || '5');
    const notes = document.getElementById('groupNotes').value;
    const color = document.getElementById('groupColor').value;
    const schoolSelect = document.getElementById('groupSchoolSelect');
    const selectedSchoolId = schoolSelect ? schoolSelect.value : (currentSchoolId || null);

    if (!name || !grade) {
        alert('El nombre y el grado del grupo son obligatorios');
        return;
    }

    if (editingGroupId) {
        const group = findGroupById(editingGroupId);
        if (group) {
            group.name = name;
            group.grade = grade;
            group.pda = pda;
            group.pdaContent = pdaContent;
            group.pdaDate = pdaDate;
            group.methodology = methodology;
            group.schedule = schedule;
            group.scheduleSessions = [...currentGroupScheduleSessions];
            group.hoursPerWeek = hoursPerWeek;
            group.notes = notes;
            group.color = color;

            // Check if school assignment changed
            const currentParentSchool = findSchoolByGroupId(editingGroupId);
            const currentParentId = currentParentSchool ? currentParentSchool.id : '';
            if (selectedSchoolId !== currentParentId) {
                assignGroupToSchool(editingGroupId, selectedSchoolId);
            }
        }
    } else {
        const newGroup = {
            id: generateUniqueId(),
            name,
            grade,
            pda,
            pdaContent,
            pdaDate,
            methodology,
            schedule,
            scheduleSessions: [...currentGroupScheduleSessions],
            hoursPerWeek,
            notes,
            color: color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
            students: [],
            completedPDAs: [],
            teamSets: [],
            observations: []
        };

        if (selectedSchoolId) {
            const targetSchool = getSchoolById(selectedSchoolId);
            if (targetSchool) {
                if (!Array.isArray(targetSchool.groups)) targetSchool.groups = [];
                targetSchool.groups.push(newGroup);
                currentSchoolId = targetSchool.id;
            } else {
                appData.unassignedGroups.push(newGroup);
            }
        } else {
            appData.unassignedGroups.push(newGroup);
        }
    }

    saveData();
    closeGroupModal();

    if (editingGroupId) {
        showGroupDetail(editingGroupId);
    } else if (currentSchoolId) {
        showSchoolDetail(currentSchoolId);
    } else {
        renderSchools();
    }
}

function deleteGroup() {
    if (!confirm('¿Estás seguro de mover este grupo a la papelera? Podrás restaurarlo más tarde.')) {
        return;
    }

    const group = findGroupById(currentGroupId);
    if (!group) return;

    const parentSchool = findSchoolByGroupId(currentGroupId);

    appData.deletedItems.push({
        id: group.id,
        type: 'group',
        name: group.name,
        parentId: parentSchool ? parentSchool.id : null,
        data: group,
        deletedAt: new Date().toISOString()
    });

    if (parentSchool && Array.isArray(parentSchool.groups)) {
        parentSchool.groups = parentSchool.groups.filter(g => g.id !== currentGroupId);
    } else if (Array.isArray(appData.unassignedGroups)) {
        appData.unassignedGroups = appData.unassignedGroups.filter(g => g.id !== currentGroupId);
    }

    saveData();

    if (parentSchool) {
        showSchoolDetail(parentSchool.id);
    } else {
        showView('viewSchools');
        renderSchools();
    }
}
function renderGroupObservations(group) {
    const container = document.getElementById('groupObservationsContainer');
    if (!container) return;
    
    if (!group.observations) group.observations = [];
    const students = group.students || [];

    const sorted = [...group.observations].sort((a, b) => parseDateString(b.date) - parseDateString(a.date));

    let html = `
        <div class="group-info" style="border-left: 5px solid var(--accent); margin-top: 2rem;">
            <h3 style="margin-bottom: 1rem;">📝 Bitácora Grupal (Diario de Clase)</h3>
            <div style="margin-bottom: 1.5rem;">
                ${students.length > 0 ? `
                    <div class="mention-helper-container">
                        <span class="mention-helper-label">Mención rápida:</span>
                        ${students.map(s => `
                            <span class="student-mention-pill" data-mention="@${escapeHTML(s.fullName)}" title="Haz clic para mencionar a ${escapeHTML(s.fullName)}">
                                <span class="student-color-dot" style="background-color: ${escapeHTML(s.color || '#64748b')};"></span>
                                @${escapeHTML(getStudentShortLabel(s))}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
                <textarea id="newGroupObservationText" placeholder="Escribe un registro de clase. Puedes hacer clic arriba o escribir @Nombre para vincular alumnos..." style="margin-bottom: 0.75rem;"></textarea>
                <button class="btn btn-primary btn-small" id="addGroupObservationBtn" style="width: auto;">+ Agregar Registro</button>
            </div>
    `;

    if (sorted.length === 0) {
        html += '<p style="color: var(--text-tertiary);">No hay registros en la bitácora grupal.</p>';
    } else {
        sorted.forEach(obs => {
            const mentionedIds = getMentionedStudents(students, obs.text);

            let pairHtml = '';
            if (mentionedIds.length >= 2) {
                const conflictKeywords = ['ignor', 'rechaz', 'pelea', 'discut', 'conflict', 'problem', 'excluy', 'molest', 'enoj', 'tensión', 'tension', 'distanc', 'discrepan'];
                const supportKeywords = ['ayud', 'apoy', 'colabor', 'compañer', 'integr', 'defend', 'resolv', 'solidar', 'felicit', 'destac', 'participa'];
                const textLower = normalizeText(obs.text);
                const hasConflictKw = conflictKeywords.some(kw => textLower.includes(normalizeText(kw)));
                const hasSupportKw = supportKeywords.some(kw => textLower.includes(normalizeText(kw)));

                pairHtml += `
                    <div class="tension-override-wrapper" style="margin-top: 0.75rem;">
                        <div class="tension-override-header" data-obs-id="${escapeHTML(obs.id)}" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); transition: all 0.2s ease;">
                            <span>🔗 Ajustar relaciones interpersonales detectadas (${mentionedIds.length} alumnos)</span>
                            <span class="toggle-arrow" style="font-size: 0.75rem; transition: transform 0.2s ease; margin-left: 0.5rem;">▼</span>
                        </div>
                        <div class="tension-override-content" id="tensionContent_${escapeHTML(obs.id)}" style="display: none; background: var(--bg-tertiary); padding: 0.75rem; border-radius: 0 0 8px 8px; border: 1px solid var(--border); border-top: none; margin-top: -1px;">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                `;

                for (let i = 0; i < mentionedIds.length; i++) {
                    for (let j = i + 1; j < mentionedIds.length; j++) {
                        const sA = mentionedIds[i];
                        const sB = mentionedIds[j];
                        const id1 = sA.id;
                        const id2 = sB.id;
                        const pairId = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
                        
                        let isConflictChecked = false;
                        if (obs.confirmedConflicts !== undefined) {
                            isConflictChecked = obs.confirmedConflicts.includes(pairId);
                        } else {
                            isConflictChecked = hasConflictKw;
                        }

                        let isSupportChecked = false;
                        if (obs.confirmedSupports !== undefined) {
                            isSupportChecked = obs.confirmedSupports.includes(pairId);
                        } else {
                            isSupportChecked = hasSupportKw && !hasConflictKw;
                        }

                        const labelA = getStudentShortLabel(sA);
                        const labelB = getStudentShortLabel(sB);

                        const isNeutralChecked = !isConflictChecked && !isSupportChecked;

                        pairHtml += `
                            <div class="pair-relationship-toggle" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--bg-primary); padding: 0.4rem 0.6rem; border-radius: 8px; border: 1px solid var(--border); width: 100%;">
                                <span style="font-weight: 600; color: var(--text-primary); font-size: 0.8rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHTML(labelA)} y ${escapeHTML(labelB)}:</span>
                                <div class="relationship-segment-control">
                                    <label class="${isConflictChecked ? 'selected-tension' : ''}">
                                        <input type="radio" name="rel_${escapeHTML(obs.id)}_${escapeHTML(pairId)}" class="relation-radio tension-radio" data-obs-id="${escapeHTML(obs.id)}" data-pair-id="${escapeHTML(pairId)}" value="conflict" ${isConflictChecked ? 'checked' : ''}>
                                        ⚡ Tensión
                                    </label>
                                    <label class="${isSupportChecked ? 'selected-support' : ''}">
                                        <input type="radio" name="rel_${escapeHTML(obs.id)}_${escapeHTML(pairId)}" class="relation-radio support-radio" data-obs-id="${escapeHTML(obs.id)}" data-pair-id="${escapeHTML(pairId)}" value="support" ${isSupportChecked ? 'checked' : ''}>
                                        🤝 Apoyo
                                    </label>
                                    <label class="${isNeutralChecked ? 'selected-neutral' : ''}">
                                        <input type="radio" name="rel_${escapeHTML(obs.id)}_${escapeHTML(pairId)}" class="relation-radio neutral-radio" data-obs-id="${escapeHTML(obs.id)}" data-pair-id="${escapeHTML(pairId)}" value="neutral" ${isNeutralChecked ? 'checked' : ''}>
                                        No aplica
                                    </label>
                                </div>
                            </div>
                        `;
                    }
                }

                pairHtml += `
                            </div>
                        </div>
                    </div>
                `;
            }

            html += `
                <div class="observation-entry" data-obs-id="${escapeHTML(obs.id)}" style="border-bottom: 1px solid var(--border); padding: 1rem 0;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                        <div style="flex: 1;">
                            <strong style="color: var(--text-tertiary); font-size: 0.85rem;">${escapeHTML(obs.date)}</strong>
                            <p style="margin-top: 0.25rem; white-space: pre-wrap; color: var(--text-primary);">${escapeHTML(obs.text)}</p>
                            ${pairHtml}
                        </div>
                        <div class="observation-actions" style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                            <button class="btn btn-small btn-secondary edit-group-obs-btn" data-obs-id="${escapeHTML(obs.id)}" style="width: auto; padding: 0.25rem 0.5rem;">✏️</button>
                            <button class="btn btn-small btn-danger delete-group-obs-btn" data-obs-id="${escapeHTML(obs.id)}" style="width: auto; padding: 0.25rem 0.5rem;">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += '</div>';
    container.innerHTML = html;

    // Attach mention pills click handlers
    container.querySelectorAll('.student-mention-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const mention = pill.dataset.mention;
            const ta = document.getElementById('newGroupObservationText');
            if (ta) {
                const curVal = ta.value;
                ta.value = curVal ? (curVal.endsWith(' ') ? curVal + mention + ' ' : curVal + ' ' + mention + ' ') : mention + ' ';
                ta.focus();
            }
        });
    });

    document.getElementById('addGroupObservationBtn').addEventListener('click', () => {
        const ta = document.getElementById('newGroupObservationText');
        const text = ta.value.trim();
        if (!text) { alert('Escribe una nota antes de guardar.'); return; }
        addGroupObservation(text);
        ta.value = '';
    });

    container.querySelectorAll('.edit-group-obs-btn').forEach(b => {
        b.addEventListener('click', () => editGroupObservation(b.dataset.obsId));
    });

    container.querySelectorAll('.delete-group-obs-btn').forEach(b => {
        b.addEventListener('click', () => deleteGroupObservation(b.dataset.obsId));
    });

    container.querySelectorAll('.tension-override-header').forEach(hdr => {
        hdr.addEventListener('click', () => {
            const obsId = hdr.dataset.obsId;
            const content = document.getElementById(`tensionContent_${obsId}`);
            const arrow = hdr.querySelector('.toggle-arrow');
            if (content) {
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    arrow.style.transform = 'rotate(180deg)';
                    hdr.style.borderRadius = '8px 8px 0 0';
                } else {
                    content.style.display = 'none';
                    arrow.style.transform = 'rotate(0deg)';
                    hdr.style.borderRadius = '8px';
                }
            }
        });
    });

    function initObservationPairs(observation, group) {
        if (observation.confirmedConflicts !== undefined && observation.confirmedSupports !== undefined) return;
        
        const conflictKeywords = ['ignor', 'rechaz', 'pelea', 'discut', 'conflict', 'problem', 'excluy', 'molest', 'enoj', 'tensión', 'tension', 'distanc', 'discrepan'];
        const supportKeywords = ['ayud', 'apoy', 'colabor', 'compañer', 'integr', 'defend', 'resolv', 'solidar', 'felicit', 'destac', 'participa'];
        const textLower = observation.text.toLowerCase();
        const hasConflictKw = conflictKeywords.some(kw => textLower.includes(kw));
        const hasSupportKw = supportKeywords.some(kw => textLower.includes(kw));
        
        const tempMentionedIds = [];
        group.students.forEach(s => {
            const namesToCheck = [];
            if (s.preferredName && s.preferredName.trim().length >= 2) {
                namesToCheck.push(s.preferredName.trim().toLowerCase());
            }
            const firstFirstName = s.fullName.split(' ')[0].toLowerCase();
            if (firstFirstName.length >= 2) {
                namesToCheck.push(firstFirstName);
            }
            const fullNameLower = s.fullName.toLowerCase();

            const matched = namesToCheck.some(name => {
                const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const namePattern = new RegExp(`\\b${escapedName}\\b`, 'i');
                return namePattern.test(observation.text);
            }) || observation.text.toLowerCase().includes(fullNameLower);

            if (matched) {
                tempMentionedIds.push(s.id);
            }
        });

        if (observation.confirmedConflicts === undefined) {
            const initialConfirmed = [];
            if (hasConflictKw && tempMentionedIds.length >= 2) {
                for (let i = 0; i < tempMentionedIds.length; i++) {
                    for (let j = i + 1; j < tempMentionedIds.length; j++) {
                        const tid1 = tempMentionedIds[i];
                        const tid2 = tempMentionedIds[j];
                        const tpairId = tid1 < tid2 ? `${tid1}_${tid2}` : `${tid2}_${tid1}`;
                        initialConfirmed.push(tpairId);
                    }
                }
            }
            observation.confirmedConflicts = initialConfirmed;
        }

        if (observation.confirmedSupports === undefined) {
            const initialConfirmed = [];
            if (hasSupportKw && !hasConflictKw && tempMentionedIds.length >= 2) {
                for (let i = 0; i < tempMentionedIds.length; i++) {
                    for (let j = i + 1; j < tempMentionedIds.length; j++) {
                        const tid1 = tempMentionedIds[i];
                        const tid2 = tempMentionedIds[j];
                        const tpairId = tid1 < tid2 ? `${tid1}_${tid2}` : `${tid2}_${tid1}`;
                        initialConfirmed.push(tpairId);
                    }
                }
            }
            observation.confirmedSupports = initialConfirmed;
        }
    }

    container.querySelectorAll('.relation-radio').forEach(rb => {
        rb.addEventListener('change', (e) => {
            const obsId = rb.dataset.obsId;
            const pairId = rb.dataset.pairId;
            const value = rb.value;
            
            const observation = group.observations.find(o => o.id === obsId);
            if (observation) {
                initObservationPairs(observation, group);
                
                if (value === 'conflict') {
                    if (!observation.confirmedConflicts.includes(pairId)) {
                        observation.confirmedConflicts.push(pairId);
                    }
                    observation.confirmedSupports = observation.confirmedSupports.filter(id => id !== pairId);
                } else if (value === 'support') {
                    if (!observation.confirmedSupports.includes(pairId)) {
                        observation.confirmedSupports.push(pairId);
                    }
                    observation.confirmedConflicts = observation.confirmedConflicts.filter(id => id !== pairId);
                } else {
                    observation.confirmedConflicts = observation.confirmedConflicts.filter(id => id !== pairId);
                    observation.confirmedSupports = observation.confirmedSupports.filter(id => id !== pairId);
                }
                
                const toggleContainer = rb.closest('.pair-relationship-toggle');
                if (toggleContainer) {
                    const labelTension = toggleContainer.querySelector('.tension-radio').parentElement;
                    const labelSupport = toggleContainer.querySelector('.support-radio').parentElement;
                    const labelNeutral = toggleContainer.querySelector('.neutral-radio').parentElement;
                    
                    labelTension.className = value === 'conflict' ? 'selected-tension' : '';
                    labelSupport.className = value === 'support' ? 'selected-support' : '';
                    labelNeutral.className = value === 'neutral' ? 'selected-neutral' : '';
                }
                
                saveData();
                
                if (typeof renderGeneratedTeams === 'function' && typeof currentTeams !== 'undefined' && currentTeams && currentTeams.length > 0) {
                    renderGeneratedTeams();
                }
                if (typeof renderGroupDiagnostic === 'function') {
                    renderGroupDiagnostic(group);
                }
                if (typeof renderSociogramGraph === 'function' && document.getElementById('sociogramGroupContent')?.style.display === 'block') {
                    renderSociogramGraph(group);
                }
            }
        });
    });
}

function addGroupObservation(text) {
    const group = getCurrentGroup();
    if (!group) return;
    if (!group.observations) group.observations = [];
    
    const date = formatDateTime(new Date());
    
    group.observations.push({
        id: generateUniqueId(),
        date,
        text
    });
    
    saveData();
    renderGroupObservations(group);
}
function editGroupObservation(obsId) {
    const group = getCurrentGroup();
    if (!group || !group.observations) return;
    
    const obs = group.observations.find(o => o.id === obsId);
    if (!obs) return;
    
    const newText = prompt('Editar registro de clase:', obs.text);
    if (newText !== null && newText.trim()) {
        obs.text = newText.trim();
        // Clear the overrides state so that the system recalculates based on the new text
        delete obs.confirmedConflicts;
        delete obs.confirmedSupports;
        
        saveData();
        renderGroupObservations(group);
        
        // Update downstream UI components immediately
        if (typeof renderGeneratedTeams === 'function' && typeof currentTeams !== 'undefined' && currentTeams && currentTeams.length > 0) {
            renderGeneratedTeams();
        }
        if (typeof renderGroupDiagnostic === 'function') {
            renderGroupDiagnostic(group);
        }
        if (typeof renderSociogramGraph === 'function' && document.getElementById('sociogramGroupContent')?.style.display === 'block') {
            renderSociogramGraph(group);
        }
    }
}

function deleteGroupObservation(obsId) {
    if (!confirm('¿Eliminar este registro de la bitácora grupal?')) return;
    
    const group = getCurrentGroup();
    if (!group || !group.observations) return;
    
    group.observations = group.observations.filter(o => o.id !== obsId);
    
    saveData();
    renderGroupObservations(group);
    
    // Update downstream UI components immediately
    if (typeof renderGeneratedTeams === 'function' && typeof currentTeams !== 'undefined' && currentTeams && currentTeams.length > 0) {
        renderGeneratedTeams();
    }
    if (typeof renderGroupDiagnostic === 'function') {
        renderGroupDiagnostic(group);
    }
    if (typeof renderSociogramGraph === 'function' && document.getElementById('sociogramGroupContent')?.style.display === 'block') {
        renderSociogramGraph(group);
    }
}
