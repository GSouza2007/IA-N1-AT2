class HeuristicSearch {
  constructor(heuristics, inicio, objetivo) {
    // Recebe a heurística e identifica os extremos da rota atual.
    this.heuristics = heuristics;
    this.inicio = inicio;
    this.objetivo = objetivo;

    // Estados que aguardam seleção pelo algoritmo.
    this.abertos = [];

    // Estados já retirados da lista aberta e processados.
    this.visitados = new Set();

    // Relaciona cada estado descoberto ao estado que o encontrou.
    this.predecessores = {};

    // Registra a ordem em que os estados foram selecionados.
    this.ordemVisita = [];

    // Registra somente os estados cujos vizinhos foram expandidos.
    this.ordemExpansao = [];

    // Mantém um retrato de cada passo para o log e a animação.
    this.historico = [];

    // Flags usadas para encerrar a busca e informar seu resultado.
    this.finalizado = false;
    this.encontrou = false;
    this.caminhoFinal = [];

    // A busca começa com a origem na lista de candidatos.
    this.abertos.push({
      estado: this.inicio,
      h: this.heuristics[this.inicio],
    });
  }

  getH(estado) {
    // Estados sem valor definido ficam no fim da ordenação.
    return this.heuristics[estado] ?? Infinity;
  }

  sortAbertos() {
    // A busca gulosa prioriza o menor h(n), com desempate determinístico.
    this.abertos.sort((a, b) => {
      if (a.h !== b.h) return a.h - b.h;
      return a.estado.localeCompare(b.estado);
    });
  }

  step() {
    // Cada chamada avança exatamente uma decisão do algoritmo.
    if (this.finalizado) return null;

    // Sem candidatos restantes, não existe caminho a explorar.
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

    // O menor h(n) vira o próximo estado atual.
    this.sortAbertos();
    const current = this.abertos.shift();
    const estadoAtual = current.estado;

    // Retirar da lista aberta transforma o estado em visitado.
    this.visitados.add(estadoAtual);
    this.ordemVisita.push(estadoAtual);

    // O objetivo encerra a execução antes de expandir seus vizinhos.
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

    // Estados ainda não conhecidos entram na lista de candidatos.
    const vizinhos = getVizinhos(estadoAtual);
    const novosEstados = [];
    this.ordemExpansao.push(estadoAtual);

    for (const vizinho of vizinhos) {
      if (!this.visitados.has(vizinho)) {
        // Evita duplicar estados que já aguardam processamento.
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

    // O snapshot permite mostrar ao usuário a próxima decisão prevista.
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
    // Executa passos até alcançar o objetivo ou esvaziar a lista aberta.
    while (!this.finalizado) {
      this.step();
    }

    return this.getResultados();
  }

  reconstruirCaminho(estado) {
    // Volta pelos predecessores e monta a rota na ordem origem-destino.
    const caminho = [estado];
    let atual = estado;

    while (this.predecessores[atual] !== undefined) {
      atual = this.predecessores[atual];
      caminho.unshift(atual);
    }

    return caminho;
  }

  getResultados() {
    // Expõe uma cópia dos dados para a interface sem compartilhar coleções internas.
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
