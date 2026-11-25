import type { Direcao } from '../core/deslize';

/**
 * Spritesheet do Protagonista: pixel art desenhada em código por
 * `npm run gerar-protagonista` (scripts/gerar-protagonista.ts), só com cores da paleta.
 *
 * Layout (quadros de 24×24, 7 colunas):
 * - linhas 0–2 (frente, costas, lado direito): parado ×4 · deslize ×2 · batida ×1;
 * - linha 3: morte (se desfaz em folhas e luz) ×7; reaparecer é a mesma linha ao contrário.
 * O lado esquerdo é o direito espelhado.
 */
export const SPRITES_PROTAGONISTA = {
  chave: 'protagonista-sprites',
  arquivo: 'assets/protagonista-sprites.png',
  quadroPx: 24,
  colunas: 7,
  linhas: 4,
  /**
   * Linha do quadro (em fração da altura) que fica no centro do tile: com 14/24, os pés
   * (linha 21) caem na base do tile e a cabeça passa um pouco para cima, como em 3/4.
   */
  origemY: 14 / 24,
} as const;

export type Olhar = 'frente' | 'costas' | 'lado';
export type AcaoProtagonista = 'parado' | 'deslize' | 'batida';

export const LINHA_OLHAR: Record<Olhar, number> = { frente: 0, costas: 1, lado: 2 };
export const LINHA_MORTE = 3;
export const QUADROS_MORTE = 7;

/** Colunas de cada ação dentro da linha de um olhar. */
export const COLUNAS_ACAO: Record<AcaoProtagonista, readonly number[]> = {
  parado: [0, 1, 2, 3],
  deslize: [4, 5],
  batida: [6],
};

export function indiceQuadro(linha: number, coluna: number): number {
  return linha * SPRITES_PROTAGONISTA.colunas + coluna;
}

/** Para onde o Protagonista olha em cada direção de deslize. */
export function olharDaDirecao(direcao: Direcao): { olhar: Olhar; espelhar: boolean } {
  switch (direcao) {
    case 'baixo':
      return { olhar: 'frente', espelhar: false };
    case 'cima':
      return { olhar: 'costas', espelhar: false };
    case 'direita':
      return { olhar: 'lado', espelhar: false };
    case 'esquerda':
      return { olhar: 'lado', espelhar: true };
  }
}

export function chaveAnimacao(acao: AcaoProtagonista | 'morte' | 'reaparecer', olhar?: Olhar): string {
  return olhar ? `protagonista-${acao}-${olhar}` : `protagonista-${acao}`;
}

/** Distância em tiles entre a posição atual e o destino do deslize (0 sem destino). */
export function distanciaDoDeslize(
  origem: { readonly x: number; readonly y: number },
  destino: { readonly col: number; readonly lin: number } | null,
): number {
  if (!destino) return 0;
  return Math.abs(destino.col - origem.x) + Math.abs(destino.lin - origem.y);
}

/**
 * Força do impacto na parede (0–1) a partir da distância percorrida: deslizes curtos
 * quase não tremem; a partir de `distanciaMaxima` tiles o impacto é o máximo.
 */
export function intensidadeDoImpacto(distanciaTiles: number, distanciaMaxima = 8): number {
  if (!Number.isFinite(distanciaTiles) || distanciaTiles <= 1) return 0;
  return Math.min(1, (distanciaTiles - 1) / (distanciaMaxima - 1));
}
