// ===== Schools / Centros de Trabajo Management Module =====

let schoolCollapsedSections = {
    internalContext: true,
    externalContext: true,
    schoolProblems: true,
    schoolGroups: false,
    schoolObservations: false
};

function renderSchools() {
    const container = document.getElementById('schoolsContainer');
    const unassignedContainer = document.getElementById('unassignedGroupsContainer');
    if (!container) return;

    // Render unassigned groups alert banner if any exist
    if (unassignedContainer) {
        if (appData.unassignedGroups && appData.unassignedGroups.length > 0) {
            unassignedContainer.innerHTML = `
                <div class="unassigned-groups-banner" style="margin-bottom: 2rem; padding: 1.25rem; background: rgba(245, 158, 11, 0.08); border: 1px solid var(--warning); border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                        <div>
                            <h3 style="margin: 0; color: var(--warning); display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                                ⚠️ Grupos sin Centro de Trabajo (${appData.unassignedGroups.length})
                            </h3>
                            <p style="margin: 0.35rem 0 0 0; font-size: 0.9rem; color: var(--text-secondary);">
                                Tienes grupos creados previamente que aún no están vinculados a ninguna escuela.
                            </p>
                        </div>
                    </div>
                    <div class="unassigned-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
                        ${appData.unassignedGroups.map(g => `
                            <div class="card unassigned-group-card" style="padding: 0.85rem; border-left: 4px solid ${escapeHTML(g.color || 'var(--warning)')};">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div>
                                        <strong style="font-size: 1rem; color: var(--text-primary);">${escapeHTML(g.name)}</strong>
                                        <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: var(--text-tertiary);">
                                            ${g.grade ? `${escapeHTML(g.grade)}° Grado • ` : ''}👥 ${g.students?.length || 0} alumnos
                                        </p>
                                    </div>
                                </div>
                                <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                                    <button class="btn btn-small btn-primary" onclick="promptAssignGroup('${escapeHTML(g.id)}')" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; width: 100%;">
                                        🔗 Asignar a Escuela
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            unassignedContainer.style.display = 'block';
        } else {
            unassignedContainer.innerHTML = '';
            unassignedContainer.style.display = 'none';
        }
    }

    if (!appData.schools || appData.schools.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3.5rem; margin-bottom: 1rem;">🏫</div>
                <h3>No tienes Centros de Trabajo registrados</h3>
                <p>Comienza registrando tu primera escuela o institución para organizar tus grupos y bitácoras.</p>
                <button class="btn btn-primary" onclick="openSchoolModal()">+ Crear Primer Centro de Trabajo</button>
            </div>
        `;
        return;
    }

    const cardsHTML = appData.schools.map(school => {
        const groupsCount = school.groups?.length || 0;
        let totalStudents = 0;
        if (school.groups) {
            school.groups.forEach(g => {
                totalStudents += (g.students?.length || 0);
            });
        }
        const obsCount = school.observations?.length || 0;
        const color = school.color || 'var(--accent)';

        return `
            <div class="card school-card" onclick="showSchoolDetail('${escapeHTML(school.id)}')" style="border-top-color: ${escapeHTML(color)};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                    <h3 style="margin: 0; font-size: 1.25rem;">${escapeHTML(school.name)}</h3>
                </div>
                
                <div class="school-badges" style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem;">
                    ${school.cct ? `<span class="badge badge-secondary" style="font-size: 0.75rem;">🏷️ CCT: ${escapeHTML(school.cct)}</span>` : ''}
                    ${school.turn ? `<span class="badge badge-secondary" style="font-size: 0.75rem;">⏰ ${escapeHTML(school.turn)}</span>` : ''}
                </div>

                <div class="card-meta" style="margin-top: 1.25rem; border-top: 1px dashed var(--border); padding-top: 0.75rem; display: flex; justify-content: space-between;">
                    <span>👥 <strong>${groupsCount}</strong> ${groupsCount === 1 ? 'grupo' : 'grupos'}</span>
                    <span>🎒 <strong>${totalStudents}</strong> ${totalStudents === 1 ? 'alumno' : 'alumnos'}</span>
                    <span>📝 <strong>${obsCount}</strong> ${obsCount === 1 ? 'nota' : 'notas'}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="cards-grid">${cardsHTML}</div>`;
}

function showSchoolDetail(schoolId) {
    currentSchoolId = schoolId;
    const school = getSchoolById(schoolId);
    if (!school) {
        showView('viewSchools');
        renderSchools();
        return;
    }

    // Set titles and badges
    document.getElementById('schoolDetailTitle').textContent = school.name;
    const cctEl = document.getElementById('schoolDetailCCT');
    const turnEl = document.getElementById('schoolDetailTurn');
    if (cctEl) cctEl.textContent = school.cct ? `CCT: ${school.cct}` : '';
    if (turnEl) turnEl.textContent = school.turn ? `Turno ${school.turn}` : '';

    renderSchoolCollapsibleSections(school);
    showView('viewSchoolDetail');
}

function renderSchoolCollapsibleSections(school) {
    const container = document.getElementById('schoolDetailSectionsContainer');
    if (!container) return;

    const groups = school.groups || [];
    const observations = school.observations || [];
    const sortedObs = [...observations].sort((a, b) => parseDateString(b.date) - parseDateString(a.date));

    container.innerHTML = `
        <!-- Section 1: Contexto Interno -->
        <div class="collapsible-card group-info" style="border-left: 5px solid var(--accent); margin-bottom: 1.25rem;">
            <div class="collapsible-header" onclick="toggleSchoolSection('internalContext')" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <h3 style="margin: 0; font-size: 1.15rem;">📁 Contexto Interno</h3>
                    ${school.internalContext ? '<span style="color: var(--success); font-size: 0.8rem;">● Registrado</span>' : '<span style="color: var(--text-tertiary); font-size: 0.8rem;">(Vacío)</span>'}
                </div>
                <span id="schoolToggleIcon_internalContext" style="font-size: 1.1rem; transition: transform 0.2s ease;">${schoolCollapsedSections.internalContext ? '▼' : '▲'}</span>
            </div>
            <div id="schoolSectionContent_internalContext" style="display: ${schoolCollapsedSections.internalContext ? 'none' : 'block'}; margin-top: 1.25rem;">
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.75rem;">
                    Infraestructura del plantel, aulas, recursos tecnológicos, plantilla docente, ambiente escolar y organización institucional.
                </p>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); min-height: 60px;">
                    ${school.internalContext ? `<p style="white-space: pre-wrap; margin: 0; color: var(--text-primary); line-height: 1.6;">${escapeHTML(school.internalContext)}</p>` : '<p style="color: var(--text-tertiary); font-style: italic; margin: 0;">No se ha registrado información de contexto interno.</p>'}
                </div>
                <div style="margin-top: 0.75rem; display: flex; justify-content: flex-end;">
                    <button class="btn btn-small btn-secondary" onclick="quickEditSchoolField('${escapeHTML(school.id)}', 'internalContext', 'Contexto Interno')">✏️ Editar Contexto Interno</button>
                </div>
            </div>
        </div>

        <!-- Section 2: Contexto Externo -->
        <div class="collapsible-card group-info" style="border-left: 5px solid #0284c7; margin-bottom: 1.25rem;">
            <div class="collapsible-header" onclick="toggleSchoolSection('externalContext')" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <h3 style="margin: 0; font-size: 1.15rem;">🌍 Contexto Externo</h3>
                    ${school.externalContext ? '<span style="color: var(--success); font-size: 0.8rem;">● Registrado</span>' : '<span style="color: var(--text-tertiary); font-size: 0.8rem;">(Vacío)</span>'}
                </div>
                <span id="schoolToggleIcon_externalContext" style="font-size: 1.1rem; transition: transform 0.2s ease;">${schoolCollapsedSections.externalContext ? '▼' : '▲'}</span>
            </div>
            <div id="schoolSectionContent_externalContext" style="display: ${schoolCollapsedSections.externalContext ? 'none' : 'block'}; margin-top: 1.25rem;">
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.75rem;">
                    Comunidad circundante, nivel socioeconómico, dinámicas familiares, factores culturales y entorno social de la escuela.
                </p>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); min-height: 60px;">
                    ${school.externalContext ? `<p style="white-space: pre-wrap; margin: 0; color: var(--text-primary); line-height: 1.6;">${escapeHTML(school.externalContext)}</p>` : '<p style="color: var(--text-tertiary); font-style: italic; margin: 0;">No se ha registrado información de contexto externo.</p>'}
                </div>
                <div style="margin-top: 0.75rem; display: flex; justify-content: flex-end;">
                    <button class="btn btn-small btn-secondary" onclick="quickEditSchoolField('${escapeHTML(school.id)}', 'externalContext', 'Contexto Externo')">✏️ Editar Contexto Externo</button>
                </div>
            </div>
        </div>

        <!-- Section 3: Problemáticas de la Escuela -->
        <div class="collapsible-card group-info" style="border-left: 5px solid var(--warning); margin-bottom: 1.25rem;">
            <div class="collapsible-header" onclick="toggleSchoolSection('schoolProblems')" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <h3 style="margin: 0; font-size: 1.15rem;">⚠️ Problemáticas de la Escuela</h3>
                    ${school.schoolProblems ? '<span style="color: var(--success); font-size: 0.8rem;">● Registrado</span>' : '<span style="color: var(--text-tertiary); font-size: 0.8rem;">(Vacío)</span>'}
                </div>
                <span id="schoolToggleIcon_schoolProblems" style="font-size: 1.1rem; transition: transform 0.2s ease;">${schoolCollapsedSections.schoolProblems ? '▼' : '▲'}</span>
            </div>
            <div id="schoolSectionContent_schoolProblems" style="display: ${schoolCollapsedSections.schoolProblems ? 'none' : 'block'}; margin-top: 1.25rem;">
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.75rem;">
                    Diagnóstico de necesidades prioritarias, rezago de aprendizajes, problemas de convivencia, deserción o retos institucionales.
                </p>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); min-height: 60px;">
                    ${school.schoolProblems ? `<p style="white-space: pre-wrap; margin: 0; color: var(--text-primary); line-height: 1.6;">${escapeHTML(school.schoolProblems)}</p>` : '<p style="color: var(--text-tertiary); font-style: italic; margin: 0;">No se han registrado problemáticas de la escuela.</p>'}
                </div>
                <div style="margin-top: 0.75rem; display: flex; justify-content: flex-end;">
                    <button class="btn btn-small btn-secondary" onclick="quickEditSchoolField('${escapeHTML(school.id)}', 'schoolProblems', 'Problemáticas de la Escuela')">✏️ Editar Problemáticas</button>
                </div>
            </div>
        </div>

        <!-- Section 4: Grupos del Centro de Trabajo -->
        <div class="collapsible-card group-info" style="border-left: 5px solid #10b981; margin-bottom: 1.25rem;">
            <div class="collapsible-header" onclick="toggleSchoolSection('schoolGroups')" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <h3 style="margin: 0; font-size: 1.15rem;">👥 Grupos del Centro de Trabajo (${groups.length})</h3>
                </div>
                <span id="schoolToggleIcon_schoolGroups" style="font-size: 1.1rem; transition: transform 0.2s ease;">${schoolCollapsedSections.schoolGroups ? '▼' : '▲'}</span>
            </div>
            <div id="schoolSectionContent_schoolGroups" style="display: ${schoolCollapsedSections.schoolGroups ? 'none' : 'block'}; margin-top: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">Grupos escolares activos asignados a este plantel:</p>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${(appData.unassignedGroups && appData.unassignedGroups.length > 0) ? `
                            <button class="btn btn-small btn-secondary" onclick="promptLinkUnassignedGroupToSchool('${escapeHTML(school.id)}')">🔗 Vincular Grupo Existente</button>
                        ` : ''}
                        <button class="btn btn-small btn-primary" onclick="openGroupModal(null, '${escapeHTML(school.id)}')">+ Crear Grupo</button>
                    </div>
                </div>

                ${groups.length === 0 ? `
                    <div style="text-align: center; padding: 2rem 1rem; background: var(--bg-tertiary); border-radius: 8px; border: 1px dashed var(--border);">
                        <p style="color: var(--text-tertiary); margin: 0 0 1rem 0;">No hay grupos registrados en este Centro de Trabajo.</p>
                        <button class="btn btn-primary btn-small" onclick="openGroupModal(null, '${escapeHTML(school.id)}')">+ Crear Primer Grupo</button>
                    </div>
                ` : `
                    <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));">
                        ${groups.map(group => `
                            <div class="card" onclick="showGroupDetail('${escapeHTML(group.id)}')" style="border-top-color: ${escapeHTML(group.color || 'var(--accent)')};">
                                <h3>${escapeHTML(group.name)}</h3>
                                <div class="card-meta">
                                    ${group.grade ? `<span>${escapeHTML(group.grade)}° Grado</span>` : ''}
                                    <span>👥 ${group.students?.length || 0} alumnos</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>

        <!-- Section 5: Bitácora Institucional -->
        <div class="collapsible-card group-info" style="border-left: 5px solid #8b5cf6; margin-bottom: 1.25rem;">
            <div class="collapsible-header" onclick="toggleSchoolSection('schoolObservations')" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <h3 style="margin: 0; font-size: 1.15rem;">📝 Bitácora Institucional (${observations.length})</h3>
                </div>
                <span id="schoolToggleIcon_schoolObservations" style="font-size: 1.1rem; transition: transform 0.2s ease;">${schoolCollapsedSections.schoolObservations ? '▼' : '▲'}</span>
            </div>
            <div id="schoolSectionContent_schoolObservations" style="display: ${schoolCollapsedSections.schoolObservations ? 'none' : 'block'}; margin-top: 1.25rem;">
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.75rem;">
                    Registro de acuerdos de Consejo Técnico Escolar (CTE), reuniones con directivos, incidencias generales o eventos relevantes del plantel.
                </p>

                <div style="margin-bottom: 1.5rem;">
                    <textarea id="newSchoolObservationText" placeholder="Escribe una nueva nota o acuerdo institucional..." style="margin-bottom: 0.75rem; width: 100%;" rows="3"></textarea>
                    <button class="btn btn-primary btn-small" onclick="handleAddSchoolObservation()" style="width: auto;">+ Agregar Nota Institucional</button>
                </div>

                <div id="schoolObservationsListContainer">
                    ${sortedObs.length === 0 ? `
                        <p style="color: var(--text-tertiary); font-style: italic; margin: 0;">No hay notas registradas en la bitácora institucional.</p>
                    ` : sortedObs.map(obs => `
                        <div class="observation-entry" style="border-left-color: #8b5cf6;" data-obs-id="${escapeHTML(obs.id)}">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                                <div style="flex: 1;">
                                    <strong style="color: var(--text-tertiary); font-size: 0.85rem;">${escapeHTML(obs.date)}</strong>
                                    <p style="margin-top: 0.25rem; white-space: pre-wrap; color: var(--text-primary); line-height: 1.5;">${escapeHTML(obs.text)}</p>
                                </div>
                                <div class="observation-actions">
                                    <button class="btn btn-small btn-secondary" onclick="editSchoolObservation('${escapeHTML(obs.id)}')" title="Editar">✏️</button>
                                    <button class="btn btn-small btn-danger" onclick="deleteSchoolObservation('${escapeHTML(obs.id)}')" title="Eliminar">🗑️</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function toggleSchoolSection(sectionName) {
    schoolCollapsedSections[sectionName] = !schoolCollapsedSections[sectionName];
    const content = document.getElementById(`schoolSectionContent_${sectionName}`);
    const icon = document.getElementById(`schoolToggleIcon_${sectionName}`);
    if (content) {
        content.style.display = schoolCollapsedSections[sectionName] ? 'none' : 'block';
    }
    if (icon) {
        icon.textContent = schoolCollapsedSections[sectionName] ? '▼' : '▲';
    }
}

// Modal Form for School
function openSchoolModal(schoolId = null) {
    editingSchoolId = schoolId;
    const modal = document.getElementById('schoolModal');
    const title = document.getElementById('schoolModalTitle');

    if (schoolId) {
        title.textContent = 'Editar Centro de Trabajo';
        const school = getSchoolById(schoolId);
        if (school) {
            document.getElementById('schoolName').value = school.name || '';
            document.getElementById('schoolCCT').value = school.cct || '';
            document.getElementById('schoolTurn').value = school.turn || '';
            document.getElementById('schoolColor').value = school.color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
            document.getElementById('schoolInternalContext').value = school.internalContext || '';
            document.getElementById('schoolExternalContext').value = school.externalContext || '';
            document.getElementById('schoolProblems').value = school.schoolProblems || '';
        }
    } else {
        title.textContent = 'Crear Centro de Trabajo';
        document.getElementById('schoolForm').reset();
        document.getElementById('schoolColor').value = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    }

    modal.classList.add('active');
}

function closeSchoolModal() {
    const modal = document.getElementById('schoolModal');
    if (modal) modal.classList.remove('active');
    document.getElementById('schoolForm').reset();
    editingSchoolId = null;
}

function saveSchool() {
    const name = document.getElementById('schoolName').value.trim();
    const cct = document.getElementById('schoolCCT').value.trim();
    const turn = document.getElementById('schoolTurn').value;
    const color = document.getElementById('schoolColor').value;
    const internalContext = document.getElementById('schoolInternalContext').value.trim();
    const externalContext = document.getElementById('schoolExternalContext').value.trim();
    const schoolProblems = document.getElementById('schoolProblems').value.trim();

    if (!name) {
        alert('El nombre del Centro de Trabajo es obligatorio.');
        return;
    }

    if (editingSchoolId) {
        const school = getSchoolById(editingSchoolId);
        if (school) {
            school.name = name;
            school.cct = cct;
            school.turn = turn;
            school.color = color;
            school.internalContext = internalContext;
            school.externalContext = externalContext;
            school.schoolProblems = schoolProblems;
        }
    } else {
        const newSchool = {
            id: generateUniqueId(),
            name,
            cct,
            turn,
            color: color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
            internalContext,
            externalContext,
            schoolProblems,
            groups: [],
            observations: []
        };
        appData.schools.push(newSchool);
        editingSchoolId = newSchool.id;
    }

    saveData();
    closeSchoolModal();

    if (currentSchoolId) {
        showSchoolDetail(currentSchoolId);
    } else {
        renderSchools();
    }
}

function deleteSchool(schoolId = null) {
    const targetId = schoolId || currentSchoolId;
    const school = getSchoolById(targetId);
    if (!school) return;

    const groupCount = school.groups?.length || 0;
    const msg = groupCount > 0
        ? `¿Estás seguro de mover este Centro de Trabajo a la papelera?\nSe incluirán los ${groupCount} grupos y sus alumnos. Podrás restaurarlos desde la papelera.`
        : '¿Estás seguro de mover este Centro de Trabajo a la papelera?';

    if (!confirm(msg)) return;

    const index = appData.schools.findIndex(s => s.id === targetId);
    if (index !== -1) {
        appData.deletedItems.push({
            id: school.id,
            type: 'school',
            name: school.name,
            data: school,
            deletedAt: new Date().toISOString()
        });
        appData.schools.splice(index, 1);
    }

    currentSchoolId = null;
    saveData();
    showView('viewSchools');
    renderSchools();
}

function quickEditSchoolField(schoolId, field, fieldTitle) {
    const school = getSchoolById(schoolId);
    if (!school) return;

    const currentVal = school[field] || '';
    const newVal = prompt(`Editar ${fieldTitle}:`, currentVal);
    if (newVal !== null) {
        school[field] = newVal.trim();
        saveData();
        renderSchoolCollapsibleSections(school);
    }
}

// Institutional Observations
function handleAddSchoolObservation() {
    const ta = document.getElementById('newSchoolObservationText');
    if (!ta) return;
    const text = ta.value.trim();
    if (!text) {
        alert('Escribe una nota institucional antes de guardar.');
        return;
    }
    addSchoolObservation(text);
    ta.value = '';
}

function addSchoolObservation(text) {
    const school = getCurrentSchool();
    if (!school) return;
    if (!school.observations) school.observations = [];

    const date = formatDateTime(new Date());
    school.observations.push({
        id: generateUniqueId(),
        date,
        text
    });

    saveData();
    renderSchoolCollapsibleSections(school);
}

function editSchoolObservation(obsId) {
    const school = getCurrentSchool();
    if (!school || !school.observations) return;
    const obs = school.observations.find(o => o.id === obsId);
    if (!obs) return;

    const newText = prompt('Editar nota institucional:', obs.text);
    if (newText !== null && newText.trim()) {
        obs.text = newText.trim();
        saveData();
        renderSchoolCollapsibleSections(school);
    }
}

function deleteSchoolObservation(obsId) {
    if (!confirm('¿Eliminar esta nota de la bitácora institucional?')) return;
    const school = getCurrentSchool();
    if (!school || !school.observations) return;

    school.observations = school.observations.filter(o => o.id !== obsId);
    saveData();
    renderSchoolCollapsibleSections(school);
}

// Assign orphaned groups
function promptAssignGroup(groupId) {
    const group = findGroupById(groupId);
    if (!group) return;

    if (!appData.schools || appData.schools.length === 0) {
        alert('No tienes ningún Centro de Trabajo registrado aún. Primero crea uno con el botón "+ Crear Centro de Trabajo".');
        return;
    }

    let msg = `Selecciona el número del Centro de Trabajo donde deseas ubicar el grupo "${group.name}":\n\n`;
    appData.schools.forEach((s, idx) => {
        msg += `${idx + 1}. ${s.name} ${s.turn ? `(${s.turn})` : ''}\n`;
    });

    const choice = prompt(msg, '1');
    if (choice === null) return;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || !appData.schools[idx]) {
        alert('Selección no válida.');
        return;
    }

    const targetSchool = appData.schools[idx];
    assignGroupToSchool(groupId, targetSchool.id);
    renderSchools();
    alert(`Grupo "${group.name}" asignado exitosamente a "${targetSchool.name}".`);
}

function promptLinkUnassignedGroupToSchool(schoolId) {
    const school = getSchoolById(schoolId);
    if (!school) return;

    if (!appData.unassignedGroups || appData.unassignedGroups.length === 0) {
        alert('No hay grupos sin asignar.');
        return;
    }

    let msg = `Selecciona el número del grupo que deseas vincular a "${school.name}":\n\n`;
    appData.unassignedGroups.forEach((g, idx) => {
        msg += `${idx + 1}. ${g.name} (${g.grade || 'Sin'}° Grado, ${g.students?.length || 0} alumnos)\n`;
    });

    const choice = prompt(msg, '1');
    if (choice === null) return;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || !appData.unassignedGroups[idx]) {
        alert('Selección no válida.');
        return;
    }

    const targetGroup = appData.unassignedGroups[idx];
    assignGroupToSchool(targetGroup.id, school.id);
    renderSchoolCollapsibleSections(school);
    alert(`Grupo "${targetGroup.name}" vinculado exitosamente a "${school.name}".`);
}
