// Attendance Management Module (Asistencia de Alumnos)

let currentAttendanceDate = new Date().toISOString().split('T')[0];
let currentAttendanceTab = 'daily'; // 'daily', 'stats', 'history'
let attendanceSearchFilter = '';
let isAttendanceSectionOpen = false;

/**
 * Main render function for group attendance section
 */
function renderAttendanceSection(group) {
    if (!group) group = getCurrentGroup();
    const container = document.getElementById('attendanceSectionContainer');
    if (!container || !group) return;

    // Check if section was already open in the DOM
    const existingContent = document.getElementById('attendanceContent');
    if (existingContent) {
        isAttendanceSectionOpen = (existingContent.style.display !== 'none');
    }

    // Ensure attendance array exists
    if (!group.attendance) {
        group.attendance = [];
    }

    const totalSessions = group.attendance.length;

    const html = `
        <div class="attendance-section group-info" style="margin-top: 2rem;">
            <div class="attendance-header" onclick="toggleAttendanceSection()" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <h3 style="margin: 0;">📋 Control y Registro de Asistencia</h3>
                    <span class="badge" id="attendanceSessionCountBadge" style="background: var(--bg-tertiary); border: 1px solid var(--border); font-size: 0.8rem; padding: 0.2rem 0.6rem; border-radius: 12px; color: var(--text-secondary);">
                        ${totalSessions} ${totalSessions === 1 ? 'sesión' : 'sesiones'}
                    </span>
                </div>
                <span id="attendanceToggleIcon" style="font-size: 1.2rem;">${isAttendanceSectionOpen ? '▲' : '▼'}</span>
            </div>

            <div class="attendance-content" id="attendanceContent" style="${isAttendanceSectionOpen ? 'display: block;' : 'display: none;'} margin-top: 1.5rem;">
                <!-- Attendance Sub-navigation Tabs -->
                <div class="attendance-nav-tabs" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="btn btn-small ${currentAttendanceTab === 'daily' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAttendanceTab('daily')">
                            📅 Pase de Lista Diario
                        </button>
                        <button type="button" class="btn btn-small ${currentAttendanceTab === 'stats' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAttendanceTab('stats')">
                            📊 Estadísticas y Alertas
                        </button>
                        <button type="button" class="btn btn-small ${currentAttendanceTab === 'history' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAttendanceTab('history')">
                            📜 Histórico / Matriz
                        </button>
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="btn btn-small btn-secondary" onclick="exportAttendanceToCSV()" title="Exportar historial de asistencia a Excel o archivo CSV">
                            📥 Exportar Asistencia (CSV/Excel)
                        </button>
                    </div>
                </div>

                <!-- Tab 1: Daily Attendance -->
                <div id="attendanceTabDaily" style="${currentAttendanceTab === 'daily' ? 'display: block;' : 'display: none;'}">
                    ${renderDailyAttendanceView(group)}
                </div>

                <!-- Tab 2: Statistics & Alerts -->
                <div id="attendanceTabStats" style="${currentAttendanceTab === 'stats' ? 'display: block;' : 'display: none;'}">
                    ${renderAttendanceStatsView(group)}
                </div>

                <!-- Tab 3: History Matrix -->
                <div id="attendanceTabHistory" style="${currentAttendanceTab === 'history' ? 'display: block;' : 'display: none;'}">
                    ${renderAttendanceHistoryView(group)}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Toggle section visibility
 */
function toggleAttendanceSection() {
    const content = document.getElementById('attendanceContent');
    const icon = document.getElementById('attendanceToggleIcon');
    if (!content) return;

    if (content.style.display === 'block') {
        content.style.display = 'none';
        isAttendanceSectionOpen = false;
        if (icon) icon.textContent = '▼';
    } else {
        content.style.display = 'block';
        isAttendanceSectionOpen = true;
        if (icon) icon.textContent = '▲';
    }
}

/**
 * Switch tabs between Daily, Stats, and History
 */
function switchAttendanceTab(tabName) {
    currentAttendanceTab = tabName;
    isAttendanceSectionOpen = true;
    const group = getCurrentGroup();
    if (group) {
        renderAttendanceSection(group);
    }
}

/**
 * Get or create attendance session for a specific date
 */
function getAttendanceForDate(group, dateStr) {
    if (!group) return null;
    if (!group.attendance) group.attendance = [];
    return group.attendance.find(a => a.date === dateStr);
}

/**
 * Render Daily Attendance Taking View
 */
function renderDailyAttendanceView(group) {
    const students = group.students || [];
    const session = getAttendanceForDate(group, currentAttendanceDate);
    const records = session ? (session.records || {}) : {};
    const notes = session ? (session.notes || '') : '';
    const studentNotes = session ? (session.studentNotes || {}) : {};

    const isRecorded = session && Object.keys(records).length > 0;

    // Filter students if search query is active
    let displayStudents = [...students];
    if (attendanceSearchFilter.trim()) {
        const q = attendanceSearchFilter.trim().toLowerCase();
        displayStudents = displayStudents.filter(st => {
            const num = String(st.listNumber || '');
            const full = (st.fullName || st.name || '').toLowerCase();
            const pref = (st.preferredName || '').toLowerCase();
            return full.includes(q) || pref.includes(q) || num === q;
        });
    }

    return `
        <div class="attendance-daily-wrapper">
            <!-- Top Controls Toolbar -->
            <div class="attendance-toolbar" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <!-- Date Selector & Navigation -->
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-small btn-secondary" onclick="stepAttendanceDate(-1)" title="Día anterior">◀</button>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <label for="attendanceDatePicker" style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">Fecha:</label>
                            <input type="date" id="attendanceDatePicker" value="${currentAttendanceDate}" onchange="changeAttendanceDate(this.value)" style="padding: 0.35rem 0.65rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-family: inherit; font-size: 0.95rem; font-weight: 500;">
                        </div>
                        <button type="button" class="btn btn-small btn-secondary" onclick="stepAttendanceDate(1)" title="Día siguiente">▶</button>
                        <button type="button" class="btn btn-small btn-secondary" onclick="setAttendanceToday()" title="Ir a hoy">Hoy</button>
                    </div>

                    <!-- Quick Batch Actions -->
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-small btn-success" onclick="markAllAttendance('P')" title="Marcar a todos los alumnos como presentes en esta fecha">
                            ✓ Todos Presentes
                        </button>
                        <button type="button" class="btn btn-small btn-danger" onclick="markAllAttendance('A')" title="Marcar a todos como ausentes">
                            ✗ Todos Ausentes
                        </button>
                        ${isRecorded ? `
                            <button type="button" class="btn btn-small btn-secondary" onclick="clearAttendanceForDate()" title="Limpiar y eliminar el registro de esta fecha">
                                🗑️ Limpiar Día
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Daily Summary Metrics Bar (ID used for in-place updates) -->
                <div class="attendance-daily-stats" id="dailyAttendanceStatsCounters" style="display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border); flex-wrap: wrap; gap: 0.75rem;">
                    ${renderDailyCountersHTML(group, session)}
                </div>
            </div>

            <!-- Search and Filter Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1; max-width: 320px; position: relative;">
                    <input type="text" id="attendanceSearchInput" value="${escapeHTML(attendanceSearchFilter)}" oninput="handleAttendanceSearch(this.value)" placeholder="Filtrar por nombre o N°..." style="width: 100%; padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.88rem;">
                </div>
                <div style="font-size: 0.85rem; color: var(--text-tertiary);">
                    Mostrando ${displayStudents.length} de ${students.length} alumnos
                </div>
            </div>

            <!-- Attendance Table -->
            ${students.length === 0 ? `
                <div class="empty-state" style="padding: 2rem; text-align: center; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border);">
                    <p style="color: var(--text-secondary); margin: 0;">No hay alumnos registrados en este grupo para tomar asistencia.</p>
                </div>
            ` : `
                <div class="table-responsive" style="border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; background: var(--bg-secondary);">
                    <table class="attendance-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="background: var(--bg-tertiary); border-bottom: 2px solid var(--border);">
                                <th style="padding: 0.75rem 0.5rem; width: 45px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">N°</th>
                                <th style="padding: 0.75rem 0.5rem; width: 40px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">Color</th>
                                <th style="padding: 0.75rem 1rem; color: var(--text-secondary); font-size: 0.85rem;">Alumno (Nombre Completo y Preferido)</th>
                                <th style="padding: 0.75rem 1rem; width: 220px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">Estado de Asistencia</th>
                                <th style="padding: 0.75rem 1rem; width: 200px; color: var(--text-secondary); font-size: 0.85rem;">Observación / Justificante</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayStudents.map((st, index) => {
                                const status = records[st.id] || '';
                                const stNote = studentNotes[st.id] || '';
                                const dotColor = (st.color && st.color !== '#f8fafc') ? st.color : '#94a3b8';
                                const preferredHighlight = st.preferredName && st.preferredName.trim()
                                    ? ` <span class="preferred-name-highlight">(${escapeHTML(st.preferredName.trim())})</span>`
                                    : '';

                                return `
                                    <tr class="attendance-row" data-student-id="${escapeHTML(st.id)}" style="border-bottom: 1px solid var(--border); transition: background 0.15s ease;">
                                        <td style="padding: 0.65rem 0.5rem; text-align: center; font-weight: 600; color: var(--text-secondary); font-size: 0.9rem;">
                                            ${escapeHTML(String(st.listNumber || index + 1))}
                                        </td>
                                        <td style="padding: 0.65rem 0.5rem; text-align: center;">
                                            <span class="student-color-dot" style="background-color: ${escapeHTML(dotColor)}; width: 14px; height: 14px; border-radius: 50%; display: inline-block; vertical-align: middle; border: 1px solid rgba(0,0,0,0.15);" title="Color identificador"></span>
                                        </td>
                                        <td style="padding: 0.65rem 1rem; font-size: 0.95rem; color: var(--text-primary);">
                                            <strong style="font-weight: 600;">${escapeHTML(st.fullName || st.name || 'Sin Nombre')}</strong>${preferredHighlight}
                                        </td>
                                        <td style="padding: 0.65rem 0.5rem; text-align: center;">
                                            <div class="attendance-status-group" style="display: inline-flex; gap: 4px; background: var(--bg-tertiary); padding: 3px; border-radius: 6px; border: 1px solid var(--border);">
                                                <button type="button" 
                                                    class="btn-att-pill btn-att-p ${status === 'P' ? 'active-p' : ''}" 
                                                    onclick="setStudentAttendanceStatus('${escapeHTML(st.id)}', 'P')"
                                                    title="Presente">
                                                    P
                                                </button>
                                                <button type="button" 
                                                    class="btn-att-pill btn-att-a ${status === 'A' ? 'active-a' : ''}" 
                                                    onclick="setStudentAttendanceStatus('${escapeHTML(st.id)}', 'A')"
                                                    title="Ausente (Falta)">
                                                    A
                                                </button>
                                                <button type="button" 
                                                    class="btn-att-pill btn-att-r ${status === 'R' ? 'active-r' : ''}" 
                                                    onclick="setStudentAttendanceStatus('${escapeHTML(st.id)}', 'R')"
                                                    title="Retardo">
                                                    R
                                                </button>
                                                <button type="button" 
                                                    class="btn-att-pill btn-att-j ${status === 'J' ? 'active-j' : ''}" 
                                                    onclick="setStudentAttendanceStatus('${escapeHTML(st.id)}', 'J')"
                                                    title="Falta Justificada">
                                                    J
                                                </button>
                                            </div>
                                        </td>
                                        <td style="padding: 0.65rem 1rem;">
                                            <input type="text" 
                                                class="attendance-note-input" 
                                                value="${escapeHTML(stNote)}" 
                                                placeholder="Nota opcional..." 
                                                onchange="updateStudentAttendanceNote('${escapeHTML(st.id)}', this.value)"
                                                style="width: 100%; padding: 0.25rem 0.5rem; font-size: 0.82rem; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary);">
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `}

            <!-- Daily Session Notes -->
            <div style="margin-top: 1rem; background: var(--bg-secondary); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border);">
                <label for="attendanceSessionNote" style="display: block; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.35rem; color: var(--text-secondary);">
                    📝 Nota General de la Sesión (${currentAttendanceDate}):
                </label>
                <input type="text" id="attendanceSessionNote" value="${escapeHTML(notes)}" placeholder="Ej: Suspensión de actividades a 3ra hora, práctica de laboratorio, evento cívico..." onchange="updateDailySessionNote(this.value)" style="width: 100%; padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem;">
            </div>
        </div>
    `;
}

/**
 * Generate HTML string for daily counters bar
 */
function renderDailyCountersHTML(group, session) {
    const students = group.students || [];
    const records = session ? (session.records || {}) : {};

    let presentCount = 0;
    let absentCount = 0;
    let tardyCount = 0;
    let justifiedCount = 0;
    let unrecordedCount = 0;

    students.forEach(st => {
        const status = records[st.id];
        if (status === 'P') presentCount++;
        else if (status === 'A') absentCount++;
        else if (status === 'R') tardyCount++;
        else if (status === 'J') justifiedCount++;
        else unrecordedCount++;
    });

    const totalStudents = students.length;
    const attendancePct = totalStudents > 0 ? Math.round(((presentCount + tardyCount) / totalStudents) * 100) : 0;

    return `
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; font-size: 0.85rem;">
            <span class="att-counter-pill pill-present" style="background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 600;">
                Presentes: ${presentCount}
            </span>
            <span class="att-counter-pill pill-absent" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 600;">
                Ausentes: ${absentCount}
            </span>
            <span class="att-counter-pill pill-tardy" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 600;">
                Retardos: ${tardyCount}
            </span>
            <span class="att-counter-pill pill-justified" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 600;">
                Justificados: ${justifiedCount}
            </span>
            ${unrecordedCount > 0 ? `
                <span class="att-counter-pill pill-pending" style="background: var(--bg-tertiary); color: var(--text-tertiary); border: 1px solid var(--border); padding: 0.2rem 0.6rem; border-radius: 6px;">
                    Sin registrar: ${unrecordedCount}
                </span>
            ` : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">
            <span>Asistencia del día:</span>
            <span style="font-size: 1.05rem; color: ${attendancePct >= 85 ? '#10b981' : (attendancePct >= 70 ? '#f59e0b' : '#ef4444')};">
                ${attendancePct}%
            </span>
        </div>
    `;
}

/**
 * In-place update of daily summary counters bar and header count badge
 */
function updateDailyCountersUI(group, session) {
    const container = document.getElementById('dailyAttendanceStatsCounters');
    if (container) {
        container.innerHTML = renderDailyCountersHTML(group, session);
    }

    const totalSessions = group.attendance ? group.attendance.length : 0;
    const badge = document.getElementById('attendanceSessionCountBadge');
    if (badge) {
        badge.textContent = `${totalSessions} ${totalSessions === 1 ? 'sesión' : 'sesiones'}`;
    }
}

/**
 * Handle date change
 */
function changeAttendanceDate(newDate) {
    if (!newDate) return;
    currentAttendanceDate = newDate;
    isAttendanceSectionOpen = true;
    const group = getCurrentGroup();
    if (group) renderAttendanceSection(group);
}

/**
 * Step date forward or backward
 */
function stepAttendanceDate(days) {
    const parts = currentAttendanceDate.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() + days);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    currentAttendanceDate = `${year}-${month}-${day}`;
    
    isAttendanceSectionOpen = true;
    const group = getCurrentGroup();
    if (group) renderAttendanceSection(group);
}

/**
 * Set date to today
 */
function setAttendanceToday() {
    currentAttendanceDate = new Date().toISOString().split('T')[0];
    isAttendanceSectionOpen = true;
    const group = getCurrentGroup();
    if (group) renderAttendanceSection(group);
}

/**
 * Search filter input handler
 */
function handleAttendanceSearch(val) {
    attendanceSearchFilter = val;
    const group = getCurrentGroup();
    if (group) {
        const dailyContainer = document.getElementById('attendanceTabDaily');
        if (dailyContainer) {
            dailyContainer.innerHTML = renderDailyAttendanceView(group);
            // Refocus input and place cursor at end
            const input = document.getElementById('attendanceSearchInput');
            if (input) {
                input.focus();
                input.selectionStart = input.selectionEnd = input.value.length;
            }
        }
    }
}

/**
 * Set a student's attendance status for current date with instant in-place DOM update
 */
function setStudentAttendanceStatus(studentId, newStatus) {
    const group = getCurrentGroup();
    if (!group) return;

    if (!group.attendance) group.attendance = [];

    let session = group.attendance.find(a => a.date === currentAttendanceDate);
    if (!session) {
        session = {
            id: typeof generateUniqueId === 'function' ? generateUniqueId() : ('att_' + Date.now()),
            date: currentAttendanceDate,
            records: {},
            studentNotes: {},
            notes: ''
        };
        group.attendance.push(session);
    }

    if (!session.records) session.records = {};

    session.records[studentId] = newStatus;

    saveData();

    // In-place UI update on that specific student's row (prevents full section re-render & keeps it open)
    const row = document.querySelector(`.attendance-row[data-student-id="${studentId}"]`);
    if (row) {
        row.querySelectorAll('.btn-att-pill').forEach(btn => {
            btn.classList.remove('active-p', 'active-a', 'active-r', 'active-j');
        });
        const activeBtn = row.querySelector(`.btn-att-${newStatus.toLowerCase()}`);
        if (activeBtn) {
            activeBtn.classList.add(`active-${newStatus.toLowerCase()}`);
        }
    }

    // In-place counters update
    updateDailyCountersUI(group, session);
}

/**
 * Mark all students with a given status for current date
 */
function markAllAttendance(status) {
    const group = getCurrentGroup();
    if (!group || !group.students || group.students.length === 0) return;

    if (!group.attendance) group.attendance = [];

    let session = group.attendance.find(a => a.date === currentAttendanceDate);
    if (!session) {
        session = {
            id: typeof generateUniqueId === 'function' ? generateUniqueId() : ('att_' + Date.now()),
            date: currentAttendanceDate,
            records: {},
            studentNotes: {},
            notes: ''
        };
        group.attendance.push(session);
    }

    if (!session.records) session.records = {};

    group.students.forEach(st => {
        session.records[st.id] = status;
    });

    saveData();
    isAttendanceSectionOpen = true;
    renderAttendanceSection(group);
}

/**
 * Clear current date attendance session
 */
function clearAttendanceForDate() {
    const group = getCurrentGroup();
    if (!group || !group.attendance) return;

    if (!confirm(`¿Estás seguro de que deseas eliminar el pase de lista del ${currentAttendanceDate}?`)) {
        return;
    }

    group.attendance = group.attendance.filter(a => a.date !== currentAttendanceDate);
    saveData();
    isAttendanceSectionOpen = true;
    renderAttendanceSection(group);
}

/**
 * Update individual student observation note
 */
function updateStudentAttendanceNote(studentId, noteText) {
    const group = getCurrentGroup();
    if (!group) return;

    if (!group.attendance) group.attendance = [];

    let session = group.attendance.find(a => a.date === currentAttendanceDate);
    if (!session) {
        session = {
            id: typeof generateUniqueId === 'function' ? generateUniqueId() : ('att_' + Date.now()),
            date: currentAttendanceDate,
            records: {},
            studentNotes: {},
            notes: ''
        };
        group.attendance.push(session);
    }

    if (!session.studentNotes) session.studentNotes = {};
    session.studentNotes[studentId] = noteText.trim();
    saveData();
}

/**
 * Update daily general session note
 */
function updateDailySessionNote(noteText) {
    const group = getCurrentGroup();
    if (!group) return;

    if (!group.attendance) group.attendance = [];

    let session = group.attendance.find(a => a.date === currentAttendanceDate);
    if (!session) {
        session = {
            id: typeof generateUniqueId === 'function' ? generateUniqueId() : ('att_' + Date.now()),
            date: currentAttendanceDate,
            records: {},
            studentNotes: {},
            notes: ''
        };
        group.attendance.push(session);
    }

    session.notes = noteText.trim();
    saveData();
}

/**
 * Render Attendance Statistics View
 */
function renderAttendanceStatsView(group) {
    const students = group.students || [];
    const sessions = (group.attendance || []).sort((a, b) => a.date.localeCompare(b.date));
    const totalSessions = sessions.length;

    if (totalSessions === 0) {
        return `
            <div class="empty-state" style="padding: 2.5rem; text-align: center; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border);">
                <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">📊</span>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">Aún no hay estadísticas de asistencia</h4>
                <p style="color: var(--text-secondary); margin: 0 0 1rem 0;">Realiza al menos un pase de lista diario para que el sistema empiece a generar métricas y análisis de ausentismo.</p>
                <button type="button" class="btn btn-primary btn-small" onclick="switchAttendanceTab('daily')">Ir al Pase de Lista</button>
            </div>
        `;
    }

    // Compute student stats
    let totalPresentsGlobal = 0;
    let totalTardiesGlobal = 0;
    let totalAbsentsGlobal = 0;
    let totalJustifiedGlobal = 0;

    const studentStats = students.map((st, index) => {
        let p = 0, a = 0, r = 0, j = 0, unrecorded = 0;

        sessions.forEach(sess => {
            const rec = (sess.records && sess.records[st.id]);
            if (rec === 'P') p++;
            else if (rec === 'A') a++;
            else if (rec === 'R') r++;
            else if (rec === 'J') j++;
            else unrecorded++;
        });

        totalPresentsGlobal += p;
        totalTardiesGlobal += r;
        totalAbsentsGlobal += a;
        totalJustifiedGlobal += j;

        // Effective attendance %: (P + R) / totalSessions
        const pct = totalSessions > 0 ? Math.round(((p + r) / totalSessions) * 100) : 0;
        const absencePct = totalSessions > 0 ? Math.round((a / totalSessions) * 100) : 0;

        return {
            student: st,
            listNumber: st.listNumber || (index + 1),
            p, a, r, j, unrecorded,
            pct,
            absencePct,
            isAtRisk: absencePct >= 20 || a >= 4
        };
    });

    const totalPossibleAttendances = totalSessions * students.length;
    const globalAttendancePct = totalPossibleAttendances > 0 
        ? Math.round(((totalPresentsGlobal + totalTardiesGlobal) / totalPossibleAttendances) * 100) 
        : 0;

    const atRiskStudents = studentStats.filter(s => s.isAtRisk);
    const perfectAttendanceStudents = studentStats.filter(s => s.pct === 100);

    return `
        <div class="attendance-stats-wrapper">
            <!-- Global Stats Cards Grid -->
            <div class="stats-overview-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="stat-card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; border-top: 4px solid var(--accent);">
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">Asistencia Global</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: ${globalAttendancePct >= 85 ? '#10b981' : (globalAttendancePct >= 70 ? '#f59e0b' : '#ef4444')};">
                        ${globalAttendancePct}%
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">Promedio general del grupo</div>
                </div>

                <div class="stat-card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; border-top: 4px solid #3b82f6;">
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">Sesiones Registradas</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: var(--text-primary);">${totalSessions}</div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">Días con pase de lista</div>
                </div>

                <div class="stat-card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; border-top: 4px solid #10b981;">
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">Asistencia Perfecta (100%)</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: #10b981;">${perfectAttendanceStudents.length}</div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">Alumnos sin faltas ni retardos</div>
                </div>

                <div class="stat-card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; border-top: 4px solid ${atRiskStudents.length > 0 ? '#ef4444' : '#10b981'};">
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">Alumnos en Alerta / Riesgo</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: ${atRiskStudents.length > 0 ? '#ef4444' : '#10b981'};">
                        ${atRiskStudents.length}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">≥ 20% ausencias o ≥ 4 faltas</div>
                </div>
            </div>

            <!-- Risk Alert Callout if any students at risk -->
            ${atRiskStudents.length > 0 ? `
                <div class="alert-box-warning" style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; border-radius: 6px; padding: 0.85rem 1rem; margin-bottom: 1.5rem; display: flex; align-items: flex-start; gap: 0.75rem;">
                    <span style="font-size: 1.25rem;">⚠️</span>
                    <div>
                        <strong style="color: #ef4444; font-size: 0.95rem;">Alumnos con Ausentismo Crítico Detectado:</strong>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.88rem; color: var(--text-secondary);">
                            Los siguientes alumnos superan el umbral de alerta: 
                            ${atRiskStudents.map(s => {
                                const st = s.student;
                                const pref = st.preferredName ? ` <span class="preferred-name-highlight">(${escapeHTML(st.preferredName)})</span>` : '';
                                return `<span style="font-weight: 600; color: var(--text-primary);">${escapeHTML(st.fullName || st.name)}${pref} (${s.a} faltas, ${s.pct}% asist.)</span>`;
                            }).join(', ')}.
                        </p>
                    </div>
                </div>
            ` : ''}

            <!-- Per-Student Statistics Table -->
            <div style="border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; background: var(--bg-secondary);">
                <table class="attendance-stats-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background: var(--bg-tertiary); border-bottom: 2px solid var(--border);">
                            <th style="padding: 0.75rem 0.5rem; width: 45px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">N°</th>
                            <th style="padding: 0.75rem 0.5rem; width: 40px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">Color</th>
                            <th style="padding: 0.75rem 1rem; color: var(--text-secondary); font-size: 0.85rem;">Alumno (Nombre Completo y Preferido)</th>
                            <th style="padding: 0.75rem 0.5rem; text-align: center; color: #10b981; font-size: 0.85rem;" title="Presente">P</th>
                            <th style="padding: 0.75rem 0.5rem; text-align: center; color: #f59e0b; font-size: 0.85rem;" title="Retardo">R</th>
                            <th style="padding: 0.75rem 0.5rem; text-align: center; color: #ef4444; font-size: 0.85rem;" title="Ausente (Falta)">A</th>
                            <th style="padding: 0.75rem 0.5rem; text-align: center; color: #3b82f6; font-size: 0.85rem;" title="Justificado">J</th>
                            <th style="padding: 0.75rem 1rem; width: 180px; color: var(--text-secondary); font-size: 0.85rem;">% Asistencia</th>
                            <th style="padding: 0.75rem 1rem; width: 110px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentStats.map(s => {
                            const st = s.student;
                            const dotColor = (st.color && st.color !== '#f8fafc') ? st.color : '#94a3b8';
                            const preferredHighlight = st.preferredName && st.preferredName.trim()
                                ? ` <span class="preferred-name-highlight">(${escapeHTML(st.preferredName.trim())})</span>`
                                : '';
                            
                            const barColor = s.pct >= 85 ? '#10b981' : (s.pct >= 70 ? '#f59e0b' : '#ef4444');
                            const statusBadge = s.isAtRisk 
                                ? `<span style="background: rgba(239, 68, 68, 0.12); color: #ef4444; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3);">⚠️ En Riesgo</span>`
                                : (s.pct >= 95 
                                    ? `<span style="background: rgba(16, 185, 129, 0.12); color: #10b981; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid rgba(16,185,129,0.3);">✓ Excelente</span>`
                                    : `<span style="background: var(--bg-tertiary); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--border);">Regular</span>`);

                            return `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 0.65rem 0.5rem; text-align: center; font-weight: 600; color: var(--text-secondary); font-size: 0.9rem;">
                                        ${escapeHTML(String(s.listNumber))}
                                    </td>
                                    <td style="padding: 0.65rem 0.5rem; text-align: center;">
                                        <span class="student-color-dot" style="background-color: ${escapeHTML(dotColor)}; width: 14px; height: 14px; border-radius: 50%; display: inline-block; vertical-align: middle; border: 1px solid rgba(0,0,0,0.15);"></span>
                                    </td>
                                    <td style="padding: 0.65rem 1rem; font-size: 0.95rem; color: var(--text-primary);">
                                        <strong style="font-weight: 600;">${escapeHTML(st.fullName || st.name || 'Sin Nombre')}</strong>${preferredHighlight}
                                    </td>
                                    <td style="padding: 0.65rem 0.5rem; text-align: center; font-weight: 600; color: #10b981;">${s.p}</td>
                                    <td style="padding: 0.65rem 0.5rem; text-align: center; font-weight: 600; color: #f59e0b;">${s.r}</td>
                                    <td style="padding: 0.65rem 0.5rem; text-align: center; font-weight: 600; color: #ef4444;">${s.a}</td>
                                    <td style="padding: 0.65rem 0.5rem; text-align: center; font-weight: 600; color: #3b82f6;">${s.j}</td>
                                    <td style="padding: 0.65rem 1rem;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <div style="flex: 1; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; border: 1px solid var(--border);">
                                                <div style="width: ${s.pct}%; height: 100%; background: ${barColor};"></div>
                                            </div>
                                            <span style="font-size: 0.85rem; font-weight: 700; color: ${barColor}; min-width: 38px; text-align: right;">${s.pct}%</span>
                                        </div>
                                    </td>
                                    <td style="padding: 0.65rem 1rem; text-align: center;">
                                        ${statusBadge}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Render Attendance History Matrix View
 */
function renderAttendanceHistoryView(group) {
    const students = group.students || [];
    const sessions = (group.attendance || []).sort((a, b) => b.date.localeCompare(a.date)); // Newest first

    if (sessions.length === 0) {
        return `
            <div class="empty-state" style="padding: 2.5rem; text-align: center; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border);">
                <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">📜</span>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">No hay historial de pases de lista</h4>
                <p style="color: var(--text-secondary); margin: 0 0 1rem 0;">A medida que registres la asistencia diaria, aparecerá aquí el concentrado y matriz completa.</p>
                <button type="button" class="btn btn-primary btn-small" onclick="switchAttendanceTab('daily')">Tomar Asistencia Hoy</button>
            </div>
        `;
    }

    return `
        <div class="attendance-history-wrapper">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                    Concentrado de las últimas <strong>${sessions.length}</strong> sesiones. Haz clic en una fecha para editarla directamente.
                </p>
            </div>

            <!-- Matrix Table -->
            <div style="border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; max-height: 550px; background: var(--bg-secondary);">
                <table class="attendance-matrix-table" style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left;">
                    <thead>
                        <tr style="background: var(--bg-tertiary); position: sticky; top: 0; z-index: 2;">
                            <th style="padding: 0.75rem 0.5rem; width: 45px; text-align: center; border-bottom: 2px solid var(--border); border-right: 1px solid var(--border); position: sticky; left: 0; background: var(--bg-tertiary); z-index: 3;">N°</th>
                            <th style="padding: 0.75rem 0.5rem; width: 35px; text-align: center; border-bottom: 2px solid var(--border); border-right: 1px solid var(--border); position: sticky; left: 45px; background: var(--bg-tertiary); z-index: 3;">Color</th>
                            <th style="padding: 0.75rem 1rem; min-width: 200px; border-bottom: 2px solid var(--border); border-right: 2px solid var(--border); position: sticky; left: 80px; background: var(--bg-tertiary); z-index: 3;">Alumno</th>
                            ${sessions.map(sess => `
                                <th style="padding: 0.6rem 0.5rem; min-width: 70px; text-align: center; border-bottom: 2px solid var(--border); border-right: 1px solid var(--border); cursor: pointer;" onclick="jumpToAttendanceDate('${escapeHTML(sess.date)}')" title="Editar sesión del ${escapeHTML(sess.date)}">
                                    <div style="font-size: 0.78rem; font-weight: 700; color: var(--accent);">${escapeHTML(sess.date.slice(5))}</div>
                                    <div style="font-size: 0.68rem; color: var(--text-tertiary);">${escapeHTML(sess.date.slice(0, 4))}</div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map((st, index) => {
                            const dotColor = (st.color && st.color !== '#f8fafc') ? st.color : '#94a3b8';
                            const preferredHighlight = st.preferredName && st.preferredName.trim()
                                ? ` <span class="preferred-name-highlight">(${escapeHTML(st.preferredName.trim())})</span>`
                                : '';

                            return `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 0.6rem 0.5rem; text-align: center; font-weight: 600; color: var(--text-secondary); font-size: 0.85rem; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); position: sticky; left: 0; background: var(--bg-secondary); z-index: 1;">
                                        ${escapeHTML(String(st.listNumber || index + 1))}
                                    </td>
                                    <td style="padding: 0.6rem 0.5rem; text-align: center; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); position: sticky; left: 45px; background: var(--bg-secondary); z-index: 1;">
                                        <span class="student-color-dot" style="background-color: ${escapeHTML(dotColor)}; width: 12px; height: 12px; border-radius: 50%; display: inline-block; vertical-align: middle; border: 1px solid rgba(0,0,0,0.15);"></span>
                                    </td>
                                    <td style="padding: 0.6rem 0.75rem; font-size: 0.9rem; color: var(--text-primary); white-space: nowrap; border-bottom: 1px solid var(--border); border-right: 2px solid var(--border); position: sticky; left: 80px; background: var(--bg-secondary); z-index: 1;">
                                        <strong style="font-weight: 600;">${escapeHTML(st.fullName || st.name || 'Sin Nombre')}</strong>${preferredHighlight}
                                    </td>
                                    ${sessions.map(sess => {
                                        const status = (sess.records && sess.records[st.id]) || '-';
                                        let badgeColor = 'var(--text-tertiary)';
                                        let badgeBg = 'transparent';
                                        let title = 'Sin registro';

                                        if (status === 'P') {
                                            badgeColor = '#10b981';
                                            badgeBg = 'rgba(16, 185, 129, 0.12)';
                                            title = 'Presente';
                                        } else if (status === 'A') {
                                            badgeColor = '#ef4444';
                                            badgeBg = 'rgba(239, 68, 68, 0.15)';
                                            title = 'Ausente (Falta)';
                                        } else if (status === 'R') {
                                            badgeColor = '#f59e0b';
                                            badgeBg = 'rgba(245, 158, 11, 0.15)';
                                            title = 'Retardo';
                                        } else if (status === 'J') {
                                            badgeColor = '#3b82f6';
                                            badgeBg = 'rgba(59, 130, 246, 0.15)';
                                            title = 'Justificado';
                                        }

                                        return `
                                            <td style="padding: 0.5rem; text-align: center; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); font-size: 0.85rem;" title="${title}">
                                                <span style="display: inline-block; min-width: 24px; padding: 2px 4px; border-radius: 4px; font-weight: 700; color: ${badgeColor}; background: ${badgeBg};">
                                                    ${status}
                                                </span>
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Jump directly to edit a specific date in Daily Attendance view
 */
function jumpToAttendanceDate(dateStr) {
    currentAttendanceDate = dateStr;
    isAttendanceSectionOpen = true;
    switchAttendanceTab('daily');
}

/**
 * Export Attendance Records to CSV / Excel with UTF-8 BOM
 */
function exportAttendanceToCSV() {
    const group = getCurrentGroup();
    if (!group) return;

    const students = group.students || [];
    if (students.length === 0) {
        alert("El grupo no tiene alumnos para exportar asistencia.");
        return;
    }

    const sessions = (group.attendance || []).slice().sort((a, b) => a.date.localeCompare(b.date)); // Oldest to newest
    const totalSessions = sessions.length;

    // Build CSV Headers
    const headers = ['N° Lista', 'Nombre Completo', 'Nombre Preferido'];
    sessions.forEach(sess => {
        headers.push(sess.date);
    });
    headers.push('Total Sesiones', 'Asistencias (P)', 'Retardos (R)', 'Ausencias (A)', 'Justificadas (J)', '% Asistencia');

    const csvRows = [];
    csvRows.push(headers.map(escapeCSVField).join(','));

    // Build rows for each student
    students.forEach((st, index) => {
        const row = [
            st.listNumber || (index + 1),
            st.fullName || st.name || '',
            st.preferredName || ''
        ];

        let pCount = 0, rCount = 0, aCount = 0, jCount = 0;

        sessions.forEach(sess => {
            const status = (sess.records && sess.records[st.id]) || '';
            row.push(status);
            if (status === 'P') pCount++;
            else if (status === 'R') rCount++;
            else if (status === 'A') aCount++;
            else if (status === 'J') jCount++;
        });

        const effectivePct = totalSessions > 0 ? Math.round(((pCount + rCount) / totalSessions) * 100) : 0;

        row.push(
            totalSessions,
            pCount,
            rCount,
            aCount,
            jCount,
            `${effectivePct}%`
        );

        csvRows.push(row.map(escapeCSVField).join(','));
    });

    // Append UTF-8 BOM so Excel opens accents and special characters without encoding corruption
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const cleanGroupName = (group.name || 'Grupo').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Asistencia_${cleanGroupName}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Escape CSV fields according to standard RFC 4180
 */
function escapeCSVField(field) {
    if (field === null || field === undefined) return '""';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return `"${stringField}"`;
}
