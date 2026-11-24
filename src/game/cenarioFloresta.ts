/**
 * Cenário da floresta (experimento com assets CC0, ver public/assets/cc0/CREDITOS.md).
 *
 * - O chão vira uma trilha de terra com bordas de grama (autotile de 16 peças, pelos
 *   vizinhos de chão: N=1, L=2, S=4, O=8).
 * - As paredes viram floresta: grama por baixo e, por cima, árvores, ruínas da aldeia
 *   abandonada, troncos, arbustos, tocos e pedras. A escolha é determinística (mesma
 *   Fase, mesmo cenário) e objetos grandes só entram onde cabem inteiros na parede.
 *
 * Leitura (docs/design/fase-01.md, "Visual"): ruínas, casas, troncos, tocos e pedras
 * têm o mesmo tom rosado da trilha e, encostados nela, parecem caminho. Por isso a
 * **beira** da mata (parede com chão em alguma das 8 vizinhas) só recebe grama escura,
 * arbustos e árvores; o resto fica no **miolo** e é desenhado escurecido
 * (`TINTA_CONSTRUCAO`), para a trilha ser o chão mais claro da tela.
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
  /** Árvores podem encostar na trilha; construções e troncos só entram no miolo da mata. */
  readonly soNoMiolo: boolean;
}

/** Objetos grandes, do maior para o menor (os maiores têm prioridade quando cabem). */
export const OBJETOS_GRANDES: readonly ObjetoCenario[] = [
  { chave: 'arvore-grande-a', largura: 4, altura: 3, peso: 0.55, origem: [0, 6], soNoMiolo: false },
  { chave: 'arvore-grande-b', largura: 4, altura: 3, peso: 0.45, origem: [0, 9], soNoMiolo: false },
  { chave: 'ruina-pedra', largura: 4, altura: 3, peso: 0.35, origem: [0, 0], soNoMiolo: true },
  { chave: 'casa-madeira-a', largura: 3, altura: 3, peso: 0.4, origem: [11, 0], soNoMiolo: true },
  { chave: 'casa-madeira-b', largura: 3, altura: 3, peso: 0.35, origem: [11, 3], soNoMiolo: true },
  { chave: 'casa-barro', largura: 2, altura: 3, peso: 0.35, origem: [4, 0], soNoMiolo: true },
  { chave: 'arvore-media-a', largura: 2, altura: 2, peso: 0.5, origem: [4, 6], soNoMiolo: false },
  { chave: 'arvore-media-b', largura: 2, altura: 2, peso: 0.45, origem: [4, 9], soNoMiolo: false },
  { chave: 'tronco-a', largura: 1, altura: 2, peso: 0.12, origem: [6, 6], soNoMiolo: true },
  { chave: 'tronco-b', largura: 1, altura: 2, peso: 0.1, origem: [6, 9], soNoMiolo: true },
];

/**
 * Peças de 1 tile para preencher o resto da parede, com peso relativo. Só os arbustos
 * (as duas primeiras) entram na beira da mata; tocos e pedras ficam no miolo.
 */
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

/** Quantas peças pequenas do início da lista são arbustos (as únicas permitidas na beira). */
export const ARBUSTOS_PEQUENOS = 2;

/** Chance de uma célula de beira ficar só com a grama escura (sem arbusto por cima). */
export const CHANCE_BEIRA_SO_GRAMA = 0.45;

/** Tinta aplicada a construções, troncos, tocos e pedras: recuam para o fundo. */
export const TINTA_CONSTRUCAO = 0x7a7588;

/** Chave de colocação que deixa a célula só com a grama escura. */
export const SO_GRAMA = 'grama';

/** Parede com chão em alguma das 8 vizinhas: é a beira da trilha. */
export function ehBeiraDaTrilha(
  grade: readonly (readonly TipoCelula[])[],
  col: number,
  lin: number,
): boolean {
  for (let dl = -1; dl <= 1; dl++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!ehParede(grade, col + dc, lin + dl)) return true;
    }
  }
  return false;
}

/** A peça de cenário é escurecida (construção, tronco, toco ou pedra)? */
export function escurecer(chave: string): boolean {
  if (chave.startsWith('pequeno:')) return Number(chave.slice(8)) >= ARBUSTOS_PEQUENOS;
  return OBJETOS_GRANDES.find((o) => o.chave === chave)?.soNoMiolo ?? false;
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
        if (obj.soNoMiolo && ehBeiraDaTrilha(grade, c, l)) return false;
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

      coberta[lin][col] = true;
      if (ehBeiraDaTrilha(grade, col, lin)) {
        // Beira: grama escura ou arbusto, nunca nada com o tom da trilha.
        const chave =
          aleatorio(col, lin, 210) < CHANCE_BEIRA_SO_GRAMA
            ? SO_GRAMA
            : `pequeno:${hashCelula(col, lin, 211) % ARBUSTOS_PEQUENOS}`;
        colocacoes.push({ chave, col, lin });
        continue;
      }
      const total = OBJETOS_PEQUENOS.reduce((s, o) => s + o.peso, 0);
      let sorteio = aleatorio(col, lin, 200) * total;
      const indice = OBJETOS_PEQUENOS.findIndex((o) => (sorteio -= o.peso) < 0);
      colocacoes.push({ chave: `pequeno:${Math.max(0, indice)}`, col, lin });
    }
  }
  return colocacoes;
}

export type TipoLuzDaMata = 'cogumelo' | 'flor';

export interface LuzDaMata {
  readonly tipo: TipoLuzDaMata;
  readonly col: number;
  readonly lin: number;
}

/** Chance de uma célula de mata na beira da trilha ganhar cogumelo ou flor. */
export const CHANCE_BEIRA = { cogumelo: 0.14, flor: 0.1 } as const;

/**
 * Cogumelos que brilham e flores na beira da mata (células de parede vizinhas da
 * trilha), à noite. Determinístico; no máximo um por célula.
 */
export function decorarBeiras(grade: readonly (readonly TipoCelula[])[]): LuzDaMata[] {
  const luzes: LuzDaMata[] = [];
  grade.forEach((linha, lin) =>
    linha.forEach((tipo, col) => {
      if (tipo !== 'parede') return;
      const vizinhaDaTrilha = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ].some(([dc, dl]) => !ehParede(grade, col + dc, lin + dl));
      if (!vizinhaDaTrilha) return;
      const r = aleatorio(col, lin, 300);
      if (r < CHANCE_BEIRA.cogumelo) luzes.push({ tipo: 'cogumelo', col, lin });
      else if (r < CHANCE_BEIRA.cogumelo + CHANCE_BEIRA.flor) luzes.push({ tipo: 'flor', col, lin });
    }),
  );
  return luzes;
}
