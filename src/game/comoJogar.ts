import { TEXTOS } from './textos';

/**
 * Tela "Como jogar": o que é preciso saber antes de zerar o jogo, com os sprites reais
 * do jogo animados por CSS (recorte da spritesheet + `steps()`). Ordem pensada a partir
 * das referências de tutorial: objetivo → controles → o que você vê → perigos → dicas.
 * Textos em `content/telas.json` (`comoJogar`).
 */

interface Folha {
  readonly arquivo: string;
  /** Tamanho do quadro em px. */
  readonly q: number;
  /** Colunas da folha. */
  readonly colunas: number;
}

const FOLHAS = {
  protagonista: { arquivo: 'assets/protagonista-sprites.png', q: 24, colunas: 7 },
  gosma: { arquivo: 'assets/cc0/gosma.png', q: 16, colunas: 4 },
  drone: { arquivo: 'assets/drone-sprites.png', q: 24, colunas: 4 },
  guarda: { arquivo: 'assets/guarda-sprites.png', q: 24, colunas: 6 },
  habitantes: { arquivo: 'assets/habitantes-sprites.png', q: 24, colunas: 6 },
} as const satisfies Record<string, Folha>;

/** Sprite animado: `quadros` quadros seguidos a partir de (coluna, linha), em escala inteira. */
function sprite(
  resolver: (caminho: string) => string,
  folha: Folha,
  opcoes: { coluna: number; linha: number; quadros: number; fps: number; escala?: number },
): HTMLElement {
  const escala = opcoes.escala ?? 3;
  const lado = folha.q * escala;
  const el = document.createElement('span');
  el.className = 'cj-sprite';
  el.setAttribute('aria-hidden', 'true');
  // URL absoluta: um caminho relativo dentro de variável CSS é resolvido a partir do
  // arquivo .css (em /assets/ no build), não da página, e a imagem não carrega.
  const url = new URL(resolver(folha.arquivo), document.baseURI).href;
  el.style.setProperty('--cj-img', `url("${url}")`);
  el.style.setProperty('--cj-lado', `${lado}px`);
  el.style.setProperty('--cj-largura-folha', `${folha.colunas * lado}px`);
  el.style.setProperty('--cj-x0', `${-opcoes.coluna * lado}px`);
  el.style.setProperty('--cj-y0', `${-opcoes.linha * lado}px`);
  el.style.setProperty('--cj-passo', `${opcoes.quadros * lado}px`);
  el.style.setProperty('--cj-quadros', String(opcoes.quadros));
  el.style.setProperty('--cj-duracao', `${opcoes.quadros / opcoes.fps}s`);
  return el;
}

/** Ícones desenhados para o que o jogo pinta por código (sem spritesheet). */
const ICONES: Record<string, string> = {
  prova:
    '<svg viewBox="0 0 16 16"><path fill="#f4d35e" d="M3 1.5h7l3 3v10H3z"/><path fill="none" stroke="#3a2a20" stroke-width="1.2" d="M5 7h6M5 9.5h6M5 12h4"/></svg>',
  saida:
    '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="#163325" stroke="#52e596" stroke-width="1.5"/><rect x="5" y="5" width="6" height="6" fill="#52e596"/></svg>',
  totem:
    '<svg viewBox="0 0 16 16"><rect x="5" y="2" width="6" height="12" fill="#6b4a32"/><rect x="5" y="4" width="6" height="2" fill="#7dd3fc"/><rect x="5" y="8" width="6" height="2" fill="#7dd3fc"/><rect x="3" y="13" width="10" height="2" fill="#3a2a20"/></svg>',
  alma:
    '<svg viewBox="0 0 16 16"><path fill="#7dd3fc" d="M8 1c1.6 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.8-2.6 1.6-3.4C6 7 6.6 7.6 7 8.4 7.4 6 7 3.4 8 1z"/></svg>',
  espinho:
    '<svg viewBox="0 0 16 16"><rect x="1" y="12" width="14" height="3" fill="#6b4a32"/><path fill="#c23b22" d="M2 12l2-8 2 8zM6 12l2-9 2 9zM10 12l2-8 2 8z"/><path fill="#f2913d" d="M3.4 9l.6-3 .6 3zM7.4 8l.6-3.5.6 3.5zM11.4 9l.6-3 .6 3z"/></svg>',
};

function icone(nome: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'cj-icone';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = ICONES[nome] ?? '';
  return el;
}

function cartao(ilustracao: HTMLElement, titulo: string, texto: string): HTMLElement {
  const li = document.createElement('li');
  li.className = 'cj-cartao';
  const fig = document.createElement('div');
  fig.className = 'cj-figura';
  fig.append(ilustracao);
  const corpo = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = titulo;
  const p = document.createElement('p');
  p.textContent = texto;
  corpo.append(h, p);
  li.append(fig, corpo);
  return li;
}

function secao(titulo: string, ...filhos: HTMLElement[]): HTMLElement {
  const s = document.createElement('section');
  s.className = 'cj-secao';
  const h = document.createElement('h2');
  h.textContent = titulo;
  s.append(h, ...filhos);
  return s;
}

function lista(itens: HTMLElement[]): HTMLElement {
  const ul = document.createElement('ul');
  ul.className = 'cj-lista';
  ul.append(...itens);
  return ul;
}

function teclas(...nomes: string[]): HTMLElement {
  const el = document.createElement('span');
  el.className = 'cj-teclas';
  el.setAttribute('aria-hidden', 'true');
  for (const nome of nomes) {
    const k = document.createElement('kbd');
    k.textContent = nome;
    el.append(k);
  }
  return el;
}

/** Monta a tela no contêiner (uma vez; os sprites animam sozinhos por CSS). */
export function montarComoJogar(conteudo: HTMLElement, resolver: (caminho: string) => string): void {
  const T = TEXTOS.comoJogar;
  const F = FOLHAS;

  const objetivo = document.createElement('ol');
  objetivo.className = 'cj-passos';
  for (const passo of T.objetivo.passos) {
    const li = document.createElement('li');
    li.textContent = passo;
    objetivo.append(li);
  }

  const setas = document.createElement('span');
  setas.className = 'cj-setas';
  setas.setAttribute('aria-hidden', 'true');
  setas.innerHTML =
    '<kbd class="cj-cima">↑</kbd><kbd class="cj-esq">←</kbd><kbd class="cj-baixo">↓</kbd><kbd class="cj-dir">→</kbd>';

  const deslize = sprite(resolver, F.protagonista, { coluna: 4, linha: 2, quadros: 2, fps: 10 });
  deslize.classList.add('cj-deslizando');

  conteudo.replaceChildren(
    secao(T.objetivo.titulo, objetivo),
    secao(
      T.controles.titulo,
      lista([
        cartao(setas, T.controles.mover.titulo, T.controles.mover.texto),
        cartao(criarSwipe(),T.controles.celular.titulo, T.controles.celular.texto),
        cartao(deslize, T.controles.deslize.titulo, T.controles.deslize.texto),
        cartao(teclas('Esc', 'P'), T.controles.pausa.titulo, T.controles.pausa.texto),
        cartao(teclas('R'), T.controles.reiniciar.titulo, T.controles.reiniciar.texto),
      ]),
    ),
    secao(
      T.elementos.titulo,
      lista([
        cartao(icone('prova'), T.elementos.prova.titulo, T.elementos.prova.texto),
        cartao(icone('saida'), T.elementos.saida.titulo, T.elementos.saida.texto),
        cartao(icone('totem'), T.elementos.totem.titulo, T.elementos.totem.texto),
        cartao(icone('alma'), T.elementos.alma.titulo, T.elementos.alma.texto),
        cartao(
          sprite(resolver, F.habitantes, { coluna: 0, linha: 1, quadros: 4, fps: 8 }),
          T.elementos.habitante.titulo,
          T.elementos.habitante.texto,
        ),
      ]),
    ),
    secao(
      T.perigos.titulo,
      lista([
        cartao(icone('espinho'), T.perigos.espinho.titulo, T.perigos.espinho.texto),
        cartao(
          sprite(resolver, F.gosma, { coluna: 0, linha: 0, quadros: 4, fps: 6, escala: 4 }),
          T.perigos.gosma.titulo,
          T.perigos.gosma.texto,
        ),
        cartao(
          sprite(resolver, F.drone, { coluna: 0, linha: 0, quadros: 4, fps: 20 }),
          T.perigos.drone.titulo,
          T.perigos.drone.texto,
        ),
        cartao(
          sprite(resolver, F.guarda, { coluna: 0, linha: 2, quadros: 4, fps: 8 }),
          T.perigos.guarda.titulo,
          T.perigos.guarda.texto,
        ),
      ]),
    ),
    secao(T.dicas.titulo, listaSimples(T.dicas.itens)),
  );
}

function listaSimples(itens: readonly string[]): HTMLElement {
  const ul = document.createElement('ul');
  ul.className = 'cj-dicas';
  for (const item of itens) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.append(li);
  }
  return ul;
}

/** Dedo deslizando na tela (ilustração do swipe no celular). */
function criarSwipe(): HTMLElement {
  const el = document.createElement('span');
  el.className = 'cj-swipe';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<svg viewBox="0 0 32 32"><rect x="7" y="2" width="18" height="28" rx="3" fill="none" stroke="#8a9a90" stroke-width="2"/><path d="M11 17h10m-3-3 3 3-3 3" fill="none" stroke="#52e596" stroke-width="2"/></svg>';
  return el;
}
