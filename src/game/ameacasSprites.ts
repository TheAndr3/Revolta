import type { Direcao } from '../core/deslize';
import type { Olhar } from './protagonistaSprites';

/**
 * Spritesheets do Drone Desmatador e do Guarda Florestal: pixel art desenhada em código
 * por `npm run gerar-ameacas` (scripts/gerar-ameacas.ts), só com cores da paleta.
 * Quadros de 24×24, como o Protagonista (ver art/pesquisa-drone-guarda.md).
 */

/** Drone visto de cima, com a frente (serra) para cima; o jogo gira para a direção do trilho. */
export const SPRITES_DRONE = {
  chave: 'drone-sprites',
  arquivo: 'assets/drone-sprites.png',
  quadroPx: 24,
  /** Hélices girando (45° por quadro) e o brilho da serra dando a volta. */
  quadrosHelice: 4,
  colunas: 4,
  linhas: 1,
} as const;

/** Ângulo (graus, horário) que leva a frente do Drone (para cima) até a direção. */
export const ANGULO_DRONE: Record<Direcao, number> = {
  cima: 0,
  direita: 90,
  baixo: 180,
  esquerda: -90,
};

/** Guarda em 3/4: linhas frente, costas, lado (esquerda espelhada). */
export const SPRITES_GUARDA = {
  chave: 'guarda-sprites',
  arquivo: 'assets/guarda-sprites.png',
  quadroPx: 24,
  colunas: 6,
  linhas: 3,
  /** Mesma origem do Protagonista: os pés na base do tile. */
  origemY: 14 / 24,
} as const;

export const LINHA_GUARDA: Record<Olhar, number> = { frente: 0, costas: 1, lado: 2 };
export const COLUNAS_GUARDA = { andar: [0, 1, 2, 3], parado: [4, 5] } as const;

/** Ângulo (graus, 0 = direita, 90 = baixo) do cone da lanterna em cada direção. */
export const ANGULO_LANTERNA: Record<Direcao, number> = {
  direita: 0,
  baixo: 90,
  esquerda: 180,
  cima: -90,
};

export function chaveAnimacaoGuarda(acao: 'andar' | 'parado', olhar: Olhar): string {
  return `guarda-${acao}-${olhar}`;
}
