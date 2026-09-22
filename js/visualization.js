let cy = null;

// Cria ou recria a instância visual usando a heurística selecionada.
function initCytoscape(containerId, heuristics) {
  const container = document.getElementById(containerId);

  // Os nós usam as posições definidas no grafo para preservar o mapa urbano.
  // Cada nó também recebe flags que permitem aplicar estilos específicos.
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

  // As arestas preservam a direção da lista de adjacência.
  const edges = getAllEdges().map(([src, tgt], i) => ({
    data: {
      id: `e${i}-${src}-${tgt}`,
      source: src,
      target: tgt,
    },
  }));

  // Evita manter uma instância antiga quando a heurística é trocada.
  if (cy) {
    cy.destroy();
  }

  cy = cytoscape({
    container: container,
    elements: { nodes, edges },
    
    // Permite explorar o mapa sem alterar as posições calculadas.
    layout: { name: 'preset' },

    // Desabilita seleção por caixa, mantendo zoom e deslocamento disponíveis.
    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,

    // Classes visuais representam a situação de cada nó durante a busca.
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
  // Remove todas as classes temporárias e restaura a opacidade dos elementos.
  if (!cy) return;
  cy.nodes().removeClass('expanding visited open discovered path');
  cy.edges().removeClass('exploring path');
  cy.nodes().style('opacity', 1);
}

function updateHeuristicLabels(heuristics) {
  // Atualiza os textos dos nós sem reconstruir o grafo inteiro.
  if (!cy) return;
  cy.nodes().forEach(node => {
    const estado = node.id();
    node.data('label', `${estado}\nh=${heuristics[estado]}`);
    node.data('h', heuristics[estado]);
  });
}

function animateStep(passo, delay = 600) {
  // Sincroniza o estado lógico de um passo com a aparência do mapa.
  return new Promise(resolve => {
    if (!cy || !passo) {
      resolve();
      return;
    }

    // Limpa apenas os destaques transitórios da etapa anterior.
    cy.nodes().removeClass('expanding discovered');

    // Estados processados ficam visualmente marcados como visitados.
    for (const v of passo.visitados) {
      const node = cy.getElementById(v);
      if (node && !node.data('isObjetivo') && !node.data('isInicio')) {
        node.addClass('visited');
      }
    }

    // O estado selecionado recebe destaque durante sua expansão.
    if (passo.estadoExpandido) {
      const expandNode = cy.getElementById(passo.estadoExpandido);
      if (expandNode) {
        expandNode.removeClass('visited open');
        expandNode.addClass('expanding');
      }
    }

    // A primeira metade do atraso mostra novas arestas e descobertas.
    setTimeout(() => {
      if (passo.novosEstados) {
        for (const novo of passo.novosEstados) {
          // A aresta indica de onde o novo estado foi descoberto.
          const edgeId = cy.edges().filter(e =>
            e.data('source') === passo.estadoExpandido &&
            e.data('target') === novo.estado
          );
          edgeId.addClass('exploring');

          // O nó recém-encontrado recebe um destaque temporário.
          const node = cy.getElementById(novo.estado);
          if (node) {
            node.addClass('discovered');
          }
        }
      }

      // A segunda metade mostra a lista aberta atualizada.
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
  // Destaca gradualmente a rota reconstruída após o objetivo ser encontrado.
  return new Promise(async resolve => {
    if (!cy || !caminho || caminho.length === 0) {
      resolve();
      return;
    }

    // Remove marcas de exploração antes de iniciar o caminho final.
    cy.nodes().removeClass('expanding open discovered');

    for (let i = 0; i < caminho.length; i++) {
      // Cada nó da rota fica destacado na sequência correta.
      const node = cy.getElementById(caminho[i]);
      if (node) {
        node.removeClass('visited');
        node.addClass('path');
      }

      // A ligação entre dois nós consecutivos também recebe destaque.
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
