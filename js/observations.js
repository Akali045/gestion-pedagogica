// ===== Observation Log =====
function renderObservations(student) {
    const container = document.getElementById('studentObservationsContainer');
    if (!container) return;

    if (!student.observations) student.observations = [];

    const sorted = [...student.observations].sort((a, b) => parseDateString(b.date) - parseDateString(a.date));

    let html = `
        <div id="observationSection" class="group-info" style="border-left: 5px solid var(--warning); margin-top: 2rem;">
            <h3 style="margin-bottom: 1rem;">📝 Bitácora de Observaciones</h3>
            <div style="margin-bottom: 1.5rem;">
                <textarea id="newObservationText" placeholder="Escribe una nueva observación..." style="margin-bottom: 0.75rem;"></textarea>
                <button class="btn btn-primary btn-small" id="addObservationBtn">+ Agregar Observación</button>
            </div>
    `;

    if (sorted.length === 0) {
        html += '<p style="color: var(--text-tertiary);">No hay observaciones registradas.</p>';
    } else {
        sorted.forEach(obs => {
            html += `
                <div class="observation-entry" data-obs-id="${escapeHTML(obs.id)}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <strong style="color: var(--text-tertiary); font-size: 0.85rem;">${escapeHTML(obs.date)}</strong>
                            <p style="margin-top: 0.25rem; white-space: pre-wrap; color: var(--text-primary);">${escapeHTML(obs.text)}</p>
                        </div>
                        <div class="observation-actions">
                            <button class="btn btn-small btn-secondary edit-obs-btn" data-obs-id="${escapeHTML(obs.id)}">✏️</button>
                            <button class="btn btn-small btn-danger delete-obs-btn" data-obs-id="${escapeHTML(obs.id)}">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    html += '</div>';
    container.innerHTML = html;

    document.getElementById('addObservationBtn').addEventListener('click', () => {
        const ta = document.getElementById('newObservationText');
        const text = ta.value.trim();
        if (!text) { alert('Escribe una observación antes de guardar.'); return; }
        addObservation(text);
        ta.value = '';
    });
    container.querySelectorAll('.edit-obs-btn').forEach(b => b.addEventListener('click', () => editObservation(b.dataset.obsId)));
    container.querySelectorAll('.delete-obs-btn').forEach(b => b.addEventListener('click', () => deleteObservation(b.dataset.obsId)));
}

function addObservation(text) {
    const group = getCurrentGroup();
    if (!group) return;
    const student = group.students.find(s => s.id === currentStudentId);
    if (!student) return;
    if (!student.observations) student.observations = [];
    const date = formatDateTime(new Date());
    student.observations.push({ id: generateUniqueId(), date, text });
    saveData();
    renderObservations(student);
}

function editObservation(obsId) {
    const group = getCurrentGroup();
    if (!group) return;
    const student = group.students.find(s => s.id === currentStudentId);
    if (!student) return;
    const obs = student.observations.find(o => o.id === obsId);
    if (!obs) return;
    const newText = prompt('Editar observación:', obs.text);
    if (newText !== null && newText.trim()) {
        obs.text = newText.trim();
        saveData();
        renderObservations(student);
    }
}

function deleteObservation(obsId) {
    if (!confirm('¿Eliminar esta observación?')) return;
    const group = getCurrentGroup();
    if (!group) return;
    const student = group.students.find(s => s.id === currentStudentId);
    if (!student) return;
    student.observations = student.observations.filter(o => o.id !== obsId);
    saveData();
    renderObservations(student);
}

