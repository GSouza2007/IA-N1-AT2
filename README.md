# Rota de Emergência Urbana

Projeto acadêmico de Inteligência Artificial que apresenta, de forma visual e interativa, o funcionamento da **Greedy Best-First Search**. A aplicação simula o deslocamento de uma equipe de emergência entre uma Base de Atendimento e um Hospital Central em uma cidade fictícia.

O foco do projeto é tornar observável uma decisão que normalmente fica escondida no código: em cada etapa, qual estado parece mais promissor de acordo com a função heurística $h(n)$?

## Visão geral

A aplicação oferece:

- mapa interativo do grafo urbano;
- execução automática com animação;
- execução passo a passo;
- log dos estados expandidos, abertos e visitados;
- tabela com os valores das duas heurísticas;
- comparação entre a heurística original e uma versão propositalmente distorcida;
- reconstrução e destaque do caminho encontrado.

O cenário possui 12 estados, 16 conexões direcionadas, mais de um caminho possível até o destino, um estado sem saída e um caminho enganoso. Assim, é possível observar tanto uma execução eficiente quanto o efeito de uma estimativa ruim.

## Executar localmente

O projeto é estático e não exige instalação de dependências locais. As bibliotecas Cytoscape.js e Lucide são carregadas por CDN, portanto o navegador precisa de acesso à internet durante a execução.

### Abertura direta

Abra `index.html` em um navegador moderno, como Edge, Chrome ou Firefox.

### Servidor local

Um servidor local evita restrições de segurança do navegador e é a forma recomendada para desenvolvimento:

```bash
# Node.js
npx http-server . -p 8080

# Python
python -m http.server 8080
```

Depois, acesse `http://localhost:8080`.

## Usar a aplicação

1. Escolha `Original` ou `Modificada` no seletor de heurística.
2. Ajuste a velocidade da animação, se necessário.
3. Use `Executar Automático` para acompanhar a busca completa.
4. Use `Passo a Passo` para analisar uma decisão por vez.
5. Use `Reset` para limpar a execução atual.
6. Use `Comparar Heurísticas` para executar os dois experimentos e visualizar as diferenças.

Na busca gulosa, o próximo estado é escolhido pelo menor valor de $h(n)$ entre os estados disponíveis. Empates são resolvidos pela ordem alfabética do nome do estado. Como o algoritmo é guloso, ele não garante o caminho de menor custo em todos os grafos; a qualidade da heurística influencia diretamente o resultado.

## Organização do código

```text
.
├── index.html              # Estrutura da interface
├── css/
│   └── style.css           # Layout, tema e estados visuais
├── js/
│   ├── graph.js            # Estados, arestas, posições e heurísticas
│   ├── search.js           # Implementação da busca gulosa
│   ├── visualization.js    # Renderização e animação com Cytoscape.js
│   └── app.js              # Controles, logs e resultados
└── README.md
```

## Dados do experimento

**Origem:** Base<br>
**Destino:** Hospital<br>
**Algoritmo:** Greedy Best-First Search<br>
**Critério de seleção:** menor $h(n)$<br>
**Desempate:** ordem alfabética
**Grafo:** 12 estados e 16 arestas direcionadas

Na configuração original, a rota encontrada é:

```text
Base → Parque → Universidade → Ponte → Hospital
```

Na configuração modificada, a busca é atraída pelo caminho mais longo:

```text
Base → Centro → Shopping → Terminal → Praça → Ponte → Hospital
```

## Tecnologias

- HTML5 e CSS3;
- JavaScript ES6+;
- [Cytoscape.js](https://js.cytoscape.org/) para o grafo;
- [Lucide](https://lucide.dev/) para os ícones;
- Google Fonts para a tipografia da interface.

## Repositório

- [Repositório no GitHub](https://github.com/GSouza2007/Trabalho-IA-N1-AT2)

## Contexto acadêmico

Atividade AT2 da disciplina de Inteligência Artificial. O código tem finalidade didática e foi estruturado para permitir a inspeção visual do comportamento da busca, não para representar uma malha viária real.
