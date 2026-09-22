/**
 * ============================================================
 * search.js — Algoritmo de Busca Heurística (Greedy Best-First Search)
 * ============================================================
 *
 * Implementa a Busca Heurística com as seguintes características:
 *   - Lista de estados abertos (disponíveis) com seleção por menor h(n)
 *   - Conjunto de estados visitados (fechados) para evitar ciclos
 *   - Registro de predecessores para reconstrução do caminho
 *   - Critério de desempate: ORDEM ALFABÉTICA
 *   - Log estruturado de cada passo da decisão
 *
 * O algoritmo NÃO segue rota fixa. As decisões são tomadas
 * dinamicamente durante a execução com base nos valores heurísticos.
 */

class HeuristicSearch {
  /**
   * @param {Object} heuristics - Mapa { estado: h(n) }
   * @param {string} inicio - Estado inicial
   * @param {string} objetivo - Estado objetivo
   */
  constructor(heuristics, inicio, objetivo) {
    this.heuristics = heuristics;
    this.inicio = inicio;
    this.objetivo = objetivo;

    // Lista de estados disponíveis (abertos) — cada item: { estado, h }
    this.abertos = [];

    // Conjunto de estados já visitados (fechados)
    this.visitados = new Set();

    // Mapa de predecessores: { estado: predecessor }
    this.predecessores = {};

    // Ordem de visita (todos os estados retirados de abertos)
    this.ordemVisita = [];

    // Ordem de expansão (estados cujos vizinhos foram explorados)
    this.ordemExpansao = [];

    // Histórico de passos para log passo a passo
    this.historico = [];

    // Estado atual do algoritmo
    this.finalizado = false;
    this.encontrou = false;
    this.caminhoFinal = [];

    // Adicionar estado inicial à lista de abertos
    this.abertos.push({
      estado: this.inicio,
      h: this.heuristics[this.inicio],
    });
  }

  /**
   * Retorna o valor heurístico de um estado.
   * @param {string} estado
   * @returns {number}
   */
  getH(estado) {
    return this.heuristics[estado] ?? Infinity;
  }

  /**
   * Ordena a lista de abertos por h(n) crescente.
   * Em caso de empate (mesmo h), desempata por ORDEM ALFABÉTICA.
   * 
   * Critério de desempate documentado:
   *   Quando dois ou mais estados possuem o mesmo valor h(n),
   *   o estado escolhido é aquele que vem primeiro na ordem
   *   alfabética (comparação lexicográfica do nome).
   */
  sortAbertos() {
    this.abertos.sort((a, b) => {
      if (a.h !== b.h) return a.h - b.h;
      return a.estado.localeCompare(b.estado); // desempate alfabético
    });
  }

  /**
   * Executa UM PASSO da busca heurística.
   * Retorna um objeto descrevendo o que aconteceu neste passo,
   * ou null se a busca já terminou.
   *
   * @returns {Object|null} Detalhes do passo executado
   */
  step() {
    if (this.finalizado) return null;

    // Se não há estados abertos, falha
    if (this.abertos.length === 0) {
      this.finalizado = true;
      const passo = {
        tipo: 'falha',
        mensagem: 'Não há mais estados disponíveis. Busca falhou.',
        estadoExpandido: null,
        novosEstados: [],
        abertosAtuais: [],
        proximoEscolhido: null,
        visitados: [...this.visitados],
      };
      this.historico.push(passo);
      return passo;
    }

    // Ordenar e selecionar o estado com menor h(n)
    this.sortAbertos();
    const current = this.abertos.shift();
    const estadoAtual = current.estado;

    // Marcar como visitado
    this.visitados.add(estadoAtual);
    this.ordemVisita.push(estadoAtual);

    // Verificar se é o objetivo
    if (isObjetivo(estadoAtual)) {
      this.finalizado = true;
      this.encontrou = true;
      this.caminhoFinal = this.reconstruirCaminho(estadoAtual);

      const passo = {
        tipo: 'sucesso',
        mensagem: `🎯 Objetivo encontrado: ${estadoAtual}`,
        estadoExpandido: estadoAtual,
        hEstadoExpandido: this.getH(estadoAtual),
        novosEstados: [],
        abertosAtuais: [],
        proximoEscolhido: null,
        visitados: [...this.visitados],
        caminho: this.caminhoFinal,
      };
      this.historico.push(passo);
      return passo;
    }

    // Expandir vizinhos
    const vizinhos = getVizinhos(estadoAtual);
    const novosEstados = [];
    this.ordemExpansao.push(estadoAtual);

    for (const vizinho of vizinhos) {
      if (!this.visitados.has(vizinho)) {
        // Verificar se já está na lista de abertos
        const jaAberto = this.abertos.some(item => item.estado === vizinho);
        if (!jaAberto) {
          this.abertos.push({
            estado: vizinho,
            h: this.getH(vizinho),
          });
          this.predecessores[vizinho] = estadoAtual;
          novosEstados.push({
            estado: vizinho,
            h: this.getH(vizinho),
          });
        }
      }
    }

    // Preparar snapshot dos abertos para o log
    this.sortAbertos();
    const abertosSnapshot = this.abertos.map(item => ({
      estado: item.estado,
      h: item.h,
    }));

    // Próximo estado que será escolhido (preview)
    const proximoEscolhido = abertosSnapshot.length > 0 ? abertosSnapshot[0].estado : null;

    const passo = {
      tipo: 'expansao',
      mensagem: `Expandindo: ${estadoAtual} (h=${this.getH(estadoAtual)})`,
      estadoExpandido: estadoAtual,
      hEstadoExpandido: this.getH(estadoAtual),
      novosEstados: novosEstados,
      abertosAtuais: abertosSnapshot,
      proximoEscolhido: proximoEscolhido,
      visitados: [...this.visitados],
      vizinhosTotal: vizinhos,
      vizinhosBloqueados: vizinhos.filter(v => this.visitados.has(v)),
    };

    this.historico.push(passo);
    return passo;
  }

  /**
   * Executa a busca completa de uma vez, retornando todos os passos.
   * @returns {Object} Resultado completo da busca
   */
  run() {
    while (!this.finalizado) {
      this.step();
    }

    return this.getResultados();
  }

  /**
   * Reconstrói o caminho da origem ao objetivo usando predecessores.
   * @param {string} estado - Estado final (objetivo)
   * @returns {string[]} Caminho da origem ao destino
   */
  reconstruirCaminho(estado) {
    const caminho = [estado];
    let atual = estado;

    while (this.predecessores[atual] !== undefined) {
      atual = this.predecessores[atual];
      caminho.unshift(atual);
    }

    return caminho;
  }

  /**
   * Retorna os resultados finais da busca.
   * @returns {Object}
   */
  getResultados() {
    return {
      origem: this.inicio,
      destino: this.objetivo,
      encontrou: this.encontrou,
      caminho: this.caminhoFinal,
      ordemVisita: [...this.ordemVisita],
      ordemExpansao: [...this.ordemExpansao],
      quantidadeVisitados: this.ordemVisita.length,
      quantidadeExpandidos: this.ordemExpansao.length,
      historico: [...this.historico],
      heuristics: { ...this.heuristics },
    };
  }
}
