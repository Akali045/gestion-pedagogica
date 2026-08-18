function renderStudentsTable(students) {
    const container = document.getElementById('studentsTableContainer');

    if (students.length === 0) {
        const hasFilters = (currentStudentSearchQuery && currentStudentSearchQuery.trim().length > 0) || (typeof activeInterestFilters !== 'undefined' && activeInterestFilters.length > 0);
        container.innerHTML = `
            <div class="empty-state" style="padding: 2.5rem 1rem;">
                <h3>${hasFilters ? 'No se encontraron alumnos' : 'No hay alumnos registrados'}</h3>
                <p>${hasFilters ? 'No hay coincidencias con los filtros o el nombre buscado.' : 'Agrega alumnos a este grupo para comenzar'}</p>
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
                <div class="student-row" onclick="showStudentDetail('${escapeHTML(student.id)}')">
                    <div>${escapeHTML(student.listNumber)}</div>
                    <div>
                        <span class="student-color-dot" style="background-color: ${escapeHTML(student.color || '#64748b')};"></span>
                        ${escapeHTML(student.fullName)}
                    </div>
                    <div>${escapeHTML(student.learningChannel)}</div>
                    <div>${escapeHTML(student.age || '-')}</div>
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
                <p>${escapeHTML(student.fullName)}</p>
            </div>
            <div class="info-item">
                <label>Prefiere que le llamen</label>
                <p>${escapeHTML(student.preferredName || 'No especificado')}</p>
            </div>
            <div class="info-item">
                <label>Número de Lista</label>
                <p>${escapeHTML(student.listNumber)}</p>
            </div>
            <div class="info-item">
                <label>Género</label>
                <p>${escapeHTML(student.gender || 'No especificado')}</p>
            </div>
            <div class="info-item">
                <label>Edad</label>
                <p>${escapeHTML(student.age || 'No especificada')}</p>
            </div>
            <div class="info-item">
                <label>Canal de Aprendizaje</label>
                <p>${escapeHTML(student.learningChannel)}</p>
            </div>
        </div>

        <div class="notes-section">
            <h4>Intereses Particulares</h4>
            <div class="tag-input-container">
                ${student.interests && student.interests.length > 0
            ? student.interests.map(interest => `<div class="tag-badge">${escapeHTML(interest)}</div>`).join('')
            : '<p>No especificados</p>'
        }
            </div>
        </div>

        <div class="notes-section">
            <h4>Aspiraciones Profesionales</h4>
            <div class="tag-input-container">
                ${(Array.isArray(student.futureCareer) ? student.futureCareer : (student.futureCareer ? [student.futureCareer] : []))
            .length > 0
            ? (Array.isArray(student.futureCareer) ? student.futureCareer : [student.futureCareer]).map(career => `<div class="tag-badge">${escapeHTML(career)}</div>`).join('')
            : '<p>No especificadas</p>'
        }
            </div>
        </div>

        ${(() => {
            if (!student.bap) return '';
            if (typeof student.bap === 'string') {
                return `<div class="notes-section">
                    <h4>Barreras para el Aprendizaje y la Participación (BAP)</h4>
                    <p>${escapeHTML(student.bap)}</p>
                </div>`;
            }
            const cats = student.bap.categories || [];
            const desc = student.bap.description || '';
            if (cats.length === 0 && !desc) return '';
            return `<div class="notes-section">
                <h4>Barreras para el Aprendizaje y la Participación (BAP)</h4>
                ${cats.length > 0 ? `<div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                    ${cats.map(c => `<span class="filter-badge active">${escapeHTML(c)}</span>`).join('')}
                </div>` : ''}
                ${desc ? `<p>${escapeHTML(desc)}</p>` : ''}
            </div>`;
        })()}

        ${student.notes ? `
            <div class="notes-section">
                <h4>Notas Adicionales</h4>
                <p>${escapeHTML(student.notes)}</p>
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
            document.getElementById('studentColor').value = student.color || '#64748b';
            currentStudentInterests = Array.isArray(student.interests) ? [...student.interests] : [];
            // Manejar compatibilidad con datos antiguos (string) o nuevos (array)
            currentStudentFutureCareers = Array.isArray(student.futureCareer) ? [...student.futureCareer] : (student.futureCareer ? [student.futureCareer] : []);
        }
    } else {
        title.textContent = 'Agregar Alumno';
        document.getElementById('studentForm').reset();
        document.getElementById('studentColor').value = generateRandomStudentColor();
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
            id: generateUniqueId(),
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
    if (typeof html2pdf === 'undefined') {
        alert('La librería para exportar a PDF no está disponible.');
        return;
    }

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
                <h4 style="margin: 0 0 5px 0; color: #333; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 3px;">${escapeHTML(dim.title)}</h4>
                <div style="font-size: 13px; color: #555;">
                    <p style="margin: 3px 0;"><strong>A quién elige:</strong> ${outgoingNames.length > 0 ? outgoingNames.map(n => escapeHTML(n)).join(', ') : 'Ninguno'}</p>
                    <p style="margin: 3px 0;"><strong>Quién lo elige:</strong> ${incomingNames.length > 0 ? incomingNames.map(n => escapeHTML(n)).join(', ') : 'Ninguno'}</p>
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
                    <strong>${escapeHTML(o.date)}</strong>: ${escapeHTML(o.text)}
                </li>
            `).join('') + `</ul>`;
    }

    const htmlContent = `
        <div style="padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; color: black; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0c4a6e; padding-bottom: 20px;">
                <h1 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 24px;">Ficha del Alumno</h1>
                <h2 style="color: #334155; margin: 0; font-size: 18px;">${escapeHTML(student.fullName)}</h2>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Grupo: ${escapeHTML(group.name)} - Grado: ${escapeHTML(group.grade)}°</p>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px;">
                <div style="flex: 1; min-width: 250px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">Datos Generales</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
                        <li><strong>N° de Lista:</strong> ${escapeHTML(student.listNumber)}</li>
                        <li><strong>Edad:</strong> ${escapeHTML(student.age || 'No especificada')}</li>
                        <li><strong>Género:</strong> ${escapeHTML(student.gender || 'No especificado')}</li>
                        <li><strong>Prefiere ser llamado:</strong> ${escapeHTML(student.preferredName || 'No especificado')}</li>
                    </ul>
                </div>
                
                <div style="flex: 1; min-width: 250px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">Perfil de Aprendizaje</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
                        <li><strong>Canal:</strong> ${escapeHTML(student.learningChannel || 'No especificado')}</li>
                        <li><strong>Intereses:</strong> ${escapeHTML(interestsStr || 'No especificados')}</li>
                        <li><strong>Aspiraciones:</strong> ${escapeHTML(careersStr || 'No especificadas')}</li>
                    </ul>
                </div>
            </div>

            ${bapStr ? `
            <div style="margin-bottom: 30px; background: #fff1f2; padding: 15px; border-radius: 8px; border: 1px solid #fecdd3;">
                <h3 style="margin: 0 0 10px 0; color: #9f1239; font-size: 16px;">Barreras para el Aprendizaje y la Participación (BAP)</h3>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #881337; white-space: pre-wrap;">${escapeHTML(bapStr)}</p>
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

// ===== Mass Import & Export Modules =====
let parsedImportStudentsList = [];

function openImportStudentsModal() {
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group) {
        alert('Por favor selecciona un grupo primero.');
        return;
    }
    parsedImportStudentsList = [];
    document.getElementById('importPasteTextarea').value = '';
    document.getElementById('importCsvFileInput').value = '';
    document.getElementById('importPreviewContainer').style.display = 'none';
    document.getElementById('importPreviewTbody').innerHTML = '';
    document.getElementById('confirmImportBtn').disabled = true;
    switchImportTab('paste');
    
    document.getElementById('importStudentsModal').classList.add('active');
}

function closeImportStudentsModal() {
    document.getElementById('importStudentsModal').classList.remove('active');
    parsedImportStudentsList = [];
}

function switchImportTab(tab) {
    const pasteBtn = document.getElementById('importTabPaste');
    const fileBtn = document.getElementById('importTabFile');
    const pasteSection = document.getElementById('importPasteSection');
    const fileSection = document.getElementById('importFileSection');

    if (tab === 'paste') {
        pasteBtn.classList.add('active');
        fileBtn.classList.remove('active');
        pasteSection.style.display = 'block';
        fileSection.style.display = 'none';
    } else {
        pasteBtn.classList.remove('active');
        fileBtn.classList.add('active');
        pasteSection.style.display = 'none';
        fileSection.style.display = 'block';
    }
}

function isHeaderRow(firstCol, secondCol) {
    const norm1 = normalizeText(firstCol || '');
    const norm2 = normalizeText(secondCol || '');
    const headerKeywords = ['no', 'num', 'numero', 'n.', 'n°', 'lista', 'nombre', 'alumno', 'estudiante', 'apellidos', 'fullname', 'name'];
    return headerKeywords.some(kw => norm1 === kw || norm1.startsWith('num') || norm2 === kw || norm2.includes('nombre'));
}

function parseStudentsText(text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    const results = [];
    let autoListNumber = 1;

    // Detect existing highest list number if appending
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (group && Array.isArray(group.students) && group.students.length > 0) {
        const highest = Math.max(...group.students.map(s => parseInt(s.listNumber, 10) || 0));
        if (highest > 0) autoListNumber = highest + 1;
    }

    lines.forEach((line, index) => {
        // Check for table/spreadsheet columns (tab, semicolon, comma, pipe)
        let delimiter = null;
        if (line.includes('\t')) delimiter = '\t';
        else if (line.includes(';')) delimiter = ';';
        else if (line.includes(',')) delimiter = ',';
        else if (line.includes('|')) delimiter = '|';

        let listNum = null;
        let fullName = '';

        if (delimiter) {
            const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
            if (parts.length >= 2) {
                // Check if it is a header row
                if (index === 0 && isHeaderRow(parts[0], parts[1])) {
                    return; // Skip header
                }

                // Check which part is the number
                const p0Num = parseInt(parts[0], 10);
                const p1Num = parseInt(parts[1], 10);

                if (!isNaN(p0Num) && p0Num > 0 && isNaN(p1Num)) {
                    listNum = p0Num;
                    fullName = parts[1];
                } else if (!isNaN(p1Num) && p1Num > 0 && isNaN(p0Num)) {
                    listNum = p1Num;
                    fullName = parts[0];
                } else {
                    fullName = parts[0] + ' ' + parts[1];
                }
            } else if (parts.length === 1) {
                fullName = parts[0];
            }
        } else {
            // Check regex patterns like: "1. Juan Perez", "1 - Juan Perez", "1) Juan Perez", "1 Juan Perez"
            const numPattern = /^([0-9]{1,3})[\.\-\)\s\t]+(.+)$/;
            const match = line.match(numPattern);

            if (match) {
                const pNum = parseInt(match[1], 10);
                const pName = match[2].trim();
                // Avoid considering something like "1er grado" as a student
                if (pName.length >= 2) {
                    listNum = pNum;
                    fullName = pName;
                } else {
                    fullName = line;
                }
            } else {
                // Check if index 0 is a header line without delimiter
                if (index === 0 && (line.toLowerCase() === 'nombre' || line.toLowerCase() === 'alumnos' || line.toLowerCase() === 'lista')) {
                    return; // Skip header
                }
                fullName = line;
            }
        }

        // Clean quotes or extra spaces
        fullName = fullName.replace(/^["']|["']$/g, '').trim();

        if (fullName.length > 0) {
            if (listNum === null || isNaN(listNum) || listNum <= 0) {
                listNum = autoListNumber++;
            } else {
                autoListNumber = listNum + 1;
            }

            results.push({
                listNumber: listNum,
                fullName: fullName
            });
        }
    });

    return results;
}

function renderImportPreview(studentsList) {
    parsedImportStudentsList = studentsList;
    const container = document.getElementById('importPreviewContainer');
    const tbody = document.getElementById('importPreviewTbody');
    const badge = document.getElementById('importCountBadge');
    const confirmBtn = document.getElementById('confirmImportBtn');

    if (!studentsList || studentsList.length === 0) {
        container.style.display = 'none';
        confirmBtn.disabled = true;
        return;
    }

    badge.textContent = studentsList.length;
    tbody.innerHTML = studentsList.map((st, idx) => `
        <tr>
            <td style="font-weight: 600;">
                <input type="number" class="import-preview-num" data-idx="${idx}" value="${escapeHTML(st.listNumber)}" min="1" style="width: 50px; padding: 2px 4px; font-size: 0.85rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
            </td>
            <td>
                <input type="text" class="import-preview-name" data-idx="${idx}" value="${escapeHTML(st.fullName)}" style="width: 100%; padding: 2px 6px; font-size: 0.85rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-small btn-danger" onclick="removeImportPreviewRow(${idx})" style="padding: 2px 6px; font-size: 0.75rem;" title="Eliminar fila">🗑️</button>
            </td>
        </tr>
    `).join('');

    // Attach change listeners to inline edits
    tbody.querySelectorAll('.import-preview-num').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.idx, 10);
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val > 0 && parsedImportStudentsList[idx]) {
                parsedImportStudentsList[idx].listNumber = val;
            }
        });
    });

    tbody.querySelectorAll('.import-preview-name').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.idx, 10);
            const val = e.target.value.trim();
            if (val.length > 0 && parsedImportStudentsList[idx]) {
                parsedImportStudentsList[idx].fullName = val;
            }
        });
    });

    container.style.display = 'block';
    confirmBtn.disabled = false;
}

function removeImportPreviewRow(index) {
    if (index >= 0 && index < parsedImportStudentsList.length) {
        parsedImportStudentsList.splice(index, 1);
        renderImportPreview(parsedImportStudentsList);
    }
}

function executeStudentsImport() {
    if (!parsedImportStudentsList || parsedImportStudentsList.length === 0) {
        alert('No hay alumnos válidos para importar.');
        return;
    }

    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group) {
        alert('Error: no se encontró el grupo activo.');
        return;
    }

    const modeInput = document.querySelector('input[name="importMode"]:checked');
    const mode = modeInput ? modeInput.value : 'append';

    if (mode === 'replace' && Array.isArray(group.students) && group.students.length > 0) {
        if (!confirm(`¿Estás seguro de reemplazar los ${group.students.length} alumnos actuales? Se conservarán en la papelera de reciclaje.`)) {
            return;
        }
        // Move existing students to trash for safety
        if (!appData.deletedItems) appData.deletedItems = [];
        group.students.forEach(st => {
            appData.deletedItems.push({
                ...st,
                deletedType: 'student',
                groupId: group.id,
                deletedAt: new Date().toISOString()
            });
        });
        group.students = [];
    }

    if (!Array.isArray(group.students)) group.students = [];

    let addedCount = 0;
    parsedImportStudentsList.forEach((item) => {
        const cleanName = (item.fullName || '').trim();
        if (!cleanName) return;

        const num = parseInt(item.listNumber, 10) || (group.students.length + 1);
        const color = generateRandomStudentColor();

        const newStudent = {
            id: generateUniqueId(),
            fullName: cleanName,
            listNumber: num,
            preferredName: '',
            gender: '',
            age: '',
            learningChannel: '',
            interests: [],
            futureCareer: [],
            bap: { categories: [], description: '' },
            notes: '',
            color: color,
            observations: [],
            sociogram: { academic: [], social: [], complementary: [] }
        };

        group.students.push(newStudent);
        addedCount++;
    });

    // Sort students by listNumber
    group.students.sort((a, b) => (parseInt(a.listNumber, 10) || 0) - (parseInt(b.listNumber, 10) || 0));

    saveData();
    closeImportStudentsModal();
    showGroupDetail(currentGroupId);
    alert(`¡Éxito! Se han importado ${addedCount} alumnos al grupo "${group.name}".`);
}

// ===== CSV Export Methods =====
function openExportStudentsModal() {
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group) {
        alert('Por favor selecciona un grupo primero.');
        return;
    }
    if (!group.students || group.students.length === 0) {
        alert('El grupo no tiene alumnos registrados para exportar.');
        return;
    }
    document.getElementById('exportStudentsModal').classList.add('active');
}

function closeExportStudentsModal() {
    document.getElementById('exportStudentsModal').classList.remove('active');
}

function executeExportStudentsCSV() {
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group || !group.students || group.students.length === 0) {
        alert('No hay alumnos para exportar.');
        return;
    }

    const option = document.querySelector('input[name="exportModeOption"]:checked');
    const mode = option ? option.value : 'basic';

    const sortedStudents = [...group.students].sort((a, b) => (parseInt(a.listNumber, 10) || 0) - (parseInt(b.listNumber, 10) || 0));

    let csvContent = '';
    
    // Escape helper for CSV fields
    const escapeCsvField = (val) => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    if (mode === 'basic') {
        // Clean list for school registry: N° de Lista, Nombre Completo
        const headers = ['Número de Lista', 'Nombre Completo'];
        csvContent += headers.map(escapeCsvField).join(',') + '\r\n';

        sortedStudents.forEach(st => {
            const row = [
                st.listNumber,
                st.fullName
            ];
            csvContent += row.map(escapeCsvField).join(',') + '\r\n';
        });
    } else {
        // Full diagnostic sheet
        const headers = ['Número de Lista', 'Nombre Completo', 'Nombre Preferido', 'Género', 'Edad', 'Canal de Aprendizaje', 'Intereses', 'Aspiraciones', 'BAP Categorías', 'BAP Descripción', 'Notas'];
        csvContent += headers.map(escapeCsvField).join(',') + '\r\n';

        sortedStudents.forEach(st => {
            const interests = Array.isArray(st.interests) ? st.interests.join(', ') : '';
            const careers = Array.isArray(st.futureCareer) ? st.futureCareer.join(', ') : (st.futureCareer || '');
            let bapCats = '';
            let bapDesc = '';
            if (typeof st.bap === 'string') {
                bapDesc = st.bap;
            } else if (st.bap && typeof st.bap === 'object') {
                bapCats = (st.bap.categories || []).join(', ');
                bapDesc = st.bap.description || '';
            }

            const row = [
                st.listNumber,
                st.fullName,
                st.preferredName || '',
                st.gender || '',
                st.age || '',
                st.learningChannel || '',
                interests,
                careers,
                bapCats,
                bapDesc,
                st.notes || ''
            ];
            csvContent += row.map(escapeCsvField).join(',') + '\r\n';
        });
    }

    // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows recognizes accents and special characters without encoding glitches
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeGroupName = (group.name || 'Grupo').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `Lista_Alumnos_${safeGroupName}_${mode === 'basic' ? 'Oficial' : 'Integral'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    closeExportStudentsModal();
}

