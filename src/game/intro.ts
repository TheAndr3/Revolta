/**
 * Introdução: 7 quadros ilustrados em ordem (01 a 07), mostrados na primeira vez que
 * se clica em Jogar, contando a história do game. Imagens e textos vêm de `content/intro.json`.
 */
import introJson from '../../content/intro.json';
import { lerQuadrosIntro, type QuadroIntro } from '../core/conteudo';
import { formatarTexto, TEXTOS } from './textos';

export interface ControleIntro {
  /** Mostra o primeiro quadro (a tela já deve estar visível) e põe o foco em "Próximo". */
  iniciar(): void;
}

type DirecaoTransicao = 'forward' | 'backward';

const LIMIAR_DESLIZE_PX = 40;

function buscar<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento esperado do DOM não encontrado: #${id}`);
  return el as T;
}

function suportaTransicaoDirecional(): boolean {
  if (typeof document.startViewTransition !== 'function') return false;
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  if (!CSS.supports('selector(:active-view-transition-type(forward))')) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

export function criarIntro(opcoes: {
  readonly resolverUrlAsset: (caminho: string) => string;
  /** Chamado ao terminar ou pular: a intro conta como vista. */
  readonly aoTerminar: () => void;
}): ControleIntro {
  const quadros: readonly QuadroIntro[] = lerQuadrosIntro(introJson);
  const telaIntro = buscar('tela-intro');
  const quadroFigura = buscar('intro-quadro');
  const imagem = buscar<HTMLImageElement>('intro-imagem');
  const texto = buscar('intro-texto');
  const progresso = buscar('intro-progresso');
  const indicadores = buscar('intro-indicadores');
  const botaoPular = buscar('btn-intro-pular');
  const botaoAnterior = buscar<HTMLButtonElement>('btn-intro-anterior');
  const botaoProximo = buscar<HTMLButtonElement>('btn-intro-proximo');

  const pontos = quadros.map(() => {
    const ponto = document.createElement('span');
    ponto.className = 'intro-ponto';
    return ponto;
  });
  indicadores.replaceChildren(...pontos);

  const precarregadas = new Set<string>();
  const precarregarQuadro = (indiceQuadro: number) => {
    const alvo = quadros[indiceQuadro];
    if (!alvo) return;
    const url = opcoes.resolverUrlAsset(alvo.imagem);
    if (precarregadas.has(url)) return;
    precarregadas.add(url);
    const img = new Image();
    img.src = url;
  };

  let indice = 0;

  const aplicarQuadro = (novo: number) => {
    indice = novo;
    const quadro = quadros[indice];
    imagem.src = opcoes.resolverUrlAsset(quadro.imagem);
    imagem.alt = quadro.descricao;
    texto.textContent = quadro.texto;
    progresso.textContent = formatarTexto(TEXTOS.intro.progresso, {
      n: indice + 1,
      total: quadros.length,
    });
    botaoAnterior.disabled = indice === 0;
    botaoProximo.textContent =
      indice === quadros.length - 1 ? TEXTOS.intro.comecar : TEXTOS.intro.proximo;

    pontos.forEach((ponto, i) => {
      ponto.dataset.estado = i === indice ? 'atual' : i < indice ? 'visto' : 'futuro';
    });

    precarregarQuadro(indice + 1);
  };

  const mostrarQuadro = (novo: number, direcao?: DirecaoTransicao) => {
    if (!direcao || !suportaTransicaoDirecional()) {
      aplicarQuadro(novo);
      return;
    }

    try {
      document.startViewTransition({
        update: async () => {
          aplicarQuadro(novo);
          await imagem.decode().catch(() => {});
        },
        types: [direcao],
      });
    } catch {
      aplicarQuadro(novo);
    }
  };

  const avancar = () => {
    if (indice < quadros.length - 1) {
      mostrarQuadro(indice + 1, 'forward');
    } else {
      opcoes.aoTerminar();
    }
  };

  const voltar = () => {
    if (indice > 0) {
      mostrarQuadro(indice - 1, 'backward');
    }
  };

  botaoAnterior.addEventListener('click', voltar);
  botaoProximo.addEventListener('click', avancar);
  botaoPular.addEventListener('click', () => opcoes.aoTerminar());

  window.addEventListener('keydown', (evento) => {
    if (telaIntro.hidden) return;
    if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      avancar();
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      voltar();
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      opcoes.aoTerminar();
    }
  });

  // Deslize horizontal por toque para folhear os quadros no celular.
  let toqueInicial: { x: number; y: number } | null = null;
  quadroFigura.addEventListener('pointerdown', (evento) => {
    if (evento.pointerType !== 'touch') return;
    toqueInicial = { x: evento.clientX, y: evento.clientY };
  });
  quadroFigura.addEventListener('pointerup', (evento) => {
    if (!toqueInicial || evento.pointerType !== 'touch') return;
    const dx = evento.clientX - toqueInicial.x;
    const dy = evento.clientY - toqueInicial.y;
    toqueInicial = null;
    if (Math.abs(dx) < LIMIAR_DESLIZE_PX || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
    if (dx < 0) avancar();
    else voltar();
  });
  quadroFigura.addEventListener('pointercancel', () => {
    toqueInicial = null;
  });

  return {
    iniciar: () => {
      imagem.setAttribute('fetchpriority', 'high');
      mostrarQuadro(0);
      botaoProximo.focus();
    },
  };
}
