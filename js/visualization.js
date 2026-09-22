let cy = null;

function initCytoscape(containerId, heuristics) {
  const container = document.getElementById(containerId);

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

  const edges = getAllEdges().map(([src, tgt], i) => ({
    data: {
      id: `e${i}-${src}-${tgt}`,
      source: src,
      target: tgt,
    },
  }));

  if (cy) {
    cy.destroy();
  }

  cy = cytoscape({
    container: container,
    elements: { nodes, edges },
    
    layout: { name: 'preset' },

    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,

    style: [
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

      {
        selector: 'node[?isInicio]',
        style: {
          'background-color': '#bfdbfe',
          'border-width': '3px',
          'border-color': '#3b82f6',
          'color': '#1e3a8a',
        },
      },

      {
        selector: 'node[?isObjetivo]',
        style: {
          'background-color': '#d1fae5',
          'border-width': '3px',
          'border-color': '#10b981',
          'color': '#064e3b',
        },
      },

      {
        selector: 'node[?isBeco]',
        style: {
          'background-color': '#fee2e2',
          'border-width': '3px',
          'border-color': '#ef4444',
          'color': '#7f1d1d',
        },
      },

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

      {
        selector: 'node.visited',
        style: {
          'background-color': '#f1f5f9',
          'color': '#94a3b8',
          'border-width': '2px',
          'border-color': '#cbd5e1',
        },
      },

      {
        selector: 'node.open',
        style: {
          'background-color': '#fef3c7',
          'border-width': '3px',
          'border-color': '#f59e0b',
          'color': '#92400e',
        },
      },

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

      {
        selector: 'edge.exploring',
        style: {
          'width': 5,
          'line-color': '#c084fc',
          'target-arrow-color': '#c084fc',
        },
      },

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

  cy.fit(undefined, 40);
}

function resetVisualization() {
  if (!cy) return;
  cy.nodes().removeClass('expanding visited open discovered path');
  cy.edges().removeClass('exploring path');
  cy.nodes().style('opacity', 1);
}

function updateHeuristicLabels(heuristics) {
  if (!cy) return;
  cy.nodes().forEach(node => {
    const estado = node.id();
    node.data('label', `${estado}\nh=${heuristics[estado]}`);
    node.data('h', heuristics[estado]);
  });
}

function animateStep(passo, delay = 600) {
  return new Promise(resolve => {
    if (!cy || !passo) {
      resolve();
      return;
    }

    cy.nodes().removeClass('expanding discovered');

    for (const v of passo.visitados) {
      const node = cy.getElementById(v);
      if (node && !node.data('isObjetivo') && !node.data('isInicio')) {
        node.addClass('visited');
      }
    }

    if (passo.estadoExpandido) {
      const expandNode = cy.getElementById(passo.estadoExpandido);
      if (expandNode) {
        expandNode.removeClass('visited open');
        expandNode.addClass('expanding');
      }
    }

    setTimeout(() => {
      if (passo.novosEstados) {
        for (const novo of passo.novosEstados) {
          const edgeId = cy.edges().filter(e =>
            e.data('source') === passo.estadoExpandido &&
            e.data('target') === novo.estado
          );
          edgeId.addClass('exploring');

          const node = cy.getElementById(novo.estado);
          if (node) {
            node.addClass('discovered');
          }
        }
      }

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

function animatePath(caminho, delay = 400) {
  return new Promise(async resolve => {
    if (!cy || !caminho || caminho.length === 0) {
      resolve();
      return;
    }

    cy.nodes().removeClass('expanding open discovered');

    for (let i = 0; i < caminho.length; i++) {
      const node = cy.getElementById(caminho[i]);
      if (node) {
        node.removeClass('visited');
        node.addClass('path');
      }

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
