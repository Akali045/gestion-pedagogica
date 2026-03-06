function renderStudentsTable(students) {
    const container = document.getElementById('studentsTableContainer');

    if (students.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No hay alumnos registrados</h3>
                <p>Agrega alumnos a este grupo para comenzar</p>
            </div>
        `;
        return;
    }

    const sortedStudents = [...students].sort((a, b) => a.listNumber - b.listNumber);

    const tableHTML = `
        <div class="students-table">
            <div class="student-row header">
                <div>N°</div>
                <div>Nombre</div>
                <div>Canal</div>
                <div>Edad</div>
            </div>
            ${sortedStudents.map(student => `
                <div class="student-row" onclick="showStudentDetail('${student.id}')">
                    <div>${student.listNumber}</div>
                    <div>
                        <span class="student-color-dot" style="background-color: ${student.color || '#f8fafc'};"></span>
                        ${student.fullName}
                    </div>
                    <div>${student.learningChannel}</div>
                    <div>${student.age || '-'}</div>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = tableHTML;
}

function showStudentDetail(studentId) {
    currentStudentId = studentId;
    const group = appData.groups.find(g => g.id === currentGroupId);
    const student = group.students.find(s => s.id === studentId);

    if (!student) return;

    document.getElementById('studentDetailTitle').textContent = student.fullName;

    const studentInfoHTML = `
        <h3>Información del Alumno</h3>
        <div class="group-info-grid">
            <div class="info-item">
                <label>Nombre Completo</label>
                <p>${student.fullName}</p>
            </div>
            <div class="info-item">
                <label>Prefiere que le llamen</label>
                <p>${student.preferredName || 'No especificado'}</p>
            </div>
            <div class="info-item">
                <label>Número de Lista</label>
                <p>${student.listNumber}</p>
            </div>
            <div class="info-item">
                <label>Género</label>
                <p>${student.gender || 'No especificado'}</p>
            </div>
            <div class="info-item">
                <label>Edad</label>
                <p>${student.age || 'No especificada'}</p>
            </div>
            <div class="info-item">
                <label>Canal de Aprendizaje</label>
                <p>${student.learningChannel}</p>
            </div>
        </div>

        <div class="notes-section">
            <h4>Intereses Particulares</h4>
            <div class="tag-input-container">
                ${student.interests && student.interests.length > 0
            ? student.interests.map(interest => `<div class="tag-badge">${interest}</div>`).join('')
            : '<p>No especificados</p>'
        }
            </div>
        </div>

        <div class="notes-section">
            <h4>Aspiraciones Profesionales</h4>
            <div class="tag-input-container">
                ${(Array.isArray(student.futureCareer) ? student.futureCareer : (student.futureCareer ? [student.futureCareer] : []))
            .length > 0
            ? (Array.isArray(student.futureCareer) ? student.futureCareer : [student.futureCareer]).map(career => `<div class="tag-badge">${career}</div>`).join('')
            : '<p>No especificadas</p>'
        }
            </div>
        </div>

        ${(() => {
            if (!student.bap) return '';
            if (typeof student.bap === 'string') {
                return `<div class="notes-section">
                    <h4>Barreras para el Aprendizaje y la Participación (BAP)</h4>
                    <p>${student.bap}</p>
                </div>`;
            }
            const cats = student.bap.categories || [];
            const desc = student.bap.description || '';
            if (cats.length === 0 && !desc) return '';
            return `<div class="notes-section">
                <h4>Barreras para el Aprendizaje y la Participación (BAP)</h4>
                ${cats.length > 0 ? `<div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                    ${cats.map(c => `<span class="filter-badge active">${c}</span>`).join('')}
                </div>` : ''}
                ${desc ? `<p>${desc}</p>` : ''}
            </div>`;
        })()}

        ${student.notes ? `
            <div class="notes-section">
                <h4>Notas Adicionales</h4>
                <p>${student.notes}</p>
            </div>
        ` : ''}
    `;

    document.getElementById('studentInfoContainer').innerHTML = studentInfoHTML;

    renderObservations(student);
    renderSociogramCapture(student, group);

    showView('viewStudentDetail');
}

function openStudentModal(studentId = null) {
    editingStudentId = studentId;
    const modal = document.getElementById('studentModal');
    const title = document.getElementById('studentModalTitle');

    if (studentId) {
        title.textContent = 'Editar Alumno';
        const group = appData.groups.find(g => g.id === currentGroupId);
        const student = group.students.find(s => s.id === studentId);
        if (student) {
            document.getElementById('studentFullName').value = student.fullName;
            document.getElementById('studentListNumber').value = student.listNumber;
            document.getElementById('studentPreferredName').value = student.preferredName || '';
            document.getElementById('studentGender').value = student.gender || '';
            document.getElementById('studentAge').value = student.age || '';
            document.getElementById('studentLearningChannel').value = student.learningChannel;
            if (typeof student.bap === 'string') {
                currentBapCategories = [];
                document.getElementById('studentBAPDescription').value = student.bap || '';
            } else if (student.bap && typeof student.bap === 'object') {
                currentBapCategories = [...(student.bap.categories || [])];
                document.getElementById('studentBAPDescription').value = student.bap.description || '';
            } else {
                currentBapCategories = [];
                document.getElementById('studentBAPDescription').value = '';
            }
            document.getElementById('studentNotes').value = student.notes || '';
            document.getElementById('studentColor').value = student.color || '#f8fafc';
            currentStudentInterests = Array.isArray(student.interests) ? [...student.interests] : [];
            // Manejar compatibilidad con datos antiguos (string) o nuevos (array)
            currentStudentFutureCareers = Array.isArray(student.futureCareer) ? [...student.futureCareer] : (student.futureCareer ? [student.futureCareer] : []);
        }
    } else {
        title.textContent = 'Agregar Alumno';
        document.getElementById('studentForm').reset();
        currentStudentInterests = [];
        currentStudentFutureCareers = [];
        currentBapCategories = [];
    }
    updateAutocompleteLists();
    renderInterestTags();
    renderCareerTags();
    renderBapCategoryBadges();
    modal.classList.add('active');
}

function closeStudentModal() {
    document.getElementById('studentModal').classList.remove('active');
    document.getElementById('studentForm').reset();
    editingStudentId = null;
    currentStudentInterests = [];
    currentStudentFutureCareers = [];
    currentBapCategories = [];
}

function saveStudent() {
    const fullName = document.getElementById('studentFullName').value;
    const listNumber = parseInt(document.getElementById('studentListNumber').value);
    const preferredName = document.getElementById('studentPreferredName').value;
    const gender = document.getElementById('studentGender').value;
    const age = document.getElementById('studentAge').value;
    const learningChannel = document.getElementById('studentLearningChannel').value;
    const bap = { categories: [...currentBapCategories], description: document.getElementById('studentBAPDescription').value };
    const notes = document.getElementById('studentNotes').value;
    const color = document.getElementById('studentColor').value;
    const interests = currentStudentInterests;
    const futureCareer = currentStudentFutureCareers;

    if (!fullName || !listNumber) {
        alert('Los campos marcados con * son obligatorios');
        return;
    }

    const group = appData.groups.find(g => g.id === currentGroupId);

    if (editingStudentId) {
        const student = group.students.find(s => s.id === editingStudentId);
        if (student) {
            student.fullName = fullName;
            student.listNumber = listNumber;
            student.preferredName = preferredName;
            student.gender = gender;
            student.age = age;
            student.learningChannel = learningChannel;
            student.interests = interests;
            student.bap = bap;
            student.notes = notes;
            student.color = color;
            student.futureCareer = futureCareer;
        }
    } else {
        const newStudent = {
            id: Date.now().toString(),
            fullName,
            listNumber,
            preferredName,
            gender,
            age,
            learningChannel,
            interests,
            bap,
            notes,
            color,
            futureCareer
        };
        group.students.push(newStudent);
    }

    saveData();
    closeStudentModal();

    if (editingStudentId) {
        showStudentDetail(editingStudentId);
    } else {
        showGroupDetail(currentGroupId);
    }
}

function deleteStudent() {
    if (!confirm('¿Estás seguro de eliminar este alumno?')) {
        return;
    }

    const group = appData.groups.find(g => g.id === currentGroupId);
    group.students = group.students.filter(s => s.id !== currentStudentId);
    saveData();
    showGroupDetail(currentGroupId);
}

function renderInterestTags() {
    const container = document.getElementById('interestsTagContainer');
    // Clear existing tags except for the input
    container.querySelectorAll('.tag-badge').forEach(tagEl => tagEl.remove());

    currentStudentInterests.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'tag-badge';
        tagEl.innerHTML = `
            <span>${tag}</span>
            <span class="tag-remove" data-tag="${tag}">&times;</span>
        `;
        container.insertBefore(tagEl, document.getElementById('interestInput'));
    });

    // Add event listeners to remove buttons
    container.querySelectorAll('.tag-remove').forEach(removeBtn => {
        removeBtn.addEventListener('click', function () {
            const tagToRemove = this.dataset.tag;
            currentStudentInterests = currentStudentInterests.filter(t => t !== tagToRemove);
            renderInterestTags();
        });
    });
}

function renderCareerTags() {
    const container = document.getElementById('careersTagContainer');
    container.querySelectorAll('.tag-badge').forEach(tagEl => tagEl.remove());

    currentStudentFutureCareers.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'tag-badge';
        tagEl.innerHTML = `
            <span>${tag}</span>
            <span class="tag-remove" data-tag="${tag}">&times;</span>
        `;
        container.insertBefore(tagEl, document.getElementById('careerInput'));
    });

    container.querySelectorAll('.tag-remove').forEach(removeBtn => {
        removeBtn.addEventListener('click', function () {
            const tagToRemove = this.dataset.tag;
            currentStudentFutureCareers = currentStudentFutureCareers.filter(t => t !== tagToRemove);
            renderCareerTags();
        });
    });
}

// ===== BAP Category Badges =====
function renderBapCategoryBadges() {
    const container = document.getElementById('bapCategoriesContainer');
    if (!container) return;
    container.innerHTML = BAP_CATEGORIES.map(cat => `
        <span class="filter-badge ${currentBapCategories.includes(cat) ? 'active' : ''}" data-bap-cat="${cat}" style="cursor: pointer;">${cat}</span>
    `).join('');
    container.querySelectorAll('.filter-badge').forEach(badge => {
        badge.addEventListener('click', () => {
            const cat = badge.dataset.bapCat;
            if (currentBapCategories.includes(cat)) {
                currentBapCategories = currentBapCategories.filter(c => c !== cat);
            } else {
                currentBapCategories.push(cat);
            }
            renderBapCategoryBadges();
        });
    });
}

function updateAutocompleteLists() {
    const interests = new Set();
    const careers = new Set();

    appData.groups.forEach(g => {
        g.students.forEach(s => {
            if (Array.isArray(s.interests)) s.interests.forEach(i => interests.add(i));

            if (Array.isArray(s.futureCareer)) {
                s.futureCareer.forEach(c => careers.add(c));
            } else if (s.futureCareer) {
                careers.add(s.futureCareer);
            }
        });
    });

    document.getElementById('availableInterests').innerHTML = Array.from(interests).sort().map(i => `<option value="${i}">`).join('');
    document.getElementById('availableCareers').innerHTML = Array.from(careers).sort().map(c => `<option value="${c}">`).join('');
}
