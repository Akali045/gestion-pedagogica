// Teams Module
let currentTeams = [];

function renderTeamsSection(group) {
    const container = document.getElementById('groupInfoContainer').parentNode;
    
    // Check if section already exists to avoid duplicates
    let section = document.querySelector('.teams-section');
    if (!section) {
        section = document.createElement('div');
        section.className = 'teams-section group-info';
        // Insert after groupInfoContainer and pdaHistorySection
        const insertAfterElement = document.querySelector('.pda-history-section') || document.getElementById('groupInfoContainer');
        insertAfterElement.parentNode.insertBefore(section, insertAfterElement.nextSibling);
    }

    const html = `
        <div class="teams-header" onclick="toggleTeamsSection()" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <h3 style="margin: 0;">🧩 Formación de Equipos</h3>
            <span id="teamsToggleIcon" style="font-size: 1.2rem;">▼</span>
        </div>
        <div class="teams-content" id="teamsContent" style="display: none; margin-top: 1.5rem;">
            <div class="teams-controls">
                <div class="form-group" style="margin-bottom: 0;">
                    <label>Tamaño de equipo</label>
                    <input type="number" id="teamSizeInput" min="2" max="10" value="3" style="width: 100px;">
                </div>
                <div class="form-group" style="margin-bottom: 0; flex-grow: 1;">
                    <label>Criterio de formación</label>
                    <select id="teamCriteriaSelect">
                        <option value="random">Aleatorio</option>
                        <option value="academic_emitted">Afinidad académica (emisiones)</option>
                        <option value="social_emitted">Afinidad social (emisiones)</option>
                        <option value="complementary_emitted">Complementariedad (emisiones)</option>
                        <option value="received">Liderazgo distribuido (elecciones recibidas)</option>
                        <option value="channel_diversity">Diversidad de canales de aprendizaje</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="initiateTeamGeneration()">Generar Equipos</button>
            </div>
            
            <div id="teamsRemainderContainer"></div>
            <div id="teamsResultContainer"></div>
            
            <div class="teams-actions" id="teamsActionsContainer" style="display: none; margin-top: 1rem; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="enableManualAdjustment()">Ajustar manualmente</button>
                <button class="btn btn-success" onclick="promptSaveTeamSet()">Guardar estos equipos</button>
                <button class="btn btn-secondary" onclick="exportTeamsImage()">Exportar como imagen</button>
            </div>
            
            <div id="savedTeamsContainer" class="saved-team-sets"></div>
        </div>
    `;
    
    section.innerHTML = html;

    // Check if the function exists before calling, in case of load order issues
    if (typeof renderSavedTeamSets === 'function') {
        renderSavedTeamSets(group);
    }
}

function toggleTeamsSection() {
    const content = document.getElementById('teamsContent');
    const icon = document.getElementById('teamsToggleIcon');
    if (content.style.display === 'block') {
        content.style.display = 'none';
        icon.textContent = '▼';
    } else {
        content.style.display = 'block';
        icon.textContent = '▲';
    }
}

function initiateTeamGeneration() {
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group || !group.students || group.students.length === 0) {
        alert("El grupo no tiene alumnos para formar equipos.");
        return;
    }
    
    const teamSize = parseInt(document.getElementById('teamSizeInput').value, 10);
    const criteria = document.getElementById('teamCriteriaSelect').value;
    
    if (isNaN(teamSize) || teamSize < 2) {
        alert("Por favor, introduce un tamaño de equipo válido (mínimo 2).");
        return;
    }
    
    const students = [...group.students];
    const n = students.length;
    
    // Clear previous results
    document.getElementById('teamsResultContainer').innerHTML = '';
    document.getElementById('teamsActionsContainer').style.display = 'none';
    
    const remainder = n % teamSize;
    
    if (remainder !== 0) {
        showRemainderOptions(students, teamSize, criteria);
    } else {
        // No remainder, exact division
        const distribution = Array(n / teamSize).fill(teamSize);
        executeTeamGeneration(students, distribution, criteria);
    }
}

function showRemainderOptions(students, teamSize, criteria) {
    const container = document.getElementById('teamsRemainderContainer');
    const n = students.length;
    
    // Calculate possible distributions
    // For n students and base teamSize k, we can have teams of size k, k+1, k-1 etc.
    // Generally, standard combinations are:
    // Option A: x teams of size k, y teams of size k+1 (distributing remainder among existing)
    // Option B: x teams of size k, 1 team of size remainder (if remainder >= 2, or maybe just 1 smaller team)
    
    const options = [];
    
    // 1. Math approach for (k) and (k+1) sized teams only
    // Let a = number of teams of size k, b = number of teams of size k+1
    // a*k + b*(k+1) = n
    // We know remainder r = n % k. So n = m*k + r.
    // To use only k and k+1, we turn r teams of size k into size k+1.
    // So b = r, and a = m - r.  This is only valid if m >= r.
    const m = Math.floor(n / teamSize);
    const r = n % teamSize;
    
    if (m >= r) {
        options.push({
            label: `Distribuir sobrantes: ${m - r} equipos de ${teamSize} y ${r} equipos de ${teamSize + 1}`,
            distribution: [...Array(m - r).fill(teamSize), ...Array(r).fill(teamSize + 1)]
        });
    }
    
    // 2. Math approach for teams of size k and one smaller team
    // Only valid if the smaller team has >= 2 members to be considered a "team". If it's 1, it's a bit awkward but possible to ask. Let's allow it so user can decide.
    options.push({
        label: `Equipo más pequeño: ${m} equipos de ${teamSize} y 1 equipo de ${r}`,
        distribution: [...Array(m).fill(teamSize), r]
    });
    
    // 3. Math approach: If remainder is large enough, maybe team size k and one team size (k + remainder) ? Handled by option A mostly.
    // Let's also find combinations of (k) and (k-1)
    // a*k + b*(k-1) = n -> we need b*(k-1) = n - a*k.  Try different values of a.
    for (let a = m; a >= 0; a--) {
        const remaining = n - (a * teamSize);
        if (remaining > 0 && remaining % (teamSize - 1) === 0) {
            const b = remaining / (teamSize - 1);
            // Don't add if it's identical to an existing option
            if (teamSize - 1 > 0 && !(a === m && b === 0)) {
               const dist = [...Array(a).fill(teamSize), ...Array(b).fill(teamSize - 1)];
               // check if this distribution is already covered
               const exists = options.some(opt => JSON.stringify(opt.distribution.sort()) === JSON.stringify([...dist].sort()));
               if (!exists) {
                   options.push({
                       label: `Equipos más pequeños combinados: ${a} equipos de ${teamSize} y ${b} equipos de ${teamSize - 1}`,
                       distribution: dist
                   });
               }
            }
        }
    }
    
    let html = `
        <div class="remainder-options">
            <strong>⚠️ La cantidad de alumnos (${n}) no es divisible exactamente entre ${teamSize}.</strong>
            <p style="margin-top: 0.5rem; margin-bottom: 0.5rem;">Elige cómo distribuir el grupo:</p>
            <div class="remainder-btn-group">
    `;
    
    options.forEach((opt, index) => {
        html += `<button class="btn btn-secondary" onclick="selectRemainderOption(${index})">${opt.label}</button>`;
    });
    
    html += `
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Store options globally temporarily for the click handler
    window.__tempDistributionOptions = options;
    window.__tempStudents = students;
    window.__tempCriteria = criteria;
}

function selectRemainderOption(index) {
    const opt = window.__tempDistributionOptions[index];
    const students = window.__tempStudents;
    const criteria = window.__tempCriteria;
    
    document.getElementById('teamsRemainderContainer').innerHTML = ''; // Clear options
    
    executeTeamGeneration(students, opt.distribution, criteria);
    
    // Cleanup global state
    delete window.__tempDistributionOptions;
    delete window.__tempStudents;
    delete window.__tempCriteria;
}

function executeTeamGeneration(students, distributionSizes, criteria) {
    // distributionSizes is an array like [3, 3, 3, 4] indicating the desired size of each team.
    let generatedTeams = [];
    const numTeams = distributionSizes.length;
    
    // Initialize empty teams
    for (let i = 0; i < numTeams; i++) {
        generatedTeams.push({
            id: 'team_' + Date.now() + '_' + i,
            name: `Equipo ${i + 1}`,
            targetSize: distributionSizes[i],
            members: []
        });
    }

    let studentsPool = [...students];

    // Build conflicts map and supports map from observations using cumulative score
    const conflictsMap = new Map();
    const supportsMap = new Map();
    students.forEach(s => {
        conflictsMap.set(s.id, new Set());
        supportsMap.set(s.id, new Set());
    });

    const groupForOpt = appData.groups.find(g => g.id === currentGroupId);
    if (groupForOpt) {
        for (let i = 0; i < studentsPool.length; i++) {
            for (let j = i + 1; j < studentsPool.length; j++) {
                const id1 = studentsPool[i].id;
                const id2 = studentsPool[j].id;
                const score = getPairRelationshipScore(groupForOpt, id1, id2, studentsPool);
                if (score < 0) {
                    conflictsMap.get(id1).add(id2);
                    conflictsMap.get(id2).add(id1);
                } else if (score > 0) {
                    supportsMap.get(id1).add(id2);
                    supportsMap.get(id2).add(id1);
                }
            }
        }
    }

    // Helper to separate students without sociogram data for affinity criteria
    let missingDataStudents = [];
    if (criteria.includes('emitted')) {
        const type = criteria.replace('_emitted', '');
        studentsPool = students.filter(s => {
            if (!s.sociogram || !s.sociogram[type] || s.sociogram[type].length === 0) {
                missingDataStudents.push(s);
                return false;
            }
            return true;
        });
    }

    if (criteria === 'random') {
        // Fisher-Yates
        for (let i = studentsPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [studentsPool[i], studentsPool[j]] = [studentsPool[j], studentsPool[i]];
        }
        
        let sIdx = 0;
        for (let t = 0; t < numTeams; t++) {
            while (generatedTeams[t].members.length < generatedTeams[t].targetSize && sIdx < studentsPool.length) {
                generatedTeams[t].members.push(studentsPool[sIdx].id);
                sIdx++;
            }
        }
        
    } else if (criteria.includes('emitted')) {
        const type = criteria.replace('_emitted', ''); // academic, social, complementary
        
        // 1. Calculate weights
        let edges = [];
        for (let i = 0; i < studentsPool.length; i++) {
            for (let j = i + 1; j < studentsPool.length; j++) {
                const s1 = studentsPool[i];
                const s2 = studentsPool[j];
                let weight = 0;
                
                if (s1.sociogram && s1.sociogram[type] && s1.sociogram[type].includes(s2.id)) weight++;
                if (s2.sociogram && s2.sociogram[type] && s2.sociogram[type].includes(s1.id)) weight++;
                
                // Boost or penalize weight based on cumulative relationship score
                const score = getPairRelationshipScore(groupForOpt, s1.id, s2.id, studentsPool);
                weight += score;
                
                if (weight !== 0) {
                    edges.push({ s1: s1.id, s2: s2.id, weight });
                }
            }
        }
        
        // Sort by weight desc
        edges.sort((a, b) => b.weight - a.weight);
        
        let assigned = new Set();
        
        // Try to place highest affinity pairs first
        for (const edge of edges) {
            if (assigned.has(edge.s1) && assigned.has(edge.s2)) continue;
            
            if (!assigned.has(edge.s1) && !assigned.has(edge.s2)) {
                // Find empty team or team with space >= 2
                const team = generatedTeams.find(t => t.members.length <= t.targetSize - 2);
                if (team) {
                    team.members.push(edge.s1, edge.s2);
                    assigned.add(edge.s1);
                    assigned.add(edge.s2);
                }
            } else if (assigned.has(edge.s1) && !assigned.has(edge.s2)) {
                // S1 assigned, S2 not. Find S1's team
                const team = generatedTeams.find(t => t.members.includes(edge.s1));
                if (team && team.members.length < team.targetSize) {
                    team.members.push(edge.s2);
                    assigned.add(edge.s2);
                }
            } else if (!assigned.has(edge.s1) && assigned.has(edge.s2)) {
                // S2 assigned, S1 not.
                const team = generatedTeams.find(t => t.members.includes(edge.s2));
                if (team && team.members.length < team.targetSize) {
                    team.members.push(edge.s1);
                    assigned.add(edge.s1);
                }
            }
        }
        
        // Assign remaining students Pool
        let unassigned = studentsPool.filter(s => !assigned.has(s.id));
        unassigned.sort(() => Math.random() - 0.5); // Randomize remaining
        for (const team of generatedTeams) {
            while (team.members.length < team.targetSize && unassigned.length > 0) {
                team.members.push(unassigned.pop().id);
            }
        }
        
        // Distribute missingDataStudents randomly at the end
        missingDataStudents.sort(() => Math.random() - 0.5);
        for (const team of generatedTeams) {
            while (team.members.length < team.targetSize && missingDataStudents.length > 0) {
                 team.members.push(missingDataStudents.pop().id);
            }
        }

    } else if (criteria === 'received') {
        // Snake draft by in-degree
        // Calculate in-degree for all students (total received across all types roughly, or maybe we just sum them?)
        // Let's sum received across all 3 types to define "popularity / leadership"
        let inDegrees = {};
        studentsPool.forEach(s => inDegrees[s.id] = 0);
        
        studentsPool.forEach(s => {
            if (s.sociogram) {
                ['academic', 'social', 'complementary'].forEach(type => {
                    if (s.sociogram[type]) {
                        s.sociogram[type].forEach(targetId => {
                            if (inDegrees[targetId] !== undefined) inDegrees[targetId]++;
                        });
                    }
                });
            }
        });
        
        studentsPool.sort((a, b) => inDegrees[b.id] - inDegrees[a.id]);
        
        // Snake draft
        let teamIdx = 0;
        let direction = 1;
        
        for (const s of studentsPool) {
            // Find next available team in direction
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < numTeams * 2) {
                if (generatedTeams[teamIdx].members.length < generatedTeams[teamIdx].targetSize) {
                    generatedTeams[teamIdx].members.push(s.id);
                    placed = true;
                }
                teamIdx += direction;
                attempts++;
                
                if (teamIdx >= numTeams) {
                    teamIdx = numTeams - 1;
                    direction = -1;
                } else if (teamIdx < 0) {
                    teamIdx = 0;
                    direction = 1;
                }
            }
        }

    } else if (criteria === 'channel_diversity') {
        const channels = { 'Visual': [], 'Auditivo': [], 'Kinestésico': [], 'No especificado': [], '': [] };
        studentsPool.forEach(s => {
            const c = s.learningChannel || '';
            channels[c].push(s);
        });
        
        // Shuffle each channel list to not be alphabetical
        Object.keys(channels).forEach(k => channels[k].sort(() => Math.random() - 0.5));
        
        const types = ['Visual', 'Auditivo', 'Kinestésico', 'No especificado', ''];
        let tIdx = 0;
        
        let allAssigned = false;
        while (!allAssigned) {
            allAssigned = true;
            for (const type of types) {
                if (channels[type].length > 0) {
                    allAssigned = false;
                    const s = channels[type].pop();
                    
                    // Assign to next team with space
                    let placed = false;
                    for(let i=0; i<numTeams; i++) {
                        let potentialIdx = (tIdx + i) % numTeams;
                        if (generatedTeams[potentialIdx].members.length < generatedTeams[potentialIdx].targetSize) {
                            generatedTeams[potentialIdx].members.push(s.id);
                            tIdx = (potentialIdx + 1) % numTeams;
                            placed = true;
                            break;
                        }
                    }
                    if(!placed) {
                        // All teams full? shouldn't happen due to distribution math, but fallback push
                        const minTeam = [...generatedTeams].sort((a,b) => a.members.length - b.members.length)[0];
                        minTeam.members.push(s.id);
                    }
                }
            }
        }
    }

    // --- Conflict Resolution Optimization Pass ---
    if (groupForOpt) {

        let optimizerAttempts = 0;
        const maxOptimizerAttempts = 100;
        let hasConflicts = true;
        
        while (hasConflicts && optimizerAttempts < maxOptimizerAttempts) {
            hasConflicts = false;
            optimizerAttempts++;
            
            for (let i = 0; i < generatedTeams.length; i++) {
                const teamA = generatedTeams[i];
                let conflictS1 = null;
                let conflictS2 = null;
                
                for (let m1 = 0; m1 < teamA.members.length; m1++) {
                    for (let m2 = m1 + 1; m2 < teamA.members.length; m2++) {
                        const id1 = teamA.members[m1];
                        const id2 = teamA.members[m2];
                        if (conflictsMap.get(id1) && conflictsMap.get(id1).has(id2)) {
                            conflictS1 = id1;
                            conflictS2 = id2;
                            hasConflicts = true;
                            break;
                        }
                    }
                    if (conflictS1) break;
                }
                
                if (conflictS1 && conflictS2) {
                    let swapped = false;
                    
                    for (let j = 0; j < generatedTeams.length; j++) {
                        if (i === j) continue;
                        const teamB = generatedTeams[j];
                        
                        for (let mB = 0; mB < teamB.members.length; mB++) {
                            const candidateId = teamB.members[mB];
                            
                            const testTeamA = teamA.members.filter(id => id !== conflictS1);
                            const hasConflictInA = testTeamA.some(id => conflictsMap.get(candidateId) && conflictsMap.get(candidateId).has(id));
                            
                            const testTeamB = teamB.members.filter(id => id !== candidateId);
                            const hasConflictInB = testTeamB.some(id => conflictsMap.get(conflictS1) && conflictsMap.get(conflictS1).has(id));
                            
                            if (!hasConflictInA && !hasConflictInB) {
                                teamA.members = teamA.members.map(id => id === conflictS1 ? candidateId : id);
                                teamB.members = teamB.members.map(id => id === candidateId ? conflictS1 : id);
                                swapped = true;
                                break;
                            }
                        }
                        if (swapped) break;
                    }
                    
                    if (!swapped) {
                        for (let j = 0; j < generatedTeams.length; j++) {
                            if (i === j) continue;
                            const teamB = generatedTeams[j];
                            
                            for (let mB = 0; mB < teamB.members.length; mB++) {
                                const candidateId = teamB.members[mB];
                                
                                const testTeamA = teamA.members.filter(id => id !== conflictS2);
                                const hasConflictInA = testTeamA.some(id => conflictsMap.get(candidateId) && conflictsMap.get(candidateId).has(id));
                                
                                const testTeamB = teamB.members.filter(id => id !== candidateId);
                                const hasConflictInB = testTeamB.some(id => conflictsMap.get(conflictS2) && conflictsMap.get(conflictS2).has(id));
                                
                                if (!hasConflictInA && !hasConflictInB) {
                                    teamA.members = teamA.members.map(id => id === conflictS2 ? candidateId : id);
                                    teamB.members = teamB.members.map(id => id === candidateId ? conflictS2 : id);
                                    swapped = true;
                                    break;
                                }
                            }
                            if (swapped) break;
                        }
                    }
                    
                    if (swapped) {
                        break;
                    }
                }
            }
        }
    }

    currentTeams = generatedTeams;
    renderGeneratedTeams();
    document.getElementById('teamsActionsContainer').style.display = 'flex';
}

// Ensure the render map functions are defined next

function renderGeneratedTeams() {
    const container = document.getElementById('teamsResultContainer');
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group) return;

    // Build conflicts map using cumulative score
    const conflictsMap = new Map();
    const students = group.students || [];
    students.forEach(s => conflictsMap.set(s.id, new Set()));
    
    for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
            const id1 = students[i].id;
            const id2 = students[j].id;
            const score = getPairRelationshipScore(group, id1, id2, students);
            if (score < 0) {
                conflictsMap.get(id1).add(id2);
                conflictsMap.get(id2).add(id1);
            }
        }
    }

    let html = '<div class="teams-grid">';
    currentTeams.forEach(team => {
        // Find if there are any conflicts within this team
        let hasConflict = false;
        const teamConflictIds = new Set();
        for (let i = 0; i < team.members.length; i++) {
            for (let j = i + 1; j < team.members.length; j++) {
                const id1 = team.members[i];
                const id2 = team.members[j];
                if (conflictsMap.get(id1) && conflictsMap.get(id1).has(id2)) {
                    hasConflict = true;
                    teamConflictIds.add(id1);
                    teamConflictIds.add(id2);
                }
            }
        }

        const borderStyle = hasConflict ? 'border: 2px solid var(--danger); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);' : '';
        html += '<div class="team-card" data-team-id="' + team.id + '" style="' + borderStyle + '">';
        
        let headerText = '<h4>' + team.name + ' (' + team.members.length + ')';
        if (hasConflict) {
            headerText += ' <span style="color: var(--danger); font-size: 0.72rem; font-weight: bold; margin-left: 0.5rem; background: rgba(239, 68, 68, 0.1); padding: 2px 6px; border-radius: 4px;" title="Alumnos con tensión registrada en la bitácora coinciden en este equipo">⚠️ Tensión</span>';
        }
        headerText += '</h4>';
        html += headerText;
        
        html += '<div class="team-members-list">';
        team.members.forEach(studentId => {
            const student = group.students.find(s => s.id === studentId);
            if (student) {
                const color = student.color || '#f8fafc';
                const name = student.fullName || student.name || student.preferredName || 'Sin Nombre';
                const channelClass = student.learningChannel ? 'channel-badge' : '';
                const channelText = student.learningChannel || '';
                
                const itemStyle = teamConflictIds.has(studentId) ? 'border-left: 3px solid var(--danger); background: rgba(239, 68, 68, 0.03);' : '';
                
                html += '<div class="team-member-item" data-student-id="' + student.id + '" style="' + itemStyle + '">';
                html += '<div class="member-color-dot" style="background-color: ' + color + '"></div>';
                html += '<span style="' + (teamConflictIds.has(studentId) ? 'font-weight: 600;' : '') + '">' + name + '</span>';
                if (channelText) html += '<span class="' + channelClass + '">' + channelText + '</span>';
                if (teamConflictIds.has(studentId)) {
                    html += ' <span style="color: var(--danger); font-size: 0.8rem; margin-left: auto;" title="Este alumno tiene un conflicto registrado con otro integrante de este equipo">⚠️</span>';
                }
                html += '</div>';
            }
        });
        html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function enableManualAdjustment(showNotification = true) {
    const items = document.querySelectorAll('.team-member-item');
    const cards = document.querySelectorAll('.team-card');
    items.forEach(item => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });
    cards.forEach(card => {
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', handleDrop);
    });
    if (showNotification) {
        alert('Ajuste manual activado. Arrastra a los alumnos entre los equipos.');
    }
}

function handleDragStart(e) {
    this.classList.add('dragging');
    e.dataTransfer.setData('text/plain', this.dataset.studentId);
}

function handleDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.team-card').forEach(card => card.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const studentId = e.dataTransfer.getData('text/plain');
    const newTeamId = this.dataset.teamId;
    let oldTeamId = null;
    let moved = false;
    
    currentTeams.forEach(team => {
        const idx = team.members.indexOf(studentId);
        if (idx > -1) {
            oldTeamId = team.id;
            if (oldTeamId !== newTeamId) {
                team.members.splice(idx, 1);
                moved = true;
            }
        }
    });
    
    if (moved) {
        const newTeam = currentTeams.find(t => t.id === newTeamId);
        if (newTeam) {
            newTeam.members.push(studentId);
        }
        renderGeneratedTeams();
        enableManualAdjustment(false); // Rebind listeners without alert
    }
}

function promptSaveTeamSet() {
    if (!currentTeams || currentTeams.length === 0) return;
    const teamSize = document.getElementById('teamSizeInput').value;
    const criteria = document.getElementById('teamCriteriaSelect').options[document.getElementById('teamCriteriaSelect').selectedIndex].text;
    const dateStr = new Date().toLocaleDateString('es-ES');
    const suggestedName = `Equipos ${teamSize} - ${dateStr}`;
    const name = prompt('Nombre para este conjunto de equipos:', suggestedName);
    
    if (name) {
        saveTeamSet(name, criteria, teamSize);
    }
}

function saveTeamSet(name, criteria, teamSize) {
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group) return;
    if (!group.teamSets) group.teamSets = [];
    
    const newSet = {
        id: Date.now().toString(),
        name: name,
        date: new Date().toLocaleDateString('es-ES'),
        criteria: criteria,
        teamSize: teamSize,
        teams: JSON.parse(JSON.stringify(currentTeams))
    };
    
    group.teamSets.push(newSet);
    saveData();
    renderSavedTeamSets(group);
    alert('Conjunto de equipos guardado correctamente.');
}

function renderSavedTeamSets(group) {
    if (!group) group = appData.groups.find(g => g.id === currentGroupId);
    if (!group) return;
    
    const container = document.getElementById('savedTeamsContainer');
    if (!container) return;
    
    if (!group.teamSets || group.teamSets.length === 0) {
        container.innerHTML = '<p>No hay conjuntos de equipos guardados.</p>';
        return;
    }
    
    let html = '<h4>Equipos Guardados</h4>';
    group.teamSets.slice().reverse().forEach(set => {
        html += `
            <div class="saved-team-card">
                <div>
                    <strong>${set.name}</strong> <span style="color: var(--text-secondary); font-size: 0.85rem;">- ${set.date}</span><br>
                    <span style="font-size: 0.85rem;">Criterio: ${set.criteria} | Tamaño sugerido: ${set.teamSize} | ${set.teams.length} equipos</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-small btn-secondary" onclick="exportSavedTeamSetImage('${set.id}')">Exportar</button>
                    <button class="btn btn-small btn-primary" onclick="loadSavedTeamSet('${set.id}')">Ver en Editor</button>
                    <button class="btn btn-small btn-danger" onclick="deleteTeamSet('${set.id}')">Eliminar</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function loadSavedTeamSet(setId) {
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group || !group.teamSets) return;
    const set = group.teamSets.find(s => s.id === setId);
    if (set) {
        currentTeams = JSON.parse(JSON.stringify(set.teams));
        renderGeneratedTeams();
        document.getElementById('teamsActionsContainer').style.display = 'flex';
        document.getElementById('teamsRemainderContainer').innerHTML = '';
        window.scrollTo({ top: document.getElementById('teamsResultContainer').offsetTop, behavior: 'smooth' });
    }
}

function deleteTeamSet(setId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este conjunto de equipos guardado?')) return;
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group || !group.teamSets) return;
    
    group.teamSets = group.teamSets.filter(s => s.id !== setId);
    saveData();
    renderSavedTeamSets(group);
}

function exportTeamsImage() {
    generateSVGAndDownload(currentTeams);
}

function exportSavedTeamSetImage(setId) {
    const group = appData.groups.find(g => g.id === currentGroupId);
    if (!group || !group.teamSets) return;
    const set = group.teamSets.find(s => s.id === setId);
    if (set) {
        generateSVGAndDownload(set.teams, set.name);
    }
}

function generateSVGAndDownload(teamsToExport, overrideName = null) {
    if (!teamsToExport || teamsToExport.length === 0) return;
    const group = appData.groups.find(g => g.id === currentGroupId);
    const titleName = overrideName || group.name;
    
    const svgNS = 'http://www.w3.org/2000/svg';
    const isDark = document.documentElement.dataset.theme === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#334155';
    const titleColor = isDark ? '#f8fafc' : '#0f172a';
    const strokeColor = isDark ? '#334155' : '#e2e8f0';
    const cardBgColor = isDark ? '#0f172a' : '#f8fafc';
    const bgColor = isDark ? '#1e293b' : '#ffffff';

    const styleTag = '<style>' +
        '.team-card { font-family: sans-serif; fill: ' + textColor + '; }' +
        '.team-title { font-size: 16px; font-weight: bold; fill: ' + titleColor + '; }' +
        '.team-line { stroke: ' + strokeColor + '; stroke-width: 1; }' +
        '.member-name { font-size: 14px; font-family: sans-serif; fill: ' + textColor + '; }' +
        '.channel-badge { font-size: 10px; font-family: sans-serif; fill: #64748b; }' +
        '</style>';
    
    const cardWidth = 250;
    const padding = 20;
    const maxColumns = 3;
    const cols = Math.min(teamsToExport.length, maxColumns);
    const rows = Math.ceil(teamsToExport.length / cols);
    
    const teamHeights = teamsToExport.map(t => 50 + (t.members.length * 30));
    let maxRowHeights = Array(rows).fill(0);
    for(let i=0; i<teamsToExport.length; i++) {
        const r = Math.floor(i / cols);
        if (teamHeights[i] > maxRowHeights[r]) maxRowHeights[r] = teamHeights[i];
    }
    
    const svgWidth = (cols * cardWidth) + ((cols + 1) * padding);
    const svgHeight = maxRowHeights.reduce((a,b) => a+b, 0) + ((rows + 1) * padding) + 60;
    
    let svgContent = '<rect width="100%" height="100%" fill="' + bgColor + '" />';
    svgContent += '<text x="' + (svgWidth/2) + '" y="40" font-family="sans-serif" font-size="22" font-weight="bold" fill="' + titleColor + '" text-anchor="middle">Equipos - ' + titleName + '</text>';
    
    let currentY = 70;
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            const idx = (r * cols) + c;
            if (idx >= teamsToExport.length) break;
            const team = teamsToExport[idx];
            const x = padding + (c * (cardWidth + padding));
            const y = currentY;
            const height = maxRowHeights[r];
            
            svgContent += '<rect x="' + x + '" y="' + y + '" width="' + cardWidth + '" height="' + height + '" rx="8" fill="' + cardBgColor + '" stroke="' + strokeColor + '" stroke-width="1" />';
            svgContent += '<text x="' + (x+15) + '" y="' + (y+25) + '" class="team-title">' + team.name + ' (' + team.members.length + ')</text>';
            svgContent += '<line x1="' + x + '" y1="' + (y+35) + '" x2="' + (x+cardWidth) + '" y2="' + (y+35) + '" class="team-line" />';
            
            let myY = y + 55;
            team.members.forEach(studentId => {
                const student = group.students.find(s => s.id === studentId);
                if (student) {
                    const color = student.color || '#f8fafc';
                    const name = student.fullName || student.name || student.preferredName || 'Sin Nombre';
                    svgContent += '<circle cx="' + (x+20) + '" cy="' + (myY-5) + '" r="6" fill="' + color + '" />';
                    svgContent += '<text x="' + (x+35) + '" y="' + myY + '" class="member-name">' + name + '</text>';
                    if (student.learningChannel) {
                        svgContent += '<text x="' + (x+cardWidth-15) + '" y="' + myY + '" class="channel-badge" text-anchor="end">' + student.learningChannel + '</text>';
                    }
                    myY += 30;
                }
            });
        }
        currentY += maxRowHeights[r] + padding;
    }
    
    const svgString = '<svg xmlns="' + svgNS + '" width="' + svgWidth + '" height="' + svgHeight + '">' + styleTag + svgContent + '</svg>';
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = svgWidth;
        canvas.height = svgHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.download = `Equipos_${titleName.replace(/\\s+/g, '_')}.png`;
        a.href = pngUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    img.src = url;
}
