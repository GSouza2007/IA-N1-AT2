// Define o ponto de partida e o destino usados em todas as execuções.
const ESTADO_INICIAL = 'Base';
const ESTADO_OBJETIVO = 'Hospital';

// Guarda as coordenadas fixas usadas pelo layout preset do Cytoscape.
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

// Valores da estimativa considerada coerente com a posição dos estados.
const HEURISTICS_ORIGINAL = {
  'Base': 18,
  'Rodoviária': 15,
  'Aeroporto': 14,
  'Centro': 10,
  'Estádio': 12,
  'Terminal': 11,
  'Parque': 7,
  'Shopping': 9,
  'Universidade': 5,
  'Praça': 6,
  'Ponte': 4,
  'Hospital': 0,
};

// Altera três valores para direcionar a busca por uma região diferente do grafo.
const HEURISTICS_MODIFIED = {
  'Base': 18,
  'Rodoviária': 15,
  'Aeroporto': 14,
  'Centro': 4,
  'Estádio': 12,
  'Terminal': 11,
  'Parque': 13,
  'Shopping': 3,
  'Universidade': 11,
  'Praça': 6,
  'Ponte': 4,
  'Hospital': 0,
};

// Lista de adjacência: cada estado aponta para os destinos diretamente acessíveis.
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

// Retorna os destinos de um estado ou uma lista vazia para estados desconhecidos.
function getVizinhos(estado) {
  return ADJACENCY_LIST[estado] || [];
}

// Retorna os nomes dos estados na ordem em que foram cadastrados no grafo.
function getAllEstados() {
  return Object.keys(ADJACENCY_LIST);
}

// Consulta a posição visual de um estado.
function getPosition(estado) {
  return NODE_POSITIONS[estado];
}

// Identifica se o estado recebido é o destino da busca.
function isObjetivo(estado) {
  return estado === ESTADO_OBJETIVO;
}

// Diferencia um beco sem saída do Hospital, que também não possui sucessores.
function isBecoSemSaida(estado) {
  return ADJACENCY_LIST[estado] && ADJACENCY_LIST[estado].length === 0 && estado !== ESTADO_OBJETIVO;
}

// Converte a lista de adjacência em pares de origem e destino para o Cytoscape.
function getAllEdges() {
  const edges = [];
  for (const [origem, vizinhos] of Object.entries(ADJACENCY_LIST)) {
    for (const destino of vizinhos) {
      edges.push([origem, destino]);
    }
  }
  return edges;
}

// Conta caminhos simples entre dois estados usando busca em profundidade.
function countPaths(start, end) {
  let count = 0;
  const visited = new Set();

  // Explora cada ramo sem repetir estados no caminho atual.
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
