/**
 * Introdução (#19): 3 quadros com texto curto, mostrados na primeira vez que se clica
 * em Jogar, com botão de pular. Imagens e textos vêm de `content/intro.json`.
 */
import introJson from '../../content/intro.json';
import { lerQuadrosIntro, type QuadroIntro } from '../core/conteudo';
import { formatarTexto, TEXTOS } from './textos';

export interface ControleIntro {
  /** Mostra o primeiro quadro (a tela já deve estar visível) e põe o foco em "Próximo". */
  iniciar(): void;
}

function buscar<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento esperado do DOM não encontrado: #${id}`);
  return el as T;
}

export function criarIntro(opcoes: {
  readonly resolverUrlAsset: (caminho: string) => string;
  /** Chamado ao terminar ou pular: a intro conta como vista. */
  readonly aoTerminar: () => void;
}): ControleIntro {
  const quadros: readonly QuadroIntro[] = lerQuadrosIntro(introJson);
  const imagem = buscar<HTMLImageElement>('intro-imagem');
  const texto = buscar('intro-texto');
  const progresso = buscar('intro-progresso');
  const botaoPular = buscar('btn-intro-pular');
  const botaoProximo = buscar('btn-intro-proximo');
  let indice = 0;

  const mostrarQuadro = (novo: number) => {
    indice = novo;
    const quadro = quadros[indice];
    imagem.src = opcoes.resolverUrlAsset(quadro.imagem);
    imagem.alt = quadro.descricao;
    texto.textContent = quadro.texto;
    progresso.textContent = formatarTexto(TEXTOS.intro.progresso, {
      n: indice + 1,
      total: quadros.length,
    });
    botaoProximo.textContent =
      indice === quadros.length - 1 ? TEXTOS.intro.comecar : TEXTOS.intro.proximo;
  };

  botaoProximo.addEventListener('click', () => {
    if (indice < quadros.length - 1) {
      mostrarQuadro(indice + 1);
    } else {
      opcoes.aoTerminar();
    }
  });
  botaoPular.addEventListener('click', () => opcoes.aoTerminar());

  return {
    iniciar: () => {
      mostrarQuadro(0);
      botaoProximo.focus();
    },
  };
}
