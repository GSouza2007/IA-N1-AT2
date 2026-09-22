let currentSearch = null;
let currentHeuristic = 'original';
let animationSpeed = 600; // ms
let isRunning = false;
let resultadoOriginal = null;
let resultadoModificado = null;

document.addEventListener('DOMContentLoaded', () => {
  initGraph('original');
  updateDashboardSummary();
  
  document.getElementById('btn-auto').addEventListener('click', runAutomatic);
  document.getElementById('btn-step').addEventListener('click', runStep);
  document.getElementById('btn-reset').addEventListener('click', resetAll);
  document.getElementById('btn-compare').addEventListener('click', runComparison);

  document.getElementById('heuristic-select').addEventListener('change', (e) => {
    currentHeuristic = e.target.value;
    resetAll();
  });

  document.getElementById('speed-range').addEventListener('input', (e) => {
    animationSpeed = parseInt(e.target.value);
    document.getElementById('speed-value').textContent = `${animationSpeed}ms`;
  });

  renderHeuristicTable();
});

function updateDashboardSummary(resultados = null) {
  const label = currentHeuristic === 'original' ? 'Original' : 'Modificada';
  const heuristicText = document.getElementById('summary-heuristic');
  const heuristicSub = document.getElementById('summary-heuristic-subtitle');
  const statusHeuristic = document.getElementById('status-heuristic');
  const pathText = document.getElementById('summary-path');
  const visitedText = document.getElementById('summary-visited');
  const statusText = document.getElementById('summary-status');
  const statusDetail = document.getElementById('summary-status-detail');

  if (heuristicText) heuristicText.textContent = label;
  if (statusHeuristic) statusHeuristic.textContent = label;
  if (heuristicSub) {
    heuristicSub.textContent = currentHeuristic === 'original' ? 'Busca padrão' : 'Teste de engano';
  }

  if (resultados && resultados.encontrou) {
    pathText.textContent = resultados.caminho.length ? `${resultados.caminho.length} etapas` : 'Encontrado';
    visitedText.textContent = String(resultados.quantidadeVisitados || 0);
    statusText.textContent = 'Rota OK';
    statusDetail.textContent = `${resultados.caminho.join(' → ')}`;
  } else if (resultados && !resultados.encontrou) {
    pathText.textContent = 'Sem rota';
    visitedText.textContent = String(resultados.quantidadeVisitados || 0);
    statusText.textContent = 'Falhou';
    statusDetail.textContent = 'Não há caminho válido';
  } else {
    pathText.textContent = '—';
    visitedText.textContent = '0';
    statusText.textContent = 'Pronto';
    statusDetail.textContent = 'Aguardando nova execução';
  }
}

function initGraph(type) {
  const heuristics = type === 'original' ? HEURISTICS_ORIGINAL : HEURISTICS_MODIFIED;
  initCytoscape('cy-container', heuristics);
}

function getActiveHeuristics() {
  return currentHeuristic === 'original' ? HEURISTICS_ORIGINAL : HEURISTICS_MODIFIED;
}

function renderHeuristicTable() {
  const tbody = document.getElementById('heuristic-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  const estados = getAllEstados().sort((a, b) => {
    const hA = HEURISTICS_ORIGINAL[a];
    const hB = HEURISTICS_ORIGINAL[b];
    return hA - hB;
  });

  for (const estado of estados) {
    const tr = document.createElement('tr');
    const hOrig = HEURISTICS_ORIGINAL[estado];
    const hMod = HEURISTICS_MODIFIED[estado];
    const changed = hOrig !== hMod;

    tr.innerHTML = `
      <td>${getEstadoIcon(estado)} ${estado}</td>
      <td>${hOrig}</td>
      <td class="${changed ? 'changed' : ''}">${hMod}${changed ? ' <i data-lucide="alert-triangle"></i>' : ''}</td>
    `;
    tbody.appendChild(tr);
  }
  lucide.createIcons();
}

function getEstadoIcon(estado) {
  const icons = {
    'Base': '<i data-lucide="ambulance"></i>', 
    'Centro': '<i data-lucide="building-2"></i>', 
    'Rodoviária': '<i data-lucide="bus"></i>',
    'Parque': '<i data-lucide="tree-pine"></i>', 
    'Aeroporto': '<i data-lucide="plane"></i>', 
    'Shopping': '<i data-lucide="shopping-bag"></i>',
    'Terminal': '<i data-lucide="train-front"></i>', 
    'Universidade': '<i data-lucide="graduation-cap"></i>', 
    'Estádio': '<i data-lucide="ticket"></i>',
    'Praça': '<i data-lucide="flower-2"></i>', 
    'Ponte': '<i data-lucide="cable"></i>', 
    'Hospital': '<i data-lucide="hospital"></i>',
  };
  return icons[estado] || '<i data-lucide="map-pin"></i>';
}

async function runAutomatic() {
  if (isRunning) return;
  
  resetAll();
  await sleep(200);
  
  isRunning = true;
  setButtonsEnabled(false, true);
  
  const heuristics = getActiveHeuristics();
  currentSearch = new HeuristicSearch(heuristics, ESTADO_INICIAL, ESTADO_OBJETIVO);
  
  clearLog();
  addLogEntry('info', `<div class="log-entry-header"><i data-lucide="rocket"></i> Iniciando Busca Heurística (${currentHeuristic === 'original' ? 'Original' : 'Modificada'})</div>`);
  addLogEntry('info', `<div class="log-entry-header"><i data-lucide="map-pin"></i> Origem: ${ESTADO_INICIAL} | <i data-lucide="target"></i> Destino: ${ESTADO_OBJETIVO}</div>`);
  addLogEntry('info', `<div class="log-entry-header"><i data-lucide="ruler"></i> Critério de desempate: Ordem Alfabética</div>`);
  addLogDivider();

  let stepCount = 0;

  while (!currentSearch.finalizado) {
    const passo = currentSearch.step();
    stepCount++;

    if (!passo) break;

    await animateStep(passo, animationSpeed);
    await sleep(animationSpeed);

    logStep(stepCount, passo);
  }

  const resultados = currentSearch.getResultados();
  displayResults(resultados);
  updateDashboardSummary(resultados);

  if (resultados.encontrou) {
    addLogDivider();
    addLogEntry('success', `<div class="log-entry-header"><i data-lucide="flag"></i> Caminho encontrado!</div>`);
    await sleep(400);
    await animatePath(resultados.caminho, 300);
  }

  if (currentHeuristic === 'original') {
    resultadoOriginal = resultados;
  } else {
    resultadoModificado = resultados;
  }

  isRunning = false;
  setButtonsEnabled(true, false);
}

let stepCounter = 0;

async function runStep() {
  if (isRunning) return;

  if (!currentSearch || currentSearch.finalizado) {
    const heuristics = getActiveHeuristics();
    currentSearch = new HeuristicSearch(heuristics, ESTADO_INICIAL, ESTADO_OBJETIVO);
    stepCounter = 0;
    clearLog();
    addLogEntry('info', `<div class="log-entry-header"><i data-lucide="step-forward"></i> Busca Passo a Passo (${currentHeuristic === 'original' ? 'Original' : 'Modificada'})</div>`);
    addLogEntry('info', `<div class="log-entry-header"><i data-lucide="map-pin"></i> Origem: ${ESTADO_INICIAL} | <i data-lucide="target"></i> Destino: ${ESTADO_OBJETIVO}</div>`);
    addLogEntry('info', `<div class="log-entry-header"><i data-lucide="ruler"></i> Critério de desempate: Ordem Alfabética</div>`);
    addLogDivider();
  }

  if (currentSearch.finalizado) {
    addLogEntry('warning', '<div class="log-entry-header"><i data-lucide="alert-circle"></i> Busca já finalizada. Clique em Reset para reiniciar.</div>');
    return;
  }

  isRunning = true;
  const passo = currentSearch.step();
  stepCounter++;

  if (passo) {
    await animateStep(passo, animationSpeed);
    logStep(stepCounter, passo);

    if (currentSearch.finalizado && currentSearch.encontrou) {
      const resultados = currentSearch.getResultados();
      displayResults(resultados);
      updateDashboardSummary(resultados);
      addLogDivider();
      addLogEntry('success', `<div class="log-entry-header"><i data-lucide="flag"></i> Caminho encontrado!</div>`);
      await sleep(400);
      await animatePath(resultados.caminho, 300);

      if (currentHeuristic === 'original') {
        resultadoOriginal = resultados;
      } else {
        resultadoModificado = resultados;
      }
    }
  }

  isRunning = false;
}

function resetAll() {
  currentSearch = null;
  stepCounter = 0;
  isRunning = false;

  initGraph(currentHeuristic === 'original' ? 'original' : 'modified');

  clearLog();
  clearResults();
  updateDashboardSummary();
  setButtonsEnabled(true, false);

  addLogEntry('info', '<div class="log-entry-header"><i data-lucide="refresh-cw"></i> Sistema resetado. Pronto para nova execução.</div>');
}

async function runComparison() {
  if (isRunning) return;
  isRunning = true;
  setButtonsEnabled(false, false);

  clearLog();
  addLogEntry('info', '<div class="log-entry-header"><i data-lucide="microscope"></i> Modo Comparação: Executando ambas heurísticas...</div>');
  addLogDivider();

  addLogEntry('info', '<div class="log-entry-header"><i data-lucide="folder-git-2"></i> EXECUÇÃO 1: Heurística Original</div>');
  
  initGraph('original');
  const search1 = new HeuristicSearch(HEURISTICS_ORIGINAL, ESTADO_INICIAL, ESTADO_OBJETIVO);
  let step1 = 0;
  
  while (!search1.finalizado) {
    const passo = search1.step();
    step1++;
    if (passo) {
      await animateStep(passo, animationSpeed / 2);
      await sleep(animationSpeed / 2);
      logStep(step1, passo);
    }
  }
  
  resultadoOriginal = search1.getResultados();
  if (resultadoOriginal.encontrou) {
    await animatePath(resultadoOriginal.caminho, 200);
  }

  addLogDivider();
  await sleep(1000);

  addLogEntry('info', '<div class="log-entry-header"><i data-lucide="folder-search-2"></i> EXECUÇÃO 2: Heurística Modificada</div>');
  
  initGraph('modified');
  const search2 = new HeuristicSearch(HEURISTICS_MODIFIED, ESTADO_INICIAL, ESTADO_OBJETIVO);
  let step2 = 0;
  
  while (!search2.finalizado) {
    const passo = search2.step();
    step2++;
    if (passo) {
      await animateStep(passo, animationSpeed / 2);
      await sleep(animationSpeed / 2);
      logStep(step2, passo);
    }
  }
  
  resultadoModificado = search2.getResultados();
  if (resultadoModificado.encontrou) {
    await animatePath(resultadoModificado.caminho, 200);
  }

  addLogDivider();
  displayComparison(resultadoOriginal, resultadoModificado);
  const comparisonSummary = resultadoModificado || resultadoOriginal;
  if (comparisonSummary) updateDashboardSummary(comparisonSummary);

  isRunning = false;
  setButtonsEnabled(true, false);
}

function clearLog() {
  const log = document.getElementById('log-content');
  if (log) log.innerHTML = '';
}

function addLogEntry(type, message) {
  const log = document.getElementById('log-content');
  if (!log) return;

  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = message;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  lucide.createIcons();
}

function addLogDivider() {
  addLogEntry('divider', '<hr class="log-divider">');
}

function logStep(number, passo) {
  if (passo.tipo === 'falha') {
    addLogEntry('error', `<div class="log-entry-header"><i data-lucide="x-circle"></i> ${passo.mensagem}</div>`);
    return;
  }

  if (passo.tipo === 'sucesso') {
    addLogEntry('success', `
      <div class="step-header">Passo ${number}</div>
      <div class="step-detail"><i data-lucide="check-circle"></i> ${passo.mensagem}</div>
      <div class="step-detail"><i data-lucide="route"></i> Caminho: <strong>${passo.caminho.join(' → ')}</strong></div>
    `);
    return;
  }

  const novosStr = passo.novosEstados.length > 0
    ? passo.novosEstados.map(n => `<span class="tag tag-new"><i data-lucide="plus"></i> ${n.estado} h=${n.h}</span>`).join(' ')
    : '<span class="tag tag-none">nenhum</span>';

  const abertosStr = passo.abertosAtuais.length > 0
    ? passo.abertosAtuais.map((a, i) => {
        const isNext = i === 0;
        return `<span class="tag ${isNext ? 'tag-next' : 'tag-open'}"><i data-lucide="${isNext ? 'star' : 'clock'}"></i> ${a.estado} h=${a.h}</span>`;
      }).join(' ')
    : '<span class="tag tag-none">nenhum</span>';

  const proximoStr = passo.proximoEscolhido
    ? `<strong class="next-chosen"><i data-lucide="arrow-right-circle"></i> ${passo.proximoEscolhido}</strong>`
    : '<em>—</em>';

  addLogEntry('step', `
    <div class="step-header">Passo ${number}</div>
    <div class="step-detail">
      <span class="label">Expandido:</span>
      <span class="tag tag-expanding">${getEstadoIcon(passo.estadoExpandido)} ${passo.estadoExpandido} (h=${passo.hEstadoExpandido})</span>
    </div>
    <div class="step-detail">
      <span class="label">Novos estados:</span> ${novosStr}
    </div>
    <div class="step-detail">
      <span class="label">Disponíveis:</span> ${abertosStr}
    </div>
    <div class="step-detail">
      <span class="label">Próximo escolhido:</span> ${proximoStr}
    </div>
  `);
}

function clearResults() {
  const container = document.getElementById('results-content');
  if (container) container.innerHTML = '<p class="placeholder"><i data-lucide="ghost"></i> Execute a busca para ver os resultados.</p>';
  lucide.createIcons();
}

function displayResults(resultados) {
  const container = document.getElementById('results-content');
  if (!container) return;

  const caminhoStr = resultados.encontrou
    ? resultados.caminho.map(e => `<span class="path-node">${getEstadoIcon(e)} ${e}</span>`).join('<span class="path-arrow"><i data-lucide="arrow-right"></i></span>')
    : '<span class="error">Caminho não encontrado</span>';

  container.innerHTML = `
    <div class="results-grid">
      <div class="result-card">
        <div class="result-label">Origem</div>
        <div class="result-value">${getEstadoIcon(resultados.origem)} ${resultados.origem}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Destino</div>
        <div class="result-value">${getEstadoIcon(resultados.destino)} ${resultados.destino}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Estados Visitados</div>
        <div class="result-value result-number">${resultados.quantidadeVisitados}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Estados Expandidos</div>
        <div class="result-value result-number">${resultados.quantidadeExpandidos}</div>
      </div>
      <div class="result-card full-width">
        <div class="result-label">Caminho Encontrado</div>
        <div class="result-path">${caminhoStr}</div>
      </div>
      <div class="result-card full-width">
        <div class="result-label">Ordem de Visita</div>
        <div class="result-path">${resultados.ordemVisita.map(e => `<span class="visit-node">${e}</span>`).join('<span class="path-arrow"><i data-lucide="arrow-right"></i></span>')}</div>
      </div>
      <div class="result-card full-width">
        <div class="result-label">Ordem de Expansão</div>
        <div class="result-path">${resultados.ordemExpansao.map(e => `<span class="expand-node">${e}</span>`).join('<span class="path-arrow"><i data-lucide="arrow-right"></i></span>')}</div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function displayComparison(res1, res2) {
  if (!res1 || !res2) {
    addLogEntry('warning', '<div class="log-entry-header"><i data-lucide="alert-triangle"></i> Execute ambas as heurísticas antes de comparar.</div>');
    return;
  }

  const container = document.getElementById('comparison-content');
  if (!container) return;

  const caminho1 = res1.encontrou ? res1.caminho.join(' → ') : 'Não encontrado';
  const caminho2 = res2.encontrou ? res2.caminho.join(' → ') : 'Não encontrado';
  const visita1 = res1.ordemVisita.join(' → ');
  const visita2 = res2.ordemVisita.join(' → ');

  const caminhoMudou = caminho1 !== caminho2;
  const visitaMudou = visita1 !== visita2;
  const qtdVisitMudou = res1.quantidadeVisitados !== res2.quantidadeVisitados;
  const qtdExpMudou = res1.quantidadeExpandidos !== res2.quantidadeExpandidos;

  container.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Critério</th>
          <th>Heurística Original</th>
          <th>Heurística Modificada</th>
          <th>Mudou?</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Caminho encontrado</td>
          <td>${caminho1}</td>
          <td>${caminho2}</td>
          <td>${caminhoMudou ? '<span class="badge badge-yes"><i data-lucide="check"></i> Sim</span>' : '<span class="badge badge-no"><i data-lucide="minus"></i> Não</span>'}</td>
        </tr>
        <tr>
          <td>Ordem de visita</td>
          <td>${visita1}</td>
          <td>${visita2}</td>
          <td>${visitaMudou ? '<span class="badge badge-yes"><i data-lucide="check"></i> Sim</span>' : '<span class="badge badge-no"><i data-lucide="minus"></i> Não</span>'}</td>
        </tr>
        <tr>
          <td>Qtd. estados visitados</td>
          <td>${res1.quantidadeVisitados}</td>
          <td>${res2.quantidadeVisitados}</td>
          <td>${qtdVisitMudou ? '<span class="badge badge-yes"><i data-lucide="check"></i> Sim</span>' : '<span class="badge badge-no"><i data-lucide="minus"></i> Não</span>'}</td>
        </tr>
        <tr>
          <td>Qtd. estados expandidos</td>
          <td>${res1.quantidadeExpandidos}</td>
          <td>${res2.quantidadeExpandidos}</td>
          <td>${qtdExpMudou ? '<span class="badge badge-yes"><i data-lucide="check"></i> Sim</span>' : '<span class="badge badge-no"><i data-lucide="minus"></i> Não</span>'}</td>
        </tr>
      </tbody>
    </table>

    <div class="analysis-box">
      <h4><i data-lucide="bar-chart-2"></i> Análise Comparativa</h4>
      <ul>
        <li><i data-lucide="info"></i> <strong>Ordem de visita:</strong> ${visitaMudou 
          ? 'A ordem mudou significativamente, indicando que a heurística modificada direcionou a busca para uma região diferente do grafo.' 
          : 'A ordem permaneceu igual, indicando que as alterações não foram suficientes para mudar o comportamento.'}</li>
        <li><i data-lucide="info"></i> <strong>Caminho encontrado:</strong> ${caminhoMudou 
          ? 'O caminho final mudou, demonstrando que a heurística pode conduzir a soluções diferentes mesmo com o mesmo grafo.' 
          : 'O caminho final permaneceu o mesmo, embora a ordem de exploração possa ter variado.'}</li>
        <li><i data-lucide="info"></i> <strong>Eficiência:</strong> ${qtdVisitMudou || qtdExpMudou
          ? `A heurística ${res1.quantidadeVisitados <= res2.quantidadeVisitados ? 'original' : 'modificada'} foi mais eficiente, visitando ${Math.min(res1.quantidadeVisitados, res2.quantidadeVisitados)} estados contra ${Math.max(res1.quantidadeVisitados, res2.quantidadeVisitados)}.`
          : 'Ambas tiveram a mesma eficiência em termos de estados visitados.'}</li>
        <li><i data-lucide="info"></i> <strong>Direcionamento:</strong> ${visitaMudou 
          ? 'A heurística modificada, ao reduzir o h(n) do Centro e Shopping (tornando-os mais atrativos) e aumentar o h(n) do Parque, direcionou a busca para o caminho enganoso antes de encontrar a rota correta.'
          : 'As modificações não alteraram significativamente o direcionamento da busca.'}</li>
      </ul>
    </div>
  `;

  lucide.createIcons();
  
  document.getElementById('comparison-section').scrollIntoView({ behavior: 'smooth' });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setButtonsEnabled(enabled, showStop) {
  document.getElementById('btn-auto').disabled = !enabled;
  document.getElementById('btn-step').disabled = !enabled;
  document.getElementById('btn-compare').disabled = !enabled;
}
