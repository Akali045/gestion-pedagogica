// ===== Observation Log =====
function renderObservations(student) {
    const existing = document.getElementById('observationSection');
    if (existing) existing.remove();
    if (!student.observations) student.observations = [];

    const section = document.createElement('div');
    section.id = 'observationSection';
    section.style.marginTop = '2rem';

    const sorted = [...student.observations].sort((a, b) => {
        const p = d => { const pts = d.split('/'); return new Date(pts[2], pts[1] - 1, pts[0]); };
        return p(b.date) - p(a.date);
    });

    let html = `<div class="group-info" style="border-left: 5px solid var(--warning);">
        <h3 style="margin-bottom: 1rem;">📝 Bitácora de Observaciones</h3>
        <div style="margin-bottom: 1.5rem;">
            <textarea id="newObservationText" placeholder="Escribe una nueva observación..." style="margin-bottom: 0.75rem;"></textarea>
            <button class="btn btn-primary btn-small" id="addObservationBtn">+ Agregar Observación</button>
        </div>`;

    if (sorted.length === 0) {
        html += '<p style="color: var(--text-tertiary);">No hay observaciones registradas.</p>';
    } else {
        sorted.forEach(obs => {
            html += `<div class="observation-entry" data-obs-id="${obs.id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <strong style="color: var(--text-tertiary); font-size: 0.85rem;">${obs.date}</strong>
                        <p style="margin-top: 0.25rem; white-space: pre-wrap;">${obs.text}</p>
                    </div>
                    <div class="observation-actions">
                        <button class="btn btn-small btn-secondary edit-obs-btn" data-obs-id="${obs.id}">✏️</button>
                        <button class="btn btn-small btn-danger delete-obs-btn" data-obs-id="${obs.id}">🗑️</button>
                    </div>
                </div>
            </div>`;
        });
    }
    html += '</div>';
    section.innerHTML = html;

    const container = document.getElementById('studentInfoContainer');
    container.parentNode.insertBefore(section, container.nextSibling);

    document.getElementById('addObservationBtn').addEventListener('click', () => {
        const ta = document.getElementById('newObservationText');
        const text = ta.value.trim();
        if (!text) { alert('Escribe una observación antes de guardar.'); return; }
        addObservation(text);
        ta.value = '';
    });
    section.querySelectorAll('.edit-obs-btn').forEach(b => b.addEventListener('click', () => editObservation(b.dataset.obsId)));
    section.querySelectorAll('.delete-obs-btn').forEach(b => b.addEventListener('click', () => deleteObservation(b.dataset.obsId)));
}

function addObservation(text) {
    const group = appData.groups.find(g => g.id === currentGroupId);
    const student = group.students.find(s => s.id === currentStudentId);
    if (!student.observations) student.observations = [];
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    student.observations.push({ id: Date.now().toString(), date, text });
    saveData();
    renderObservations(student);
}

function editObservation(obsId) {
    const group = appData.groups.find(g => g.id === currentGroupId);
    const student = group.students.find(s => s.id === currentStudentId);
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
    const group = appData.groups.find(g => g.id === currentGroupId);
    const student = group.students.find(s => s.id === currentStudentId);
    student.observations = student.observations.filter(o => o.id !== obsId);
    saveData();
    renderObservations(student);
}
