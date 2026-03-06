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

    const section = document.createElement('div');
    section.id = 'sociogramGroupSection';
    section.style.marginTop = '2rem';

    section.innerHTML = `<div class="group-info">
        <div id="sociogramGroupHeader" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <h3 style="margin: 0;">🕸️ Sociograma del Grupo</h3>
            <span id="sociogramGroupToggle">▼</span>
        </div>
        <div id="sociogramGroupContent" style="display: none; margin-top: 1.5rem;">
            <div id="sociogramFullscreenWrapper" style="display: flex; flex-direction: column; background: var(--bg-primary); transition: padding 0.3s; position: relative;">
                <div id="sociogramFilters" style="display:flex;gap:1.5rem;margin-bottom:1rem;flex-wrap:wrap;">
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
            <div style="display:flex;gap:1rem;margin-top:1rem;">
                <button class="btn btn-secondary btn-small" id="sociogramFullscreenBtn">⛶ Pantalla completa</button>
                <button class="btn btn-secondary btn-small" id="exportSociogramBtn">📷 Exportar vista del sociograma</button>
            </div>
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
            renderSociogramGraph(students);
            renderCentralityTable(students);
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

function renderSociogramGraph(students) {
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
        .force('link', d3.forceLink(links).id(d => d.id).distance(180)) // Slightly longer links
        .force('charge', d3.forceManyBody().strength(chargeStrength))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 15)) // Moar space between nodes
        .force('x', d3.forceX(width / 2).strength(0.04)) // Pull isolated nodes to center enough so they don't fly away
        .force('y', d3.forceY(height / 2).strength(0.04));

    const link = gMain.append('g').selectAll('path').data(links).enter().append('path')
        .attr('stroke', d => SOCIOGRAM_EDGE_COLORS[d.type])
        .attr('stroke-width', 2).attr('stroke-opacity', 0.6)
        .attr('fill', 'none')
        .attr('marker-end', d => `url(#arrow-${d.type})`);

    function applyLinkFilters(e) {
        const showAcademic = document.getElementById('filterAcademic')?.checked ?? true;
        const showSocial = document.getElementById('filterSocial')?.checked ?? true;
        const showComplementary = document.getElementById('filterComplementary')?.checked ?? true;

        const isVisible = d => {
            if (d.type === 'academic' && !showAcademic) return false;
            if (d.type === 'social' && !showSocial) return false;
            if (d.type === 'complementary' && !showComplementary) return false;
            return true;
        };

        link.style('display', d => isVisible(d) ? null : 'none');

        // Actualizar física del grafo usando solo los enlaces visibles
        const visibleLinks = links.filter(isVisible);
        simulation.force('link').links(visibleLinks);

        // Reactivar fuerzas para que los nodos se reposicionen
        if (e && e.type === 'change') {
            simulation.alpha(0.3).restart();
        }
    }

    applyLinkFilters();

    ['filterAcademic', 'filterSocial', 'filterComplementary'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = applyLinkFilters;
    });

    const node = gMain.append('g').selectAll('circle').data(nodes).enter().append('circle')
        .attr('r', d => getNodeRadius(d))
        .attr('fill', d => d.color)
        .attr('stroke', d => d.channelColor)
        .attr('stroke-width', 3);

    node.append('title')
        .text(d => `${d.name}\nElecciones recibidas: ${d.inDegree}`);

    node.call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.on('click', (event, d) => {
        event.stopPropagation();
        if (selectedNodeId === d.id) {
            // Segundo clic en el mismo nodo: restaurar todo
            selectedNodeId = null;
            node.style('opacity', 1);
            link.style('opacity', 0.6);
            label.style('opacity', 1);
        } else {
            selectedNodeId = d.id;

            const showAcademic = document.getElementById('filterAcademic')?.checked ?? true;
            const showSocial = document.getElementById('filterSocial')?.checked ?? true;
            const showComplementary = document.getElementById('filterComplementary')?.checked ?? true;

            const isVisible = l => {
                if (l.type === 'academic' && !showAcademic) return false;
                if (l.type === 'social' && !showSocial) return false;
                if (l.type === 'complementary' && !showComplementary) return false;
                return true;
            };

            // IDs que eligieron al nodo clicado y están visibles en el filtro
            const choosers = new Set(
                links.filter(l => (l.target.id || l.target) === d.id && isVisible(l))
                    .map(l => l.source.id || l.source)
            );
            // IDs que el nodo clicado eligió y están visibles en el filtro
            const chosen = new Set(
                links.filter(l => (l.source.id || l.source) === d.id && isVisible(l))
                    .map(l => l.target.id || l.target)
            );
            node.style('opacity', n =>
                n.id === d.id || choosers.has(n.id) || chosen.has(n.id) ? 1 : 0.15
            );
            link.style('opacity', l => {
                const sid = l.source.id || l.source;
                const tid = l.target.id || l.target;
                return (sid === d.id || tid === d.id) ? 1 : 0.05;
            });
            label.style('opacity', n =>
                n.id === d.id || choosers.has(n.id) || chosen.has(n.id) ? 1 : 0.15
            );
        }
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
        node.style('opacity', 1);
        link.style('opacity', 0.6);
        label.style('opacity', 1);
    });

    const label = gMain.append('g').selectAll('text').data(nodes).enter().append('text')
        .text(d => d.name).attr('font-size', '11px')
        .attr('font-family', 'Work Sans, sans-serif')
        .attr('fill', 'var(--text-primary)')
        .attr('text-anchor', 'middle')
        .attr('dy', d => getNodeRadius(d) + 14);

    const typeOffset = { academic: -18, social: 0, complementary: 18 };

    simulation.on('tick', () => {
        link.attr('d', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / dist;
            const ny = dx / dist;
            const offset = typeOffset[d.type];

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

    container.innerHTML = `<h4 style="margin-bottom: 0.75rem;">Tabla de Centralidad</h4>
        <div style="overflow-x: auto;"><table class="centrality-table">
        <thead><tr><th>Alumno</th><th>Elecciones recibidas</th><th>Rol estimado</th></tr></thead>
        <tbody>${sorted.map(s => `<tr>
            <td><span class="student-color-dot" style="background-color:${(s.color && s.color !== '#f8fafc') ? s.color : '#9ca3af'};"></span>${s.preferredName || s.fullName}</td>
            <td style="text-align:center;">${inDeg[s.id]}</td>
            <td><span class="role-badge role-${roleClass(roles[s.id])}">${roles[s.id]}</span></td>
        </tr>`).join('')}</tbody></table></div>`;
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
        if (group) renderSociogramGraph(group.students || []);
    }
});
