class HeuristicSearch {
  constructor(heuristics, inicio, objetivo) {
    this.heuristics = heuristics;
    this.inicio = inicio;
    this.objetivo = objetivo;

    this.abertos = [];

    this.visitados = new Set();

    this.predecessores = {};

    this.ordemVisita = [];

    this.ordemExpansao = [];

    this.historico = [];

    this.finalizado = false;
    this.encontrou = false;
    this.caminhoFinal = [];

    this.abertos.push({
      estado: this.inicio,
      h: this.heuristics[this.inicio],
    });
  }

  getH(estado) {
    return this.heuristics[estado] ?? Infinity;
  }

  sortAbertos() {
    this.abertos.sort((a, b) => {
      if (a.h !== b.h) return a.h - b.h;
      return a.estado.localeCompare(b.estado);
    });
  }

  step() {
    if (this.finalizado) return null;

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

    this.sortAbertos();
    const current = this.abertos.shift();
    const estadoAtual = current.estado;

    this.visitados.add(estadoAtual);
    this.ordemVisita.push(estadoAtual);

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

    const vizinhos = getVizinhos(estadoAtual);
    const novosEstados = [];
    this.ordemExpansao.push(estadoAtual);

    for (const vizinho of vizinhos) {
      if (!this.visitados.has(vizinho)) {
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

    this.sortAbertos();
    const abertosSnapshot = this.abertos.map(item => ({
      estado: item.estado,
      h: item.h,
    }));

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

  run() {
    while (!this.finalizado) {
      this.step();
    }

    return this.getResultados();
  }

  reconstruirCaminho(estado) {
    const caminho = [estado];
    let atual = estado;

    while (this.predecessores[atual] !== undefined) {
      atual = this.predecessores[atual];
      caminho.unshift(atual);
    }

    return caminho;
  }

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
