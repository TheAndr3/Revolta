/**
 * Cenário da floresta, no estilo limpo (decidido em 23/11/2026, docs/design/fase-01.md).
 *
 * Leitura primeiro: o chão onde se anda tem uma faixa de brilho só dele (trilha clara e
 * lisa), a mata é uma massa escura e calma, e uma linha clara marca exatamente onde a
 * trilha acaba. A decoração (copas) fica só no miolo da mata, longe da borda, para não
 * competir com a linha nem com os elementos do jogo.
 */
import type { TipoCelula } from '../core/fase';

type Grade = readonly (readonly TipoCelula[])[];

/** Bits de lado: N=1, L=2, S=4, O=8. */
export const LADO = { norte: 1, leste: 2, sul: 4, oeste: 8 } as const;

/** Hash inteiro determinístico de uma célula (para escolhas "aleatórias" estáveis). */
export function hashCelula(col: number, lin: number, sal = 0): number {
  let h = (col * 374761393 + lin * 668265263 + sal * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

const aleatorio = (col: number, lin: number, sal: number) => hashCelula(col, lin, sal) / 0x100000000;

/** Fora da Fase conta como parede. */
export function ehParede(grade: Grade, col: number, lin: number): boolean {
  return lin < 0 || lin >= grade.length || col < 0 || col >= grade[0].length || grade[lin][col] === 'parede';
}

/** Máscara de vizinhos de chão (N=1, L=2, S=4, O=8). */
export function mascaraTrilha(grade: Grade, col: number, lin: number): number {
  return (
    (ehParede(grade, col, lin - 1) ? 0 : LADO.norte) |
    (ehParede(grade, col + 1, lin) ? 0 : LADO.leste) |
    (ehParede(grade, col, lin + 1) ? 0 : LADO.sul) |
    (ehParede(grade, col - 1, lin) ? 0 : LADO.oeste)
  );
}

/** Lados de uma célula de chão que encostam na mata (onde se desenha a borda). */
export function ladosComParede(grade: Grade, col: number, lin: number): number {
  return ~mascaraTrilha(grade, col, lin) & 15;
}

export interface CopaDaMata {
  readonly col: number;
  readonly lin: number;
  /** Deslocamento do centro dentro da célula, em fração do tile (−0,25 a 0,25). */
  readonly dx: number;
  readonly dy: number;
  /** Raio em fração do tile (0,35 a 0,6). */
  readonly raio: number;
  /** 0 = tom mais escuro, 1 = tom um pouco mais claro. */
  readonly tom: 0 | 1;
}

/** Chance de uma célula do miolo da mata ganhar uma copa. */
export const CHANCE_COPA = 0.55;

/**
 * Copas de árvore só no miolo da mata: células de parede sem nenhum chão nas 8 vizinhas.
 * Assim a beira da trilha fica sempre lisa e a linha de borda lê sem ruído.
 */
export function copasDaMata(grade: Grade): CopaDaMata[] {
  const copas: CopaDaMata[] = [];
  grade.forEach((linha, lin) =>
    linha.forEach((tipo, col) => {
      if (tipo !== 'parede') return;
      for (let dl = -1; dl <= 1; dl++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!ehParede(grade, col + dc, lin + dl)) return;
        }
      }
      if (aleatorio(col, lin, 1) >= CHANCE_COPA) return;
      copas.push({
        col,
        lin,
        dx: (aleatorio(col, lin, 2) - 0.5) * 0.5,
        dy: (aleatorio(col, lin, 3) - 0.5) * 0.5,
        raio: 0.35 + aleatorio(col, lin, 4) * 0.25,
        tom: aleatorio(col, lin, 5) < 0.5 ? 0 : 1,
      });
    }),
  );
  return copas;
}
