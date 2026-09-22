/**
 * ============================================================
 * visualization.js — Renderização do Grafo com Cytoscape.js
 * ============================================================
 *
 * Responsável por:
 *   - Inicializar a instância Cytoscape com o grafo definido
 *   - Aplicar estilos visuais diferenciados por tipo de nó
 *   - Animar expansões, visitas e descoberta de caminhos
 *   - Exibir h(n) como label nos nós
 *   - Destacar o caminho final encontrado
 */

let cy = null; // Instância global do Cytoscape

/**
 * Inicializa o Cytoscape.js no container especificado.
 * @param {string} containerId - ID do elemento HTML container
 * @param {Object} heuristics - Mapa { estado: h(n) } ativo
 */
function initCytoscape(containerId, heuristics) {
  const container = document.getElementById(containerId);

  // Montar nós
  const nodes = getAllEstados().map(estado => ({
    data: {
      id: estado,
      label: `${estado}\nh=${heuristics[estado]}`,
      h: heuristics[estado],
      isInicio: estado === ESTADO_INICIAL,
      isObjetivo: estado === ESTADO_OBJETIVO,
      isBeco: isBecoSemSaida(estado),
    },
    position: getPosition(estado),
  }));

  // Montar arestas
  const edges = getAllEdges().map(([src, tgt], i) => ({
    data: {
      id: `e${i}-${src}-${tgt}`,
      source: src,
      target: tgt,
    },
  }));

  // Destruir instância anterior se existir
  if (cy) {
    cy.destroy();
  }

  cy = cytoscape({
    container: container,
    elements: { nodes, edges },
    
    // Layout preset (posições manuais definidas)
    layout: { name: 'preset' },

    // Interação
    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,

    // Estilos dos elementos
    style: [
      // ── Estilo base dos nós ──
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-wrap': 'wrap',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-family': '"Outfit", sans-serif',
          'font-size': '12px',
          'font-weight': '700',
          'color': '#0f172a',
          'width': '75px',
          'height': '75px',
          'background-color': '#ffffff',
          'border-width': '0px',
          'shape': 'round-rectangle',
          'corner-radius': '20px',
          'transition-property': 'background-color, width, height, border-width, border-color',
          'transition-duration': '0.3s',
        },
      },

      // ── Estado inicial (Base) ──
      {
        selector: 'node[?isInicio]',
        style: {
          'background-color': '#bfdbfe',
          'border-width': '3px',
          'border-color': '#3b82f6',
          'color': '#1e3a8a',
        },
      },

      // ── Estado objetivo (Hospital) ──
      {
        selector: 'node[?isObjetivo]',
        style: {
          'background-color': '#d1fae5',
          'border-width': '3px',
          'border-color': '#10b981',
          'color': '#064e3b',
        },
      },

      // ── Beco sem saída (Aeroporto) ──
      {
        selector: 'node[?isBeco]',
        style: {
          'background-color': '#fee2e2',
          'border-width': '3px',
          'border-color': '#ef4444',
          'color': '#7f1d1d',
        },
      },

      // ── Estado sendo expandido atualmente ──
      {
        selector: 'node.expanding',
        style: {
          'background-color': '#e9d5ff',
          'border-width': '4px',
          'border-color': '#a855f7',
          'width': '85px',
          'height': '85px',
        },
      },

      // ── Estado visitado (já processado) ──
      {
        selector: 'node.visited',
        style: {
          'background-color': '#f1f5f9',
          'color': '#94a3b8',
          'border-width': '2px',
          'border-color': '#cbd5e1',
        },
      },

      // ── Estado na lista de abertos (disponível) ──
      {
        selector: 'node.open',
        style: {
          'background-color': '#fef3c7',
          'border-width': '3px',
          'border-color': '#f59e0b',
          'color': '#92400e',
        },
      },

      // ── Novo estado descoberto (flash) ──
      {
        selector: 'node.discovered',
        style: {
          'background-color': '#bae6fd',
          'border-width': '3px',
          'border-color': '#0ea5e9',
          'width': '80px',
          'height': '80px',
        },
      },

      // ── Nó no caminho final ──
      {
        selector: 'node.path',
        style: {
          'background-color': '#fbcfe8',
          'border-width': '4px',
          'border-color': '#ec4899',
          'color': '#831843',
          'width': '85px',
          'height': '85px',
        },
      },

      // ── Estilo base das arestas ──
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#cbd5e1',
          'target-arrow-color': '#cbd5e1',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 1.2,
          'transition-property': 'line-color, target-arrow-color, width',
          'transition-duration': '0.3s',
        },
      },

      // ── Aresta sendo explorada ──
      {
        selector: 'edge.exploring',
        style: {
          'width': 5,
          'line-color': '#c084fc',
          'target-arrow-color': '#c084fc',
        },
      },

      // ── Aresta no caminho final ──
      {
        selector: 'edge.path',
        style: {
          'width': 6,
          'line-color': '#ec4899',
          'target-arrow-color': '#ec4899',
          'arrow-scale': 1.6,
        },
      },
    ],
  });

  // Ajustar visualização
  cy.fit(undefined, 40);
}

/**
 * Reseta todos os estilos visuais dos nós e arestas.
 */
function resetVisualization() {
  if (!cy) return;
  cy.nodes().removeClass('expanding visited open discovered path');
  cy.edges().removeClass('exploring path');
  cy.nodes().style('opacity', 1);
}

/**
 * Atualiza os labels dos nós com novos valores heurísticos.
 * @param {Object} heuristics - Mapa { estado: h(n) }
 */
function updateHeuristicLabels(heuristics) {
  if (!cy) return;
  cy.nodes().forEach(node => {
    const estado = node.id();
    node.data('label', `${estado}\nh=${heuristics[estado]}`);
    node.data('h', heuristics[estado]);
  });
}

/**
 * Anima um passo da busca no grafo.
 * @param {Object} passo - Detalhes do passo (retornado por search.step())
 * @param {number} delay - Delay da animação em ms
 * @returns {Promise} Resolve quando a animação terminar
 */
function animateStep(passo, delay = 600) {
  return new Promise(resolve => {
    if (!cy || !passo) {
      resolve();
      return;
    }

    // Limpar classe 'expanding' e 'discovered' anteriores
    cy.nodes().removeClass('expanding discovered');

    // Marcar todos os visitados
    for (const v of passo.visitados) {
      const node = cy.getElementById(v);
      if (node && !node.data('isObjetivo') && !node.data('isInicio')) {
        node.addClass('visited');
      }
    }

    // Marcar estado expandido
    if (passo.estadoExpandido) {
      const expandNode = cy.getElementById(passo.estadoExpandido);
      if (expandNode) {
        expandNode.removeClass('visited open');
        expandNode.addClass('expanding');
      }
    }

    // Animar arestas exploradas e novos estados
    setTimeout(() => {
      if (passo.novosEstados) {
        for (const novo of passo.novosEstados) {
          // Marcar aresta
          const edgeId = cy.edges().filter(e =>
            e.data('source') === passo.estadoExpandido &&
            e.data('target') === novo.estado
          );
          edgeId.addClass('exploring');

          // Marcar novo nó
          const node = cy.getElementById(novo.estado);
          if (node) {
            node.addClass('discovered');
          }
        }
      }

      // Marcar todos os abertos
      setTimeout(() => {
        cy.nodes().removeClass('discovered');
        if (passo.abertosAtuais) {
          for (const aberto of passo.abertosAtuais) {
            const node = cy.getElementById(aberto.estado);
            if (node && !node.hasClass('expanding')) {
              node.removeClass('visited');
              node.addClass('open');
            }
          }
        }
        resolve();
      }, delay / 2);
    }, delay / 2);
  });
}

/**
 * Anima o caminho final encontrado.
 * @param {string[]} caminho - Lista de estados do caminho
 * @param {number} delay - Delay entre cada nó
 * @returns {Promise}
 */
function animatePath(caminho, delay = 400) {
  return new Promise(async resolve => {
    if (!cy || !caminho || caminho.length === 0) {
      resolve();
      return;
    }

    // Limpar estados anteriores
    cy.nodes().removeClass('expanding open discovered');

    // Animar nó por nó
    for (let i = 0; i < caminho.length; i++) {
      const node = cy.getElementById(caminho[i]);
      if (node) {
        node.removeClass('visited');
        node.addClass('path');
      }

      // Animar aresta entre nós consecutivos
      if (i > 0) {
        const edge = cy.edges().filter(e =>
          e.data('source') === caminho[i - 1] &&
          e.data('target') === caminho[i]
        );
        edge.addClass('path');
      }

      await new Promise(r => setTimeout(r, delay));
    }

    resolve();
  });
}
