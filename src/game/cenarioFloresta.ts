/**
 * Cenário da floresta (experimento com assets CC0, ver public/assets/cc0/CREDITOS.md).
 *
 * - O chão vira uma trilha de terra com bordas de grama (autotile de 16 peças, pelos
 *   vizinhos de chão: N=1, L=2, S=4, O=8).
 * - As paredes viram floresta: grama por baixo e, por cima, árvores, ruínas da aldeia
 *   abandonada, troncos, arbustos, tocos e pedras. A escolha é determinística (mesma
 *   Fase, mesmo cenário) e objetos grandes só entram onde cabem inteiros na parede.
 */
import type { TipoCelula } from '../core/fase';

export interface ObjetoCenario {
  /** Chave da textura (arquivo `assets/cc0/cenario/<chave>.png`). */
  readonly chave: string;
  readonly largura: number;
  readonly altura: number;
  /** Chance (0–1) de ser colocado quando cabe. */
  readonly peso: number;
  /** Origem no tileset `tileset_village_abandoned.png` (em tiles), para o importador. */
  readonly origem: readonly [number, number];
}

/** Objetos grandes, do maior para o menor (os maiores têm prioridade quando cabem). */
export const OBJETOS_GRANDES: readonly ObjetoCenario[] = [
  { chave: 'arvore-grande-a', largura: 4, altura: 3, peso: 0.55, origem: [0, 6] },
  { chave: 'arvore-grande-b', largura: 4, altura: 3, peso: 0.45, origem: [0, 9] },
  { chave: 'ruina-pedra', largura: 4, altura: 3, peso: 0.35, origem: [0, 0] },
  { chave: 'casa-madeira-a', largura: 3, altura: 3, peso: 0.4, origem: [11, 0] },
  { chave: 'casa-madeira-b', largura: 3, altura: 3, peso: 0.35, origem: [11, 3] },
  { chave: 'casa-barro', largura: 2, altura: 3, peso: 0.35, origem: [4, 0] },
  { chave: 'arvore-media-a', largura: 2, altura: 2, peso: 0.5, origem: [4, 6] },
  { chave: 'arvore-media-b', largura: 2, altura: 2, peso: 0.45, origem: [4, 9] },
  { chave: 'tronco-a', largura: 1, altura: 2, peso: 0.12, origem: [6, 6] },
  { chave: 'tronco-b', largura: 1, altura: 2, peso: 0.1, origem: [6, 9] },
];

/** Peças de 1 tile para preencher o resto da parede, com peso relativo. */
export const OBJETOS_PEQUENOS: readonly { readonly origem: readonly [number, number]; readonly peso: number }[] = [
  { origem: [4, 5], peso: 30 }, // arbusto A
  { origem: [5, 5], peso: 30 }, // arbusto B
  { origem: [6, 8], peso: 4 }, // toco
  { origem: [7, 7], peso: 3 }, // toco pequeno
  { origem: [8, 7], peso: 3 }, // toco pequeno
  { origem: [6, 3], peso: 3 }, // pedras com musgo
  { origem: [7, 3], peso: 3 },
  { origem: [8, 3], peso: 3 },
  { origem: [9, 3], peso: 3 },
  { origem: [6, 4], peso: 3 },
  { origem: [7, 4], peso: 3 },
  { origem: [8, 4], peso: 3 },
  { origem: [9, 4], peso: 3 },
];

/**
 * Origem (no `tileset_floor.png`, em tiles) da peça de trilha para cada máscara de
 * vizinhos de chão (N=1, L=2, S=4, O=8). Índice do array = máscara.
 */
export const TRILHA_POR_MASCARA: readonly (readonly [number, number])[] = [
  [14, 10], // 0  isolada
  [14, 9], //  1  só N: ponta de baixo de corredor vertical
  [11, 10], // 2  só L: ponta esquerda de corredor horizontal
  [11, 9], //  3  N+L: canto de baixo à esquerda
  [14, 7], //  4  só S: ponta de cima de corredor vertical
  [14, 8], //  5  N+S: corredor vertical
  [11, 7], //  6  L+S: canto de cima à esquerda
  [11, 8], //  7  N+L+S: borda esquerda
  [13, 10], // 8  só O: ponta direita de corredor horizontal
  [13, 9], //  9  N+O: canto de baixo à direita
  [12, 10], // 10 L+O: corredor horizontal
  [12, 9], //  11 N+L+O: borda de baixo
  [13, 7], //  12 S+O: canto de cima à direita
  [13, 8], //  13 N+S+O: borda direita
  [12, 7], //  14 L+S+O: borda de cima
  [12, 8], //  15 todos: miolo
];

/** Variações de grama sob a floresta (no `tileset_floor.png`). */
export const GRAMA: readonly (readonly [number, number])[] = [
  [11, 12],
  [12, 12],
  [13, 12],
  [14, 12],
];

export interface Colocacao {
  /** Chave de objeto grande, ou `pequeno:<índice>` para peça de 1 tile. */
  readonly chave: string;
  readonly col: number;
  readonly lin: number;
}

/** Família do objeto (variações "-a"/"-b" contam como o mesmo objeto). */
export function familia(chave: string): string {
  return chave.replace(/-[ab]$/, '');
}

/** Distância mínima entre objetos da mesma família, para o cenário não repetir. */
export const DISTANCIA_MESMA_FAMILIA = { colunas: 5, linhas: 6 } as const;

/** Hash inteiro determinístico de uma célula (para escolhas "aleatórias" estáveis). */
export function hashCelula(col: number, lin: number, sal = 0): number {
  let h = (col * 374761393 + lin * 668265263 + sal * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

const aleatorio = (col: number, lin: number, sal: number) => hashCelula(col, lin, sal) / 0x100000000;

const ehParede = (grade: readonly (readonly TipoCelula[])[], col: number, lin: number) =>
  lin < 0 || lin >= grade.length || col < 0 || col >= grade[0].length || grade[lin][col] === 'parede';

/** Máscara de vizinhos de chão (N=1, L=2, S=4, O=8); fora da Fase conta como parede. */
export function mascaraTrilha(grade: readonly (readonly TipoCelula[])[], col: number, lin: number): number {
  return (
    (ehParede(grade, col, lin - 1) ? 0 : 1) |
    (ehParede(grade, col + 1, lin) ? 0 : 2) |
    (ehParede(grade, col, lin + 1) ? 0 : 4) |
    (ehParede(grade, col - 1, lin) ? 0 : 8)
  );
}

/** Variação de grama da célula (0 a 3), estável. */
export function variacaoGrama(col: number, lin: number): number {
  // Grama lisa na maioria das células; tufos de vez em quando.
  const r = aleatorio(col, lin, 7);
  return r < 0.6 ? 0 : 1 + (hashCelula(col, lin, 8) % (GRAMA.length - 1));
}

/**
 * Distribui objetos na floresta (células de parede). Cada célula de parede recebe
 * exatamente uma peça: um objeto grande que a cubra ou uma peça de 1 tile.
 */
export function decorarParedes(grade: readonly (readonly TipoCelula[])[]): Colocacao[] {
  const altura = grade.length;
  const largura = grade[0]?.length ?? 0;
  const coberta = grade.map((linha) => linha.map(() => false));
  const colocacoes: Colocacao[] = [];
  const porFamilia = new Map<string, { col: number; lin: number }[]>();
  const pertoDeIgual = (obj: ObjetoCenario, col: number, lin: number) =>
    (porFamilia.get(familia(obj.chave)) ?? []).some(
      (p) =>
        Math.abs(p.col - col) < DISTANCIA_MESMA_FAMILIA.colunas &&
        Math.abs(p.lin - lin) < DISTANCIA_MESMA_FAMILIA.linhas,
    );

  const cabe = (obj: ObjetoCenario, col: number, lin: number) => {
    if (col + obj.largura > largura || lin + obj.altura > altura) return false;
    for (let l = lin; l < lin + obj.altura; l++) {
      for (let c = col; c < col + obj.largura; c++) {
        if (grade[l][c] !== 'parede' || coberta[l][c]) return false;
      }
    }
    return true;
  };

  for (let lin = 0; lin < altura; lin++) {
    for (let col = 0; col < largura; col++) {
      if (grade[lin][col] !== 'parede' || coberta[lin][col]) continue;

      const grande = OBJETOS_GRANDES.find(
        (obj, i) =>
          cabe(obj, col, lin) && !pertoDeIgual(obj, col, lin) && aleatorio(col, lin, 100 + i) < obj.peso,
      );
      if (grande) {
        const lista = porFamilia.get(familia(grande.chave)) ?? [];
        lista.push({ col, lin });
        porFamilia.set(familia(grande.chave), lista);
        for (let l = lin; l < lin + grande.altura; l++) {
          for (let c = col; c < col + grande.largura; c++) coberta[l][c] = true;
        }
        colocacoes.push({ chave: grande.chave, col, lin });
        continue;
      }

      const total = OBJETOS_PEQUENOS.reduce((s, o) => s + o.peso, 0);
      let sorteio = aleatorio(col, lin, 200) * total;
      const indice = OBJETOS_PEQUENOS.findIndex((o) => (sorteio -= o.peso) < 0);
      coberta[lin][col] = true;
      colocacoes.push({ chave: `pequeno:${Math.max(0, indice)}`, col, lin });
    }
  }
  return colocacoes;
}
