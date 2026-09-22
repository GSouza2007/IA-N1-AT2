const ESTADO_INICIAL = 'Base';
const ESTADO_OBJETIVO = 'Hospital';

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

const HEURISTICS_MODIFIED = {
  'Base': 18,
  'Rodoviária': 15,
  'Aeroporto': 14,
  'Centro': 4,
  'Estádio': 12,
  'Terminal': 11,
  'Parque': 16,
  'Shopping': 3,
  'Universidade': 7,
  'Praça': 6,
  'Ponte': 4,
  'Hospital': 0,
};

const ADJACENCY_LIST = {
  'Base': ['Centro', 'Rodoviária', 'Parque'],
  'Centro': ['Aeroporto', 'Shopping'],
  'Rodoviária': ['Parque'],
  'Parque': ['Universidade', 'Estádio'],
  'Aeroporto': [],
  'Shopping': ['Terminal'],
  'Terminal': ['Praça'],
  'Universidade': ['Ponte'],
  'Estádio': ['Praça'],
  'Praça': ['Ponte'],
  'Ponte': ['Hospital'],
  'Hospital': [],
};

function getVizinhos(estado) {
  return ADJACENCY_LIST[estado] || [];
}

function getAllEstados() {
  return Object.keys(ADJACENCY_LIST);
}

function getPosition(estado) {
  return NODE_POSITIONS[estado];
}

function isObjetivo(estado) {
  return estado === ESTADO_OBJETIVO;
}

function isBecoSemSaida(estado) {
  return ADJACENCY_LIST[estado] && ADJACENCY_LIST[estado].length === 0 && estado !== ESTADO_OBJETIVO;
}

function getAllEdges() {
  const edges = [];
  for (const [origem, vizinhos] of Object.entries(ADJACENCY_LIST)) {
    for (const destino of vizinhos) {
      edges.push([origem, destino]);
    }
  }
  return edges;
}

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
