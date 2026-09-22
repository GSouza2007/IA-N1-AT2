/**
 * ============================================================
 * graph.js — Definição do Grafo da Cidade Fictícia
 * ============================================================
 * 
 * Representa a rede viária urbana com 12 estados e 16 conexões.
 * Cada estado possui:
 *   - nome contextualizado ao cenário urbano
 *   - posição (x, y) para layout visual
 *   - valor heurístico h(n) estimando distância ao Hospital
 * 
 * Critério heurístico: Distância Euclidiana Estimada (em blocos urbanos)
 *   Cada valor h(n) representa a distância em linha reta aproximada
 *   entre o estado e o Hospital Central na planta da cidade fictícia.
 *   Quanto mais distante geograficamente, maior o valor.
 * 
 * Requisitos atendidos:
 *   ✅ 12 estados (mínimo 10)
 *   ✅ 16 conexões (mínimo 14)
 *   ✅ 3+ caminhos distintos entre Base e Hospital
 *   ✅ 1 estado sem saída (Aeroporto)
 *   ✅ 1 caminho enganoso (Centro → Shopping → Terminal)
 *   ✅ h(n) = 0 para o objetivo (Hospital)
 *   ✅ Nomes urbanos contextualizados
 */

// ──────────────────────────────────────────────
// Estado Inicial e Objetivo
// ──────────────────────────────────────────────
const ESTADO_INICIAL = 'Base';
const ESTADO_OBJETIVO = 'Hospital';

// ──────────────────────────────────────────────
// Posições dos nós para o layout visual (Cytoscape)
// Coordenadas pensadas para simular uma planta urbana
// ──────────────────────────────────────────────
const NODE_POSITIONS = {
  'Base': { x: 100, y: 100 },
  'Centro': { x: 300, y: 80 },
  'Rodoviária': { x: 180, y: 250 },
  'Parque': { x: 100, y: 380 },
  'Aeroporto': { x: 500, y: 30 },
  'Shopping': { x: 500, y: 170 },
  'Terminal': { x: 620, y: 310 },
  'Universidade': { x: 300, y: 400 },
  'Estádio': { x: 100, y: 540 },
  'Praça': { x: 300, y: 570 },
  'Ponte': { x: 500, y: 480 },
  'Hospital': { x: 680, y: 560 },
};

// ──────────────────────────────────────────────
// Heurística ORIGINAL — h(n)
// Distância euclidiana estimada em blocos urbanos
// ──────────────────────────────────────────────
const HEURISTICS_ORIGINAL = {
  'Base': 18,
  'Rodoviária': 15,
  'Aeroporto': 14,
  'Centro': 13,
  'Estádio': 12,
  'Terminal': 11,
  'Parque': 10,
  'Shopping': 9,
  'Universidade': 7,
  'Praça': 6,
  'Ponte': 4,
  'Hospital': 0,
};

// ──────────────────────────────────────────────
// Heurística MODIFICADA — para o experimento
// Altera propositalmente alguns valores para
// observar mudança no comportamento da busca.
// 
// Mudanças:
//   Centro:   13 → 4   (torna Centro muito atrativo)
//   Shopping:  9 → 3   (reforça caminho enganoso)
//   Parque:   10 → 16  (afasta busca do caminho direto)
// ──────────────────────────────────────────────
const HEURISTICS_MODIFIED = {
  'Base': 18,
  'Rodoviária': 15,
  'Aeroporto': 14,
  'Centro': 4,   // era 13
  'Estádio': 12,
  'Terminal': 11,
  'Parque': 16,   // era 10
  'Shopping': 3,   // era 9
  'Universidade': 7,
  'Praça': 6,
  'Ponte': 4,
  'Hospital': 0,
};

// ──────────────────────────────────────────────
// Lista de Adjacências — Conexões do Grafo
// Cada chave é um estado, e o valor é um array
// com os vizinhos acessíveis a partir dele.
// 
// Total: 16 conexões (arestas direcionadas)
// ──────────────────────────────────────────────
const ADJACENCY_LIST = {
  'Base': ['Centro', 'Rodoviária', 'Parque'],
  'Centro': ['Aeroporto', 'Shopping'],
  'Rodoviária': ['Parque'],
  'Parque': ['Universidade', 'Estádio'],
  'Aeroporto': [],  // ← SEM SAÍDA
  'Shopping': ['Terminal'],
  'Terminal': ['Praça'],
  'Universidade': ['Ponte'],
  'Estádio': ['Praça'],
  'Praça': ['Ponte'],
  'Ponte': ['Hospital'],
  'Hospital': [],  // ← OBJETIVO
};

// ──────────────────────────────────────────────
// Funções auxiliares de acesso ao grafo
// ──────────────────────────────────────────────

/**
 * Retorna os vizinhos de um estado.
 * @param {string} estado - Nome do estado
 * @returns {string[]} Lista de vizinhos
 */
function getVizinhos(estado) {
  return ADJACENCY_LIST[estado] || [];
}

/**
 * Retorna todos os nomes de estados do grafo.
 * @returns {string[]}
 */
function getAllEstados() {
  return Object.keys(ADJACENCY_LIST);
}

/**
 * Retorna a posição (x, y) de um estado.
 * @param {string} estado
 * @returns {{x: number, y: number}}
 */
function getPosition(estado) {
  return NODE_POSITIONS[estado];
}

/**
 * Verifica se um estado é o objetivo.
 * @param {string} estado
 * @returns {boolean}
 */
function isObjetivo(estado) {
  return estado === ESTADO_OBJETIVO;
}

/**
 * Verifica se um estado é um beco sem saída.
 * @param {string} estado
 * @returns {boolean}
 */
function isBecoSemSaida(estado) {
  return ADJACENCY_LIST[estado] && ADJACENCY_LIST[estado].length === 0 && estado !== ESTADO_OBJETIVO;
}

/**
 * Retorna todas as arestas do grafo como pares [origem, destino].
 * @returns {Array<[string, string]>}
 */
function getAllEdges() {
  const edges = [];
  for (const [origem, vizinhos] of Object.entries(ADJACENCY_LIST)) {
    for (const destino of vizinhos) {
      edges.push([origem, destino]);
    }
  }
  return edges;
}

/**
 * Conta caminhos distintos entre dois estados usando DFS.
 * Usado para verificar o requisito de ≥ 3 caminhos.
 * @param {string} start
 * @param {string} end
 * @returns {number}
 */
function countPaths(start, end) {
  let count = 0;
  const visited = new Set();

  function dfs(current) {
    if (current === end) {
      count++;
      return;
    }
    visited.add(current);
    for (const neighbor of getVizinhos(current)) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }
    visited.delete(current);
  }

  dfs(start);
  return count;
}
