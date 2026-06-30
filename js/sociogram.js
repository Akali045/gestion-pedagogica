// ===== Sociogram Capture (Student Detail) =====
function renderSociogramCapture(student, group) {
    const existing = document.getElementById('sociogramCaptureSection');
    if (existing) existing.remove();
    const peers = (group.students || []).filter(s => s.id !== student.id);
    if (peers.length === 0) return;
    if (!student.sociogram) student.sociogram = { academic: [], social: [], complementary: [] };

    const section = document.createElement('div');
    section.id = 'sociogramCaptureSection';
    section.style.marginTop = '2rem';

    let html = `<div class="group-info">
        <div id="sociogramCaptureHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <h3 style="margin: 0;">🔗 Datos del Sociograma</h3>
            <span id="sociogramCaptureToggle">▼</span>
        </div>
        <div id="sociogramCaptureContent" style="display: none; margin-top: 1.5rem;">`;

    ['academic', 'social', 'complementary'].forEach(type => {
        const selected = student.sociogram[type] || [];
        html += `<div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 0.25rem; color: var(--text-primary);">
                <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${SOCIOGRAM_EDGE_COLORS[type]};margin-right:0.5rem;"></span>
                ${SOCIOGRAM_TITLES[type]}
            </h4>
            <p style="font-size: 0.85rem; color: var(--text-tertiary); margin-bottom: 0.75rem;">${SOCIOGRAM_LABELS[type]}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${peers.map(p => `<span class="filter-badge sociogram-peer-badge ${selected.includes(p.id) ? 'active' : ''}"
                    data-sociogram-type="${type}" data-peer-id="${p.id}" style="cursor: pointer;">
                    <span class="student-color-dot" style="background-color: ${p.color || '#9ca3af'};"></span>
                    ${p.preferredName || p.fullName}
                </span>`).join('')}
            </div>
        </div>`;
    });

    html += `<button class="btn btn-primary" id="saveSociogramBtn">Guardar datos del sociograma</button>
        </div></div>`;
    section.innerHTML = html;

    const obsSection = document.getElementById('observationSection');
    const anchor = obsSection || document.getElementById('studentInfoContainer');
    anchor.parentNode.insertBefore(section, anchor.nextSibling);

    document.getElementById('sociogramCaptureHeader').addEventListener('click', () => {
        const c = document.getElementById('sociogramCaptureContent');
        const i = document.getElementById('sociogramCaptureToggle');
        c.style.display = c.style.display === 'none' ? 'block' : 'none';
        i.textContent = c.style.display === 'none' ? '▼' : '▲';
    });
    section.querySelectorAll('.sociogram-peer-badge').forEach(badge => {
        badge.addEventListener('click', () => badge.classList.toggle('active'));
    });
    document.getElementById('saveSociogramBtn').addEventListener('click', () => saveSociogramData(student.id));
}

function saveSociogramData(studentId) {
    const group = appData.groups.find(g => g.id === currentGroupId);
    const student = group.students.find(s => s.id === studentId);
    if (!student.sociogram) student.sociogram = { academic: [], social: [], complementary: [] };
    ['academic', 'social', 'complementary'].forEach(type => {
        const badges = document.querySelectorAll(`.sociogram-peer-badge[data-sociogram-type="${type}"].active`);
        student.sociogram[type] = Array.from(badges).map(b => b.dataset.peerId);
    });
    saveData();
    alert('Datos del sociograma guardados correctamente.');
}

// ===== Sociogram Visualization (Group Detail) =====
function renderGroupSociogram(group) {
    const existing = document.getElementById('sociogramGroupSection');
    if (existing) existing.remove();
    const students = group.students || [];
    if (students.length === 0) return;
    const hasSociogramData = students.some(s => s.sociogram &&
        (s.sociogram.academic?.length > 0 || s.sociogram.social?.length > 0 || s.sociogram.complementary?.length > 0));
    if (!hasSociogramData) return;

    const uniqueInterests = [...new Set(students.flatMap(s => s.interests || []))].sort();

    const section = document.createElement('div');
    section.id = 'sociogramGroupSection';
    section.className = 'group-info';

    section.innerHTML = `
        <div id="sociogramGroupHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <h3 style="margin: 0;">🕸️ Sociograma del Grupo</h3>
            <span id="sociogramGroupToggle">▼</span>
        </div>
        <div id="sociogramGroupContent" style="display: none; margin-top: 1.5rem;">
            <div id="sociogramFullscreenWrapper" style="display: flex; flex-direction: column; background: var(--bg-primary); transition: padding 0.3s; position: relative;">
                <div id="sociogramFilters" style="display:flex;gap:1.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;width:100%;">
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.9rem;color:var(--text-secondary);">
                        <input type="checkbox" id="filterAcademic" checked>
                        <span style="width:20px;height:3px;background:${SOCIOGRAM_EDGE_COLORS.academic};display:inline-block;"></span> Académica
                    </label>
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.9rem;color:var(--text-secondary);">
                        <input type="checkbox" id="filterSocial" checked>
                        <span style="width:20px;height:3px;background:${SOCIOGRAM_EDGE_COLORS.social};display:inline-block;"></span> Social
                    </label>
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.9rem;color:var(--text-secondary);">
                        <input type="checkbox" id="filterComplementary" checked>
                        <span style="width:20px;height:3px;background:${SOCIOGRAM_EDGE_COLORS.complementary};display:inline-block;"></span> Complementaria
                    </label>
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.9rem;color:var(--text-secondary);">
                        <input type="checkbox" id="filterSupports" checked>
                        <span style="width:20px;height:3px;background:#10b981;display:inline-block;border-bottom: 2px dashed #10b981;"></span> Apoyos (Bitácora)
                    </label>
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.9rem;color:var(--text-secondary);">
                        <input type="checkbox" id="filterTensions" checked>
                        <span style="width:20px;height:3px;background:#ef4444;display:inline-block;border-bottom: 2px dashed #ef4444;"></span> Tensiones (Bitácora)
                    </label>
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.9rem;color:var(--text-secondary);margin-left:auto;">
                        <input type="checkbox" id="filterExclusion">
                        <span style="display:inline-block;padding:2px 6px;border-radius:4px;background:var(--danger);color:white;font-size:0.75rem;font-weight:bold;margin-right:2px;">⚠️ Exclusión</span> Alertas de riesgo
                    </label>
                </div>
                <div id="sociogramCrossAnalysis" style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;background:var(--bg-secondary);padding:0.75rem 1rem;border-radius:8px;border:1px solid var(--border);align-items:center;width:100%;">
                    <span style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">Análisis Cruzado:</span>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <label for="crossLearningChannel" style="font-size:0.8rem;color:var(--text-secondary);margin:0;">Canal:</label>
                        <select id="crossLearningChannel" style="padding:0.25rem 0.5rem;font-size:0.8rem;width:auto;height:auto;border-radius:4px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);margin:0;">
                            <option value="">Todos</option>
                            <option value="Visual">Visual</option>
                            <option value="Auditivo">Auditivo</option>
                            <option value="Kinestésico">Kinestésico</option>
                            <option value="No especificado">No especificado</option>
                        </select>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <label for="crossInterest" style="font-size:0.8rem;color:var(--text-secondary);margin:0;">Interés:</label>
                        <select id="crossInterest" style="padding:0.25rem 0.5rem;font-size:0.8rem;width:auto;height:auto;border-radius:4px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);margin:0;">
                            <option value="">Todos</option>
                            ${uniqueInterests.map(interest => `<option value="${interest}">${interest}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div id="sociogramLegend" style="margin-bottom: 1rem; display: flex; gap: 1rem; flex-wrap: wrap; background: var(--bg-secondary); padding: 0.5rem; border-radius: 8px;">
                    <span style="font-size: 0.8rem; color: var(--text-tertiary); margin-right: 0.5rem;">Bordes (Canal de Aprendizaje):</span>
                    ${Object.entries(CHANNEL_COLORS).filter(([k]) => k !== '').map(([channel, color]) =>
        `<span style="display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:var(--text-secondary);">
                            <span style="width:12px;height:12px;border-radius:50%;border:2px solid ${color};display:inline-block;"></span> ${channel}
                        </span>`
    ).join('')}
                </div>
                <div id="sociogramGraphContainer" style="background:var(--bg-tertiary);border-radius:12px;padding:1rem;position:relative;overflow:hidden;min-height:500px;flex-grow:1;"></div>
                <button id="exitFullscreenBtn" style="display: none; position: absolute; top: 1rem; right: 1rem; z-index: 1000; padding: 0.4rem 0.8rem; border-radius: 6px; border: none; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-size: 0.9rem;">✕ Cerrar pantalla completa</button>
            </div>
            <div id="centralityTableContainer" style="margin-top: 1.5rem;"></div>
            <div id="sociogramDiagnosticContainer" style="margin-top: 1.5rem;"></div>
            <div style="display:flex;gap:1rem;margin-top:1rem;">
                <button class="btn btn-secondary btn-small" id="sociogramFullscreenBtn">⛶ Pantalla completa</button>
                <button class="btn btn-secondary btn-small" id="exportSociogramBtn">📷 Exportar vista del sociograma</button>
            </div>
        </div>`;

    const pdaHistory = document.querySelector('.pda-history-section');
    const anchor = pdaHistory || document.getElementById('groupInfoContainer');
    anchor.parentNode.insertBefore(section, anchor.nextSibling);

    document.getElementById('sociogramGroupHeader').addEventListener('click', () => {
        const c = document.getElementById('sociogramGroupContent');
        const i = document.getElementById('sociogramGroupToggle');
        if (c.style.display === 'none') {
            c.style.display = 'block';
            i.textContent = '▲';
            renderSociogramGraph(group);
            renderCentralityTable(students);
            renderGroupDiagnostic(group);
        } else {
            c.style.display = 'none';
            i.textContent = '▼';
        }
    });

    document.getElementById('sociogramFullscreenBtn').addEventListener('click', toggleSociogramFullscreen);
    document.getElementById('exitFullscreenBtn').addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
    });

    document.getElementById('exportSociogramBtn').addEventListener('click', exportSociogramPNG);
}

function getNodeRadius(d) { return Math.max(10, 8 + (d.inDegree || 0) * 3); }

function renderSociogramGraph(group) {
    const students = group.students || [];
    let selectedNodeId = null;
    const container = document.getElementById('sociogramGraphContainer');
    if (!container || typeof d3 === 'undefined') return;
    container.innerHTML = '';

    // If we're in fullscreen, the dimension gets huge. Let's ask container explicitly
    const rect = container.getBoundingClientRect();
    const width = rect.width || 700;
    const height = rect.height || 500;

    const nodeMap = {};
    students.forEach(s => {
        nodeMap[s.id] = {
            id: s.id,
            name: s.preferredName || s.fullName,
            color: (s.color && s.color !== '#f8fafc') ? s.color : '#9ca3af',
            channelColor: CHANNEL_COLORS[s.learningChannel] || '#6b7280',
            inDegree: 0
        };
    });

    const links = [];
    const types = ['academic', 'social', 'complementary'];
    students.forEach(s => {
        if (!s.sociogram) return;
        types.forEach(type => {
            (s.sociogram[type] || []).forEach(tid => {
                if (nodeMap[tid]) {
                    links.push({ source: s.id, target: tid, type });
                    nodeMap[tid].inDegree++;
                }
            });
        });
    });

    const supportsMap = new Map();
    const tensionsMap = new Map();
    students.forEach(s => {
        supportsMap.set(s.id, new Set());
        tensionsMap.set(s.id, new Set());
    });

    for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
            const id1 = students[i].id;
            const id2 = students[j].id;
            const score = getPairRelationshipScore(group, id1, id2, students);
            if (score > 0) {
                supportsMap.get(id1).add(id2);
                supportsMap.get(id2).add(id1);
            } else if (score < 0) {
                tensionsMap.get(id1).add(id2);
                tensionsMap.get(id2).add(id1);
            }
        }
    }

    // Add support links to links array
    for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
            const id1 = students[i].id;
            const id2 = students[j].id;
            if (supportsMap.get(id1).has(id2)) {
                const exists = links.some(l => 
                    l.type === 'support' && (
                        ((l.source === id1 || l.source.id === id1) && (l.target === id2 || l.target.id === id2)) ||
                        ((l.source === id2 || l.source.id === id2) && (l.target === id1 || l.target.id === id1))
                    )
                );
                if (!exists) {
                    links.push({ source: id1, target: id2, type: 'support' });
                }
            }
        }
    }

    // Add tension links to links array
    for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
            const id1 = students[i].id;
            const id2 = students[j].id;
            if (tensionsMap.get(id1).has(id2)) {
                const exists = links.some(l => 
                    l.type === 'tension' && (
                        ((l.source === id1 || l.source.id === id1) && (l.target === id2 || l.target.id === id2)) ||
                        ((l.source === id2 || l.source.id === id2) && (l.target === id1 || l.target.id === id1))
                    )
                );
                if (!exists) {
                    links.push({ source: id1, target: id2, type: 'tension' });
                }
            }
        }
    }

    const nodes = Object.values(nodeMap);

    const svg = d3.select(container).append('svg')
        .attr('id', 'sociogramSVG')
        .attr('width', width).attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('xmlns', 'http://www.w3.org/2000/svg');

    // Mover todo el contenido a un grupo interno para poder aplicar zoom/pan
    const gMain = svg.append('g').attr('id', 'sociogramGMain');

    const defs = svg.append('defs');
    types.forEach(type => {
        defs.append('marker')
            .attr('id', `arrow-${type}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('refY', 0)
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', SOCIOGRAM_EDGE_COLORS[type]);
    });

    // Stronger charge for larger groups so they spread out more, scaled by available area
    const baseCharge = -800;
    const chargeStrength = students.length > 20 ? baseCharge * 1.5 : baseCharge;

    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id)
            .distance(d => {
                const u = d.source.id || d.source;
                const v = d.target.id || d.target;
                const relScore = getPairRelationshipScore(group, u, v, students);

                if (relScore < 0) {
                    // Tensión/Conflicto: empujar a larga distancia proporcionalmente al nivel de conflicto
                    return 200 + Math.min(5, Math.abs(relScore)) * 35;
                }

                // Afinidades y apoyos: calcular cercanía según cantidad de elecciones y apoyos
                const studentU = students.find(s => s.id === u);
                const studentV = students.find(s => s.id === v);
                let affinityCount = 0;
                const showAcademic = document.getElementById('filterAcademic')?.checked ?? true;
                const showSocial = document.getElementById('filterSocial')?.checked ?? true;
                const showComplementary = document.getElementById('filterComplementary')?.checked ?? true;

                if (studentU && studentU.sociogram) {
                    if (showAcademic && studentU.sociogram.academic?.includes(v)) affinityCount++;
                    if (showSocial && studentU.sociogram.social?.includes(v)) affinityCount++;
                    if (showComplementary && studentU.sociogram.complementary?.includes(v)) affinityCount++;
                }
                if (studentV && studentV.sociogram) {
                    if (showAcademic && studentV.sociogram.academic?.includes(u)) affinityCount++;
                    if (showSocial && studentV.sociogram.social?.includes(u)) affinityCount++;
                    if (showComplementary && studentV.sociogram.complementary?.includes(u)) affinityCount++;
                }

                if (d.type === 'support') return 110;
                if (d.type === 'tension') return 350;

                // Atracción mutua y apoyos reducen la distancia objetivo (más juntos)
                let dist = 180 - (affinityCount * 12) - (relScore * 6);
                return Math.max(120, dist);
            })
            .strength(d => {
                const u = d.source.id || d.source;
                const v = d.target.id || d.target;
                const relScore = getPairRelationshipScore(group, u, v, students);

                if (relScore < 0) {
                    // Muy baja atracción para permitir la repulsión a distancia
                    return 0.01;
                }

                const studentU = students.find(s => s.id === u);
                const studentV = students.find(s => s.id === v);
                let affinityCount = 0;
                const showAcademic = document.getElementById('filterAcademic')?.checked ?? true;
                const showSocial = document.getElementById('filterSocial')?.checked ?? true;
                const showComplementary = document.getElementById('filterComplementary')?.checked ?? true;

                if (studentU && studentU.sociogram) {
                    if (showAcademic && studentU.sociogram.academic?.includes(v)) affinityCount++;
                    if (showSocial && studentU.sociogram.social?.includes(v)) affinityCount++;
                    if (showComplementary && studentU.sociogram.complementary?.includes(v)) affinityCount++;
                }
                if (studentV && studentV.sociogram) {
                    if (showAcademic && studentV.sociogram.academic?.includes(u)) affinityCount++;
                    if (showSocial && studentV.sociogram.social?.includes(u)) affinityCount++;
                    if (showComplementary && studentV.sociogram.complementary?.includes(u)) affinityCount++;
                }

                if (d.type === 'support') return 0.2;
                if (d.type === 'tension') return 0.01;

                // Más elecciones y apoyos aumentan la fuerza de atracción de manera controlada
                let str = 0.06 + (affinityCount * 0.03) + (relScore * 0.015);
                return Math.min(0.22, str);
            })
        )
        .force('charge', d3.forceManyBody().strength(chargeStrength))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 28)) // Increased padding to prevent overlapping
        .force('x', d3.forceX(width / 2).strength(0.04)) // Pull isolated nodes to center enough so they don't fly away
        .force('y', d3.forceY(height / 2).strength(0.04));

    const link = gMain.append('g').selectAll('path').data(links).enter().append('path')
        .attr('stroke', d => {
            if (d.type === 'support') return '#10b981';
            if (d.type === 'tension') return '#ef4444';
            return SOCIOGRAM_EDGE_COLORS[d.type];
        })
        .attr('stroke-width', d => {
            if (d.type === 'support') return 3.5;
            if (d.type === 'tension') return 3.0;
            const sid = d.source.id || d.source;
            const tid = d.target.id || d.target;
            const hasSupport = (supportsMap.get(sid)?.has(tid)) || (supportsMap.get(tid)?.has(sid));
            return hasSupport ? 5.5 : 2;
        })
        .attr('stroke-opacity', d => {
            if (d.type === 'support') return 0.85;
            if (d.type === 'tension') return 0.85;
            const sid = d.source.id || d.source;
            const tid = d.target.id || d.target;
            const hasSupport = (supportsMap.get(sid)?.has(tid)) || (supportsMap.get(tid)?.has(sid));
            return hasSupport ? 0.95 : 0.6;
        })
        .attr('stroke-dasharray', d => {
            if (d.type === 'support') return '4,4';
            if (d.type === 'tension') return '3,3';
            return null;
        })
        .attr('fill', 'none')
        .attr('marker-end', d => (d.type === 'support' || d.type === 'tension') ? null : `url(#arrow-${d.type})`);

    const node = gMain.append('g').selectAll('circle').data(nodes).enter().append('circle')
        .attr('r', d => getNodeRadius(d))
        .attr('fill', d => d.color)
        .attr('stroke', d => d.channelColor)
        .attr('stroke-width', 3);

    node.append('title')
        .text(d => `${d.name}\nElecciones recibidas: ${d.inDegree}`);

    const label = gMain.append('g').selectAll('text').data(nodes).enter().append('text')
        .text(d => d.name).attr('font-size', '11px')
        .attr('font-family', 'Work Sans, sans-serif')
        .attr('fill', 'var(--text-primary)')
        .attr('text-anchor', 'middle')
        .attr('dy', d => getNodeRadius(d) + 14);

    node.call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    // Global Visual Update function
    function updateVisuals() {
        const showAcademic = document.getElementById('filterAcademic')?.checked ?? true;
        const showSocial = document.getElementById('filterSocial')?.checked ?? true;
        const showComplementary = document.getElementById('filterComplementary')?.checked ?? true;
        const showSupports = document.getElementById('filterSupports')?.checked ?? true;
        const showTensions = document.getElementById('filterTensions')?.checked ?? true;
        const enableExclusion = document.getElementById('filterExclusion')?.checked ?? false;
        const selectedChannel = document.getElementById('crossLearningChannel')?.value ?? '';
        const selectedInterest = document.getElementById('crossInterest')?.value ?? '';

        const isLinkVisible = d => {
            if (d.type === 'academic' && !showAcademic) return false;
            if (d.type === 'social' && !showSocial) return false;
            if (d.type === 'complementary' && !showComplementary) return false;
            if (d.type === 'support' && !showSupports) return false;
            if (d.type === 'tension' && !showTensions) return false;
            return true;
        };

        // 1. Calculate active in-degrees dynamically
        nodes.forEach(n => n.currentInDegree = 0);
        links.forEach(l => {
            if (isLinkVisible(l)) {
                const targetNode = nodes.find(n => n.id === (l.target.id || l.target));
                if (targetNode) targetNode.currentInDegree++;
            }
        });

        // 2. Excluded node alerts (pulse border if 0 incoming connections)
        node.classed('excluded-node', n => {
            return enableExclusion && n.currentInDegree === 0;
        });

        // 3. Link rendering visibility
        link.style('display', d => isLinkVisible(d) ? null : 'none');

        // 4. Cross Analysis
        const hasCrossFilter = selectedChannel !== '' || selectedInterest !== '';
        const matchesCrossFilter = n => {
            const student = students.find(s => s.id === n.id);
            if (!student) return false;
            if (selectedChannel && (student.learningChannel || 'No especificado') !== selectedChannel) return false;
            if (selectedInterest && !(student.interests || []).includes(selectedInterest)) return false;
            return true;
        };

        // Clicked Node Ego Network
        let clickedEgoNodes = null;
        if (selectedNodeId) {
            const choosers = new Set(
                links.filter(l => (l.target.id || l.target) === selectedNodeId && isLinkVisible(l))
                    .map(l => l.source.id || l.source)
            );
            const chosen = new Set(
                links.filter(l => (l.source.id || l.source) === selectedNodeId && isLinkVisible(l))
                    .map(l => l.target.id || l.target)
            );
            clickedEgoNodes = new Set([selectedNodeId, ...choosers, ...chosen]);
        }

        // Apply opacities
        node.style('opacity', n => {
            if (clickedEgoNodes && !clickedEgoNodes.has(n.id)) return 0.15;
            if (hasCrossFilter && !matchesCrossFilter(n)) return 0.15;
            return 1.0;
        });

        label.style('opacity', n => {
            if (clickedEgoNodes && !clickedEgoNodes.has(n.id)) return 0.15;
            if (hasCrossFilter && !matchesCrossFilter(n)) return 0.15;
            return 1.0;
        });

        link.style('opacity', l => {
            if (!isLinkVisible(l)) return 0;
            const sid = l.source.id || l.source;
            const tid = l.target.id || l.target;

            if (selectedNodeId && sid !== selectedNodeId && tid !== selectedNodeId) {
                return 0.05;
            }

            if (hasCrossFilter && (!matchesCrossFilter({id: sid}) || !matchesCrossFilter({id: tid}))) {
                return 0.05;
            }

            return 0.6;
        });

        if (typeof renderGroupDiagnostic === 'function') {
            renderGroupDiagnostic(group);
        }
    }

    function applyLinkFilters(e) {
        updateVisuals();

        const showAcademic = document.getElementById('filterAcademic')?.checked ?? true;
        const showSocial = document.getElementById('filterSocial')?.checked ?? true;
        const showComplementary = document.getElementById('filterComplementary')?.checked ?? true;
        const showSupports = document.getElementById('filterSupports')?.checked ?? true;
        const showTensions = document.getElementById('filterTensions')?.checked ?? true;

        const isVisible = d => {
            if (d.type === 'academic' && !showAcademic) return false;
            if (d.type === 'social' && !showSocial) return false;
            if (d.type === 'complementary' && !showComplementary) return false;
            if (d.type === 'support' && !showSupports) return false;
            if (d.type === 'tension' && !showTensions) return false;
            return true;
        };

        const visibleLinks = links.filter(isVisible);
        simulation.force('link').links(visibleLinks);

        if (e && e.type === 'change') {
            simulation.alpha(0.3).restart();
        }
    }

    applyLinkFilters();

    ['filterAcademic', 'filterSocial', 'filterComplementary', 'filterSupports', 'filterTensions'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = applyLinkFilters;
    });

    ['filterExclusion', 'crossLearningChannel', 'crossInterest'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = () => updateVisuals();
    });

    node.on('click', (event, d) => {
        event.stopPropagation();
        if (selectedNodeId === d.id) {
            selectedNodeId = null;
        } else {
            selectedNodeId = d.id;
        }
        updateVisuals();
    });

    // Zoom and Pan implementation
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (e) => {
            gMain.attr('transform', e.transform);
        });
    svg.call(zoom);

    svg.on('click', () => {
        selectedNodeId = null;
        updateVisuals();
    });

    const typeOffset = { academic: -18, social: 0, complementary: 18, support: 0 };

    simulation.on('tick', () => {
        link.attr('d', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / dist;
            const ny = dx / dist;
            const offset = typeOffset[d.type] || 0;

            const sx = d.source.x + nx * offset;
            const sy = d.source.y + ny * offset;
            const tx = d.target.x + nx * offset;
            const ty = d.target.y + ny * offset;

            // Acortar en el extremo destino para que la flecha quede en el borde del nodo
            const r = getNodeRadius(d.target) + 2;
            const endX = tx - (dx / dist) * r;
            const endY = ty - (dy / dist) * r;

            // Curva cúbica con punto de control desplazado perpendicularmente
            const midX = (sx + tx) / 2 + nx * 30;
            const midY = (sy + ty) / 2 + ny * 30;

            return `M${sx},${sy} Q${midX},${midY} ${endX},${endY}`;
        });

        node.attr('cx', d => d.x)
            .attr('cy', d => d.y);

        label.attr('x', d => d.x).attr('y', d => d.y);
    });
}

function renderCentralityTable(students) {
    const container = document.getElementById('centralityTableContainer');
    if (!container) return;
    const inDeg = {}; students.forEach(s => { inDeg[s.id] = 0; });
    const adj = {}; students.forEach(s => { adj[s.id] = new Set(); });
    const types = ['academic', 'social', 'complementary'];

    students.forEach(s => {
        if (!s.sociogram) return;
        types.forEach(type => {
            (s.sociogram[type] || []).forEach(tid => {
                if (inDeg.hasOwnProperty(tid)) { inDeg[tid]++; adj[s.id].add(tid); }
            });
        });
    });

    const betw = calculateBetweenness(students, adj);
    const maxIn = Math.max(0, ...Object.values(inDeg));
    const maxB = Math.max(0, ...Object.values(betw));

    const roles = {};
    students.forEach(s => { roles[s.id] = inDeg[s.id] === 0 ? 'Nodo aislado' : 'Participante'; });
    if (maxB > 0) students.forEach(s => { if (betw[s.id] === maxB && inDeg[s.id] > 0) roles[s.id] = 'Puente del grupo'; });
    if (maxIn > 0) students.forEach(s => { if (inDeg[s.id] === maxIn) roles[s.id] = 'Nodo central'; });

    const sorted = [...students].sort((a, b) => inDeg[b.id] - inDeg[a.id]);
    const roleClass = r => r === 'Nodo central' ? 'central' : r === 'Puente del grupo' ? 'bridge' : r === 'Nodo aislado' ? 'isolated' : 'participant';

    const isVisible = document.getElementById('centralityTableContent')?.style.display === 'block';

    container.innerHTML = `
        <div id="centralityTableHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-top: 1.5rem; margin-bottom: 1rem;">
            <h4 style="margin: 0; font-family: 'Crimson Pro', serif; font-size: 1.3rem; color: var(--text-primary);">📊 Tabla de Centralidad y Roles</h4>
            <span id="centralityTableToggle">${isVisible ? '▲' : '▼'}</span>
        </div>
        <div id="centralityTableContent" style="display: ${isVisible ? 'block' : 'none'};">
            <div style="overflow-x: auto;">
                <table class="centrality-table">
                    <thead><tr><th>Alumno</th><th>Elecciones recibidas</th><th>Rol estimado</th></tr></thead>
                    <tbody>${sorted.map(s => `<tr>
                        <td><span class="student-color-dot" style="background-color:${(s.color && s.color !== '#f8fafc') ? s.color : '#9ca3af'};"></span>${s.preferredName || s.fullName}</td>
                        <td style="text-align:center;">${inDeg[s.id]}</td>
                        <td><span class="role-badge role-${roleClass(roles[s.id])}">${roles[s.id]}</span></td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>`;

    document.getElementById('centralityTableHeader').addEventListener('click', () => {
        const content = document.getElementById('centralityTableContent');
        const toggle = document.getElementById('centralityTableToggle');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▲';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▼';
        }
    });
}

function calculateBetweenness(students, adj) {
    const ids = students.map(s => s.id);
    const betw = {}; ids.forEach(id => { betw[id] = 0; });
    ids.forEach(src => {
        const dist = {}; const paths = {};
        ids.forEach(id => { dist[id] = -1; paths[id] = []; });
        dist[src] = 0;
        const q = [src];
        while (q.length > 0) {
            const cur = q.shift();
            (adj[cur] || new Set()).forEach(nb => {
                if (dist[nb] === -1) { dist[nb] = dist[cur] + 1; q.push(nb); paths[nb].push(cur); }
                else if (dist[nb] === dist[cur] + 1) { paths[nb].push(cur); }
            });
        }
        ids.forEach(tgt => {
            if (tgt === src || dist[tgt] === -1) return;
            const visited = new Set();
            const tq = [tgt];
            while (tq.length > 0) {
                const nd = tq.shift();
                (paths[nd] || []).forEach(prev => {
                    if (prev !== src && !visited.has(prev)) { betw[prev]++; visited.add(prev); tq.push(prev); }
                });
            }
        });
    });
    return betw;
}

function exportSociogramPNG() {
    const svgEl = document.getElementById('sociogramSVG');
    const gMain = document.getElementById('sociogramGMain');
    if (!svgEl || !gMain) { alert('No hay un sociograma para exportar.'); return; }

    // Get actual bounding box of the graph elements
    const bbox = gMain.getBBox();
    const padding = 20;

    // Create a clone to manipulate without affecting the UI
    const clonedSvg = svgEl.cloneNode(true);
    const clonedGMain = clonedSvg.querySelector('#sociogramGMain');

    // Reset transform to ensure pure export without current zoom/pan scale
    clonedGMain.removeAttribute('transform');

    // Set viewBox to tightly crop the graph with padding
    clonedSvg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
    clonedSvg.setAttribute('width', bbox.width + padding * 2);
    clonedSvg.setAttribute('height', bbox.height + padding * 2);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Export at 2x resolution for better quality
    canvas.width = (bbox.width + padding * 2) * 2;
    canvas.height = (bbox.height + padding * 2) * 2;
    ctx.scale(2, 2);

    img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const a = document.createElement('a');
        a.download = `sociograma-${new Date().toISOString().split('T')[0]}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function toggleSociogramFullscreen() {
    const wrapper = document.getElementById('sociogramFullscreenWrapper');
    if (!wrapper) return;
    if (!document.fullscreenElement) {
        wrapper.requestFullscreen().catch(err => {
            alert(`Error al intentar iniciar el modo pantalla completa: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
}

document.addEventListener('fullscreenchange', () => {
    const wrapper = document.getElementById('sociogramFullscreenWrapper');
    const container = document.getElementById('sociogramGraphContainer');
    const exitBtn = document.getElementById('exitFullscreenBtn');

    if (!wrapper || !container) return;

    if (document.fullscreenElement) {
        wrapper.style.padding = '1.5rem';
        container.style.height = 'auto'; // allow flex-grow to work
        container.style.borderRadius = '0';
        if (exitBtn) exitBtn.style.display = 'block';
    } else {
        wrapper.style.padding = '0';
        container.style.height = '500px';
        container.style.borderRadius = '12px';
        if (exitBtn) exitBtn.style.display = 'none';
    }
    // Reiniciar el grafo con las nuevas dimensiones
    if (typeof appData !== 'undefined' && typeof currentGroupId !== 'undefined') {
        const group = appData.groups.find(g => g.id === currentGroupId);
        if (group) renderSociogramGraph(group);
    }
});

function renderGroupDiagnostic(group) {
    const container = document.getElementById('sociogramDiagnosticContainer');
    if (!container) return;

    const isVisible = document.getElementById('sociogramDiagnosticContent')?.style.display === 'block';

    const students = group.students || [];
    if (students.length === 0) {
        container.innerHTML = '';
        return;
    }

    const showAcademic = document.getElementById('filterAcademic')?.checked ?? true;
    const showSocial = document.getElementById('filterSocial')?.checked ?? true;
    const showComplementary = document.getElementById('filterComplementary')?.checked ?? true;

    const activeTypes = [];
    if (showAcademic) activeTypes.push('academic');
    if (showSocial) activeTypes.push('social');
    if (showComplementary) activeTypes.push('complementary');

    let contentHtml = '';

    if (activeTypes.length === 0) {
        contentHtml = `
            <div style="background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 12px; padding: 1.5rem; text-align: center;">
                <h4 style="margin: 0; color: var(--text-secondary); font-family: 'Crimson Pro', serif; font-size: 1.2rem;">⚠️ Selecciona al menos una dimensión de afinidad para calcular el diagnóstico pedagógico.</h4>
            </div>
        `;
    } else {
        // Calculate active metrics
        const inDegree = {};
        const adj = {};
        students.forEach(s => {
            inDegree[s.id] = 0;
            adj[s.id] = new Set();
        });

        let totalActiveLinks = 0;
        const activeLinksSet = new Set();

        students.forEach(s => {
            if (!s.sociogram) return;
            activeTypes.forEach(type => {
                (s.sociogram[type] || []).forEach(tid => {
                    if (inDegree.hasOwnProperty(tid)) {
                        inDegree[tid]++;
                        adj[s.id].add(tid);
                        activeLinksSet.add(`${s.id}->${tid}`);
                        totalActiveLinks++;
                    }
                });
            });
        });

        const betweenness = calculateBetweenness(students, adj);
        const sorted = [...students].sort((a, b) => inDegree[b.id] - inDegree[a.id]);

        const topStudent = sorted[0];
        const thirdStudent = sorted[2];
        const topIn = topStudent ? inDegree[topStudent.id] : 0;
        const thirdIn = thirdStudent ? inDegree[thirdStudent.id] : 0;

        const observations = group.observations || [];
        // Scan observations for student name mentions and build a conflict map
        const studentMentions = {};
        const conflictsMap = new Map();
        students.forEach(s => {
            studentMentions[s.id] = [];
            conflictsMap.set(s.id, new Set());
        });

        observations.forEach(obs => {
            students.forEach(s => {
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
                    return namePattern.test(obs.text);
                }) || obs.text.toLowerCase().includes(fullNameLower);

                if (matched) {
                    studentMentions[s.id].push({
                        date: obs.date,
                        text: obs.text
                    });
                }
            });
        });

        // Build conflictsMap using cumulative relationship score < 0
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
        // --- CARD 1: Liderazgo y Estructura Social ---
        let card1Title = 'Estructura de Liderazgo';
        let card1Icon = '👑';
        let card1Desc = '';
        let card1BadgeText = '';
        let card1Theme = 'accent';

        if (totalActiveLinks === 0) {
            card1Icon = '🌐';
            card1BadgeText = 'Sin Conexiones';
            card1Theme = 'danger';
            card1Desc = 'No se han registrado elecciones o afinidades entre los alumnos para las dimensiones seleccionadas en este grupo.';
        } else if (topIn >= 5 && topIn >= 2 * thirdIn) {
            card1Icon = '👑';
            card1BadgeText = 'Líder Hegemónico';
            card1Theme = 'warning';
            const name = topStudent.preferredName || topStudent.fullName;
            card1Desc = `Se observa una estructura de red altamente centralizada en <strong>${name}</strong>, quien recibe <strong>${topIn}</strong> elecciones. Existe un riesgo de dependencia o de que su criterio monopolice la dinámica del grupo.
            <br><br>
            <strong>Estrategia Pedagógica:</strong> Asignar a <strong>${name}</strong> roles de monitor o tutor de forma rotativa para canalizar su liderazgo de manera positiva, pero regulando su intervención en discusiones plenarias para dar voz a otros alumnos.`;
        } else {
            card1Icon = '🤝';
            card1BadgeText = 'Red Horizontal';
            card1Theme = 'success';
            const top2 = sorted.slice(0, 2).map(s => s.preferredName || s.fullName).join(' y ');
            card1Desc = `La red muestra un liderazgo distribuido y horizontal, sin un único nodo dominante. Las influencias están repartidas de manera equilibrada (destacando levemente a <strong>${top2}</strong>).
            <br><br>
            <strong>Estrategia Pedagógica:</strong> Aprovechar la alta cohesión horizontal implementando dinámicas de aprendizaje cooperativo estructurado, como la <strong>Técnica de Rompecabezas (Jigsaw)</strong> o la asignación de roles complementarios en equipos para potenciar esta cohesión natural.`;
        }

        // --- CARD 2: Alumnos en Riesgo de Aislamiento ---
        let card2Title = 'Inclusión y Cohesión';
        let card2Icon = '🛡️';
        let card2Desc = '';
        let card2BadgeText = '';
        let card2Theme = 'success';

        const isolated = students.filter(s => inDegree[s.id] === 0);
        
        let bridgeStudent = null;
        let maxB = -1;
        students.forEach(s => {
            if (inDegree[s.id] > 0 && betweenness[s.id] > maxB) {
                maxB = betweenness[s.id];
                bridgeStudent = s;
            }
        });
        if (!bridgeStudent || maxB <= 0) {
            const nonIsolated = sorted.filter(s => inDegree[s.id] > 0);
            if (nonIsolated.length > 0) {
                bridgeStudent = nonIsolated[0];
            }
        }

        if (totalActiveLinks === 0) {
            card2Icon = '👤';
            card2BadgeText = 'Sin Datos';
            card2Theme = 'warning';
            card2Desc = 'No es posible evaluar el nivel de inclusión debido a la falta de conexiones activas en esta vista.';
        } else if (isolated.length === 0) {
            card2Icon = '🛡️';
            card2BadgeText = 'Integración Completa';
            card2Theme = 'success';
            card2Desc = '¡Excelente cohesión! Todos los alumnos de la clase han sido nominados al menos una vez en las dimensiones de red activas. No se detectan nodos aislados.';
        } else {
            card2Icon = '🚨';
            card2BadgeText = 'Riesgo de Exclusión';
            card2Theme = 'danger';
            const isolatedNames = isolated.map(s => s.preferredName || s.fullName).join(', ');
            
            const isolatedPairs = [];
            isolated.forEach(iso => {
                const partnerCandidates = students.filter(s => s.id !== iso.id && inDegree[s.id] > 0);
                partnerCandidates.sort((a, b) => {
                    const diffB = betweenness[b.id] - betweenness[a.id];
                    if (Math.abs(diffB) > 0.00001) return diffB;
                    return inDegree[b.id] - inDegree[a.id];
                });

                let chosenPartner = null;
                let avoidedGlobal = false;
                let avoidedGlobalName = '';

                if (partnerCandidates.length > 0) {
                    const topCandidate = partnerCandidates[0];
                    const topCandidateName = topCandidate.preferredName || topCandidate.fullName;

                    const hasConflictWithTop = conflictsMap.get(iso.id).has(topCandidate.id);
                    if (hasConflictWithTop) {
                        avoidedGlobal = true;
                        avoidedGlobalName = topCandidateName;
                        chosenPartner = partnerCandidates.find(c => !conflictsMap.get(iso.id).has(c.id));
                    } else {
                        chosenPartner = topCandidate;
                    }
                }

                const partnerName = chosenPartner ? (chosenPartner.preferredName || chosenPartner.fullName) : 'un compañero con alta aceptación';
                let warningText = '';
                if (avoidedGlobal) {
                    warningText = ` <span style="color: var(--danger); font-weight: 600; font-size: 0.8rem;">⚠️ Se evitó a: ${avoidedGlobalName} (por reporte de conflicto en la bitácora)</span>`;
                }

                isolatedPairs.push(`• <strong>${iso.preferredName || iso.fullName}</strong> con <strong>${partnerName}</strong>${warningText}`);
            });
            
            const mentionsList = [];
            isolated.forEach(s => {
                const mentions = studentMentions[s.id] || [];
                if (mentions.length > 0) {
                    const lastMention = mentions[mentions.length - 1];
                    mentionsList.push(`• <strong>${s.preferredName || s.fullName}</strong> (${lastMention.date}): "${lastMention.text.substring(0, 60)}..."`);
                }
            });
            
            let trackingText = '';
            if (mentionsList.length > 0) {
                trackingText = `<br><br><span style="font-size:0.85rem; color:var(--text-tertiary); font-weight:600; text-transform:uppercase;">Seguimiento en Bitácora:</span><br><span style="font-size:0.85rem; line-height:1.4; display:block; margin-top:0.25rem;">${mentionsList.join('<br>')}</span>`;
            } else {
                trackingText = `<br><br><span style="font-size:0.85rem; color:var(--text-tertiary); font-weight:600; text-transform:uppercase;">Seguimiento en Bitácora:</span><br><span style="font-size:0.85rem; color:var(--text-tertiary); font-style:italic;">Sin observaciones recientes registradas para estos alumnos aislados.</span>`;
            }

            card2Desc = `Se han identificado <strong>${isolated.length}</strong> alumnos en riesgo de exclusión (con 0 elecciones recibidas): <strong>${isolatedNames}</strong>.
            <br><br>
            <strong>Estrategia Pedagógica:</strong> Diseñar equipos pequeños (tríos) y emparejar de forma directa a estos alumnos con un <strong>Alumno Puente</strong> conector recomendado (evitando dinámicamente conflictos reportados en la bitácora):
            <div style="margin-top: 0.5rem; margin-left: 0.5rem; line-height: 1.6;">
                ${isolatedPairs.join('<br>')}
            </div>
            <br>
            Para facilitar su andamiaje socioemocional y participación segura.
            ${trackingText}`;
        }

        // --- CARD 3: Subgrupos Cerrados (Camarillas) ---
        let card3Title = 'Subgrupos y Camarillas';
        let card3Icon = '🧩';
        let card3Desc = '';
        let card3BadgeText = '';
        let card3Theme = 'success';

        const cliques = [];
        const n = students.length;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                for (let k = j + 1; k < n; k++) {
                    const s1 = students[i].id;
                    const s2 = students[j].id;
                    const s3 = students[k].id;

                    const c12 = (activeLinksSet.has(`${s1}->${s2}`) ? 1 : 0) + (activeLinksSet.has(`${s2}->${s1}`) ? 1 : 0);
                    const c13 = (activeLinksSet.has(`${s1}->${s3}`) ? 1 : 0) + (activeLinksSet.has(`${s3}->${s1}`) ? 1 : 0);
                    const c23 = (activeLinksSet.has(`${s2}->${s3}`) ? 1 : 0) + (activeLinksSet.has(`${s3}->${s2}`) ? 1 : 0);

                    const isMutual12 = activeLinksSet.has(`${s1}->${s2}`) && activeLinksSet.has(`${s2}->${s1}`);
                    const isMutual13 = activeLinksSet.has(`${s1}->${s3}`) && activeLinksSet.has(`${s3}->${s1}`);
                    const isMutual23 = activeLinksSet.has(`${s2}->${s3}`) && activeLinksSet.has(`${s3}->${s2}`);

                    const mutualCount = (isMutual12 ? 1 : 0) + (isMutual13 ? 1 : 0) + (isMutual23 ? 1 : 0);

                    // A clique requires all three pairs to be connected, and at least 2 pairs to be mutual
                    if (c12 >= 1 && c13 >= 1 && c23 >= 1 && mutualCount >= 2) {
                        cliques.push([students[i], students[j], students[k]]);
                    }
                }
            }
        }

        if (totalActiveLinks === 0) {
            card3Icon = '🔓';
            card3BadgeText = 'Sin Datos';
            card3Theme = 'warning';
            card3Desc = 'No hay conexiones suficientes para buscar subgrupos cerrados en las dimensiones activas.';
        } else if (cliques.length === 0) {
            card3Icon = '🔓';
            card3BadgeText = 'Red Abierta';
            card3Theme = 'success';
            card3Desc = 'No se observan tríadas altamente recíprocas o camarillas cerradas que puedan polarizar el aula. Las relaciones fluyen de forma abierta hacia toda la red.';
        } else {
            card3Icon = '🔒';
            card3BadgeText = 'Subgrupos Detectados';
            card3Theme = 'warning';
            const cliquesList = cliques.slice(0, 3).map(c => 
                `• { ${c.map(s => s.preferredName || s.fullName).join(', ')} }`
            ).join('<br>');
            const extraText = cliques.length > 3 ? `<br><em>(Y otros ${cliques.length - 3} subgrupos detectados)</em>` : '';
            
            card3Desc = `Se detectaron <strong>${cliques.length}</strong> subgrupos cerrados (camarillas de 3 integrantes con alta reciprocidad):<br>
            ${cliquesList}
            ${extraText}
            <br>
            <strong>Estrategia Pedagógica:</strong> Evitar conformar equipos donde coincidan los integrantes de estas camarillas. Distribuirlos en equipos separados, pero asignarles tareas complementarias que fuercen la interacción indirecta y el flujo de información en el aula.`;
        }

        // --- CARD 4: Segregación e Integración de Atributos ---
        let card4Title = 'Segregación y Diversidad';
        let card4Icon = '🌓';
        let card4Desc = '';
        let card4BadgeText = '';
        let card4Theme = 'success';

        let totalGenderLinks = 0;
        let sameGenderLinks = 0;
        const uniqueGenders = new Set(students.map(s => s.gender).filter(g => g && g !== 'No especificado' && g !== ''));
        const isMixedClass = uniqueGenders.size >= 2;

        let totalChannelLinks = 0;
        let sameChannelLinks = 0;

        students.forEach(s => {
            if (!s.sociogram) return;
            activeTypes.forEach(type => {
                (s.sociogram[type] || []).forEach(tid => {
                    const targetStudent = students.find(ts => ts.id === tid);
                    if (!targetStudent) return;
                    
                    const sGender = s.gender;
                    const tGender = targetStudent.gender;
                    if (sGender && tGender && sGender !== 'No especificado' && tGender !== 'No especificado' && sGender !== '' && tGender !== '') {
                        totalGenderLinks++;
                        if (sGender.toLowerCase() === tGender.toLowerCase()) {
                            sameGenderLinks++;
                        }
                    }

                    const sChannel = s.learningChannel;
                    const tChannel = targetStudent.learningChannel;
                    if (sChannel && tChannel && sChannel !== 'No especificado' && tChannel !== 'No especificado' && sChannel !== '' && tChannel !== '') {
                        totalChannelLinks++;
                        if (sChannel.toLowerCase() === tChannel.toLowerCase()) {
                            sameChannelLinks++;
                        }
                    }
                });
            });
        });

        let genderSegregation = false;
        let genderRatio = 0;
        if (isMixedClass && totalGenderLinks > 5) {
            genderRatio = sameGenderLinks / totalGenderLinks;
            if (genderRatio >= 0.80) {
                genderSegregation = true;
            }
        }

        let channelSegregation = false;
        let channelRatio = 0;
        if (totalChannelLinks > 5) {
            channelRatio = sameChannelLinks / totalChannelLinks;
            if (channelRatio >= 0.60) {
                channelSegregation = true;
            }
        }

        if (totalActiveLinks === 0) {
            card4Icon = '📊';
            card4BadgeText = 'Sin Datos';
            card4Theme = 'warning';
            card4Desc = 'No hay conexiones suficientes para evaluar segregación por género o canales de aprendizaje.';
        } else if (!genderSegregation && !channelSegregation) {
            card4Icon = '🌓';
            card4BadgeText = 'Interacción Diversa';
            card4Theme = 'success';
            card4Desc = 'El grupo presenta una mezcla sana de interacciones. No se observan barreras notables de género ni agrupaciones exclusivas por canal de aprendizaje predilecto.';
        } else {
            card4Icon = '📊';
            card4BadgeText = 'Baja Diversidad';
            card4Theme = 'warning';
            const points = [];
            if (genderSegregation) {
                points.push(`• <strong>Segregación de Género:</strong> El <strong>${(genderRatio * 100).toFixed(0)}%</strong> de las elecciones son intra-género.`);
            }
            if (channelSegregation) {
                points.push(`• <strong>Homofilia de Estilos:</strong> El <strong>${(channelRatio * 100).toFixed(0)}%</strong> de las elecciones son entre canales de aprendizaje idénticos.`);
            }
            
            card4Desc = `Se observa polarización en la red según atributos específicos:<br>
            ${points.join('<br>')}
            <br>
            <strong>Estrategia Pedagógica:</strong> Diseñar intencionalmente equipos heterogéneos que combinen géneros y mezclen alumnos con canales complementarios (visuales, auditivos y kinestésicos) para potenciar la discusión matemática y romper guetos.`;
        }

        // Helper function to map theme to colors
        const getThemeColors = (theme) => {
            switch (theme) {
                case 'success':
                    return {
                        border: 'var(--success)',
                        bg: 'rgba(21, 128, 61, 0.08)',
                        text: 'var(--success)'
                    };
                case 'warning':
                    return {
                        border: 'var(--warning)',
                        bg: 'rgba(202, 138, 4, 0.08)',
                        text: 'var(--warning)'
                    };
                case 'danger':
                    return {
                        border: 'var(--danger)',
                        bg: 'rgba(185, 28, 28, 0.08)',
                        text: 'var(--danger)'
                    };
                case 'accent':
                default:
                    return {
                        border: 'var(--accent)',
                        bg: 'rgba(12, 74, 110, 0.08)',
                        text: 'var(--accent)'
                    };
            }
        };

        const c1Colors = getThemeColors(card1Theme);
        const c2Colors = getThemeColors(card2Theme);
        const c3Colors = getThemeColors(card3Theme);
        const c4Colors = getThemeColors(card4Theme);

        // --- SECTION 5: Estimated Cohesion Score & Reflection ---
        const density = n > 1 ? (totalActiveLinks / (n * (n - 1))) : 0;
        let cohesionScore = Math.round(density * 300); // Base weight of network density
        cohesionScore += (observations.length * 2);
        cohesionScore -= (isolated.length * 10);
        cohesionScore = Math.max(10, Math.min(100, cohesionScore));

        let cohesionColor = 'var(--success)';
        if (cohesionScore < 40) cohesionColor = 'var(--danger)';
        else if (cohesionScore < 70) cohesionColor = 'var(--warning)';

        contentHtml = `
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
                Análisis automatizado de la dinámica del grupo en base a la teoría de grafos para la toma de decisiones didácticas.
            </p>
            <div class="diagnostic-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                <!-- Card 1 -->
                <div class="diag-card" style="border-top: 5px solid ${c1Colors.border};">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="font-size: 1.4rem;">${card1Icon}</span>
                                <h4 style="margin: 0; font-family: 'Crimson Pro', serif; font-size: 1.25rem; color: var(--text-primary);">${card1Title}</h4>
                            </div>
                            <span style="padding: 2px 8px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: ${c1Colors.bg}; color: ${c1Colors.text}; border: 1px solid ${c1Colors.border}44;">${card1BadgeText}</span>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 0;">${card1Desc}</p>
                    </div>
                </div>

                <!-- Card 2 -->
                <div class="diag-card" style="border-top: 5px solid ${c2Colors.border};">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="font-size: 1.4rem;">${card2Icon}</span>
                                <h4 style="margin: 0; font-family: 'Crimson Pro', serif; font-size: 1.25rem; color: var(--text-primary);">${card2Title}</h4>
                            </div>
                            <span style="padding: 2px 8px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: ${c2Colors.bg}; color: ${c2Colors.text}; border: 1px solid ${c2Colors.border}44;">${card2BadgeText}</span>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 0;">${card2Desc}</p>
                    </div>
                </div>

                <!-- Card 3 -->
                <div class="diag-card" style="border-top: 5px solid ${c3Colors.border};">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="font-size: 1.4rem;">${card3Icon}</span>
                                <h4 style="margin: 0; font-family: 'Crimson Pro', serif; font-size: 1.25rem; color: var(--text-primary);">${card3Title}</h4>
                            </div>
                            <span style="padding: 2px 8px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: ${c3Colors.bg}; color: ${c3Colors.text}; border: 1px solid ${c3Colors.border}44;">${card3BadgeText}</span>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 0;">${card3Desc}</p>
                    </div>
                </div>

                <!-- Card 4 -->
                <div class="diag-card" style="border-top: 5px solid ${c4Colors.border};">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="font-size: 1.4rem;">${card4Icon}</span>
                                <h4 style="margin: 0; font-family: 'Crimson Pro', serif; font-size: 1.25rem; color: var(--text-primary);">${card4Title}</h4>
                            </div>
                            <span style="padding: 2px 8px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: ${c4Colors.bg}; color: ${c4Colors.text}; border: 1px solid ${c4Colors.border}44;">${card4BadgeText}</span>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 0;">${card4Desc}</p>
                    </div>
                </div>
            </div>

            <!-- Evolutionary Panel -->
            <div style="background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-top: 1rem; box-shadow: 0 4px 10px var(--shadow);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">📈</span>
                        <h4 style="margin: 0; font-family: 'Crimson Pro', serif; font-size: 1.35rem; color: var(--text-primary);">Evolución de la Dinámica Grupal</h4>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Índice de Cohesión Social:</span>
                        <div style="width: 120px; height: 16px; background: var(--bg-secondary); border-radius: 8px; overflow: hidden; border: 1px solid var(--border); position: relative;">
                            <div style="width: ${cohesionScore}%; height: 100%; background: ${cohesionColor}; transition: width 0.5s ease;"></div>
                        </div>
                        <strong style="font-size: 0.95rem; color: ${cohesionColor};">${cohesionScore}%</strong>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                    <div>
                        <h5 style="margin: 0 0 0.5rem 0; font-size: 0.95rem; color: var(--text-primary); font-weight: 600;">Monitoreo Diario Activo</h5>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
                            El sociograma es un diagnóstico inicial estático. Para que evolucione, el sistema calcula la interacción entre las elecciones de red y los registros guardados en la <strong>Bitácora Grupal</strong> de clase.
                            <br><br>
                            Se han registrado <strong>${observations.length}</strong> sesiones en la bitácora grupal, cruzándose dinámicamente con menciones a alumnos en riesgo o líderes para monitorear el progreso cualitativo.
                        </p>
                    </div>
                    <div>
                        <h5 style="margin: 0 0 0.5rem 0; font-size: 0.95rem; color: var(--text-primary); font-weight: 600;">Estrategia de Evolución</h5>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
                            <strong>Re-evaluación Temporal:</strong> Se aconseja aplicar una segunda medición del sociograma al cabo de 4 a 6 semanas de aplicar las agrupaciones guiadas.
                            <br><br>
                            Al importar un nuevo sociograma en el futuro, la comparación matemática medirá con exactitud el cambio en la densidad de la red y el éxito de la integración de alumnos aislados.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <style>
            .diag-card {
                background: var(--bg-secondary);
                border: 2px solid var(--border);
                border-radius: 12px;
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                transition: transform 0.25s ease, box-shadow 0.25s ease;
                box-shadow: 0 4px 10px var(--shadow);
            }
            .diag-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 20px var(--shadow);
            }
        </style>
        <div id="sociogramDiagnosticHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem;">
            <h3 style="margin: 0; font-family: 'Crimson Pro', serif; font-size: 1.6rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary);">
                <span>🔍</span> Intérprete Pedagógico de Redes
            </h3>
            <span id="sociogramDiagnosticToggle">${isVisible ? '▲' : '▼'}</span>
        </div>
        <div id="sociogramDiagnosticContent" style="display: ${isVisible ? 'block' : 'none'};">
            ${contentHtml}
        </div>
    `;

    document.getElementById('sociogramDiagnosticHeader').addEventListener('click', () => {
        const content = document.getElementById('sociogramDiagnosticContent');
        const toggle = document.getElementById('sociogramDiagnosticToggle');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▲';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▼';
        }
    });
}
