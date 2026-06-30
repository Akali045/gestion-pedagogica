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
    if (!confirm('¿Estás seguro de mover este alumno a la papelera? Podrás restaurarlo más tarde.')) {
        return;
    }

    const group = appData.groups.find(g => g.id === currentGroupId);
    const studentIndex = group.students.findIndex(s => s.id === currentStudentId);
    if (studentIndex !== -1) {
        const student = group.students[studentIndex];
        appData.deletedItems.push({
            id: student.id,
            type: 'student',
            name: student.fullName,
            parentId: currentGroupId,
            data: student,
            deletedAt: new Date().toISOString()
        });
        group.students.splice(studentIndex, 1);
    }

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

// ===== PDF Export =====
function exportStudentToPDF(studentId) {
    const group = appData.groups.find(g => g.id === currentGroupId);
    const student = group.students.find(s => s.id === studentId);
    if (!student) return;

    // Calculate sociogram relations
    const dimensions = [
        { key: 'academic', title: 'Dimensión Académica' },
        { key: 'social', title: 'Dimensión Social' },
        { key: 'complementary', title: 'Dimensión Complementaria' }
    ];

    const getStudentName = (id) => {
        const s = group.students.find(x => x.id === id);
        return s ? s.fullName : 'Desconocido';
    };

    let sociogramHTML = '';
    
    dimensions.forEach(dim => {
        // Who they chose
        const outgoing = (student.sociogram && student.sociogram[dim.key]) ? student.sociogram[dim.key] : [];
        const outgoingNames = outgoing.map(id => getStudentName(id));
        
        // Who chose them
        const incoming = group.students.filter(s => s.sociogram && s.sociogram[dim.key] && s.sociogram[dim.key].includes(studentId));
        const incomingNames = incoming.map(s => s.fullName);

        sociogramHTML += `
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 5px 0; color: #333; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 3px;">${dim.title}</h4>
                <div style="font-size: 13px; color: #555;">
                    <p style="margin: 3px 0;"><strong>A quién elige:</strong> ${outgoingNames.length > 0 ? outgoingNames.join(', ') : 'Ninguno'}</p>
                    <p style="margin: 3px 0;"><strong>Quién lo elige:</strong> ${incomingNames.length > 0 ? incomingNames.join(', ') : 'Ninguno'}</p>
                </div>
            </div>
        `;
    });

    // Content HTML
    const interestsStr = Array.isArray(student.interests) ? student.interests.join(', ') : 'No especificados';
    const careersStr = Array.isArray(student.futureCareer) ? student.futureCareer.join(', ') : (student.futureCareer || 'No especificadas');
    
    let bapStr = '';
    if (typeof student.bap === 'string') {
        bapStr = student.bap;
    } else if (student.bap) {
        const bapCats = student.bap.categories || [];
        const bapDesc = student.bap.description || '';
        bapStr = (bapCats.length > 0 ? `Categorías: ${bapCats.join(', ')}` : '') + (bapDesc ? `\nDescripción: ${bapDesc}` : '');
    }

    // Observations
    const obs = student.observations || [];
    let obsHTML = '<p style="font-size: 13px; color: #555;">No hay observaciones registradas.</p>';
    if (obs.length > 0) {
        obsHTML = `<ul style="font-size: 13px; color: #555; padding-left: 20px; margin: 0;">` +
            obs.slice().reverse().map(o => `
                <li style="margin-bottom: 8px;">
                    <strong>${o.date}</strong>: ${o.text}
                </li>
            `).join('') + `</ul>`;
    }

    const htmlContent = `
        <div style="padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; color: black; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0c4a6e; padding-bottom: 20px;">
                <h1 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 24px;">Ficha del Alumno</h1>
                <h2 style="color: #334155; margin: 0; font-size: 18px;">${student.fullName}</h2>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Grupo: ${group.name} - Grado: ${group.grade}°</p>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px;">
                <div style="flex: 1; min-width: 250px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">Datos Generales</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
                        <li><strong>N° de Lista:</strong> ${student.listNumber}</li>
                        <li><strong>Edad:</strong> ${student.age || 'No especificada'}</li>
                        <li><strong>Género:</strong> ${student.gender || 'No especificado'}</li>
                        <li><strong>Prefiere ser llamado:</strong> ${student.preferredName || 'No especificado'}</li>
                    </ul>
                </div>
                
                <div style="flex: 1; min-width: 250px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">Perfil de Aprendizaje</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
                        <li><strong>Canal:</strong> ${student.learningChannel || 'No especificado'}</li>
                        <li><strong>Intereses:</strong> ${interestsStr || 'No especificados'}</li>
                        <li><strong>Aspiraciones:</strong> ${careersStr || 'No especificadas'}</li>
                    </ul>
                </div>
            </div>

            ${bapStr ? `
            <div style="margin-bottom: 30px; background: #fff1f2; padding: 15px; border-radius: 8px; border: 1px solid #fecdd3;">
                <h3 style="margin: 0 0 10px 0; color: #9f1239; font-size: 16px;">Barreras para el Aprendizaje y la Participación (BAP)</h3>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #881337; white-space: pre-wrap;">${bapStr}</p>
            </div>
            ` : ''}

            <div style="margin-bottom: 30px;">
                <h3 style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px;">Resumen Sociométrico</h3>
                ${sociogramHTML}
            </div>

            <div>
                <h3 style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px;">Observaciones Recientes</h3>
                ${obsHTML}
            </div>
        </div>
    `;

    // Use html2pdf with HTML string directly to avoid blank rendering issues from hidden DOM elements
    const opt = {
        margin:       10, // 10mm around
        filename:     `Ficha_${student.fullName.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(htmlContent).save();
}
