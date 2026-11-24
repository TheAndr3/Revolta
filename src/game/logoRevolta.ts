/**
 * Logo do Revolta em pixel art, montada por código (sem fonte externa).
 *
 * Duas partes com estéticas diferentes que se leem juntas como "REVOLTA":
 * - **RE**, o espírito: letras finas em azul de Alma, com brilho, flutuando acima;
 * - **VOLTA**, a terra: letras grossas de madeira e barro, com musgo em cima, rachaduras
 *   e raízes que descem. O espírito volta à terra, e a terra se revolta.
 *
 * Este módulo é puro (sem canvas): devolve os pixels fixos de cada parte e os pontos que
 * a animação usa (folhas do musgo, área do RE). O desenho fica em `capaAnimada.ts`.
 * Todas as cores vêm de `art/paleta.hex`.
 */

/** Cores da paleta usadas na logo (hex de `art/paleta.hex`). */
export const CORES_LOGO = {
  noite: '#0d1512',
  terraEscura: '#3a2a20',
  madeira: '#6b4a32',
  barro: '#a0703f',
  areia: '#d9a066',
  oleo: '#5a3f4f',
  verdeProfundo: '#163325',
  verdeFolha: '#3f7a4f',
  broto: '#6fae5a',
  verdeClaro: '#b5d96a',
  aguaLimpa: '#2f6f73',
  reflexo: '#7cc6b8',
  totem: '#7dd3fc',
  luz: '#eef4f0',
} as const;

type Glifo = readonly string[];

/** VOLTA: traço de 3 px, 13 linhas de altura. */
export const GLIFOS_VOLTA: Readonly<Record<'V' | 'O' | 'L' | 'T' | 'A', Glifo>> = {
  V: [
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '.###...###.',
    '.###...###.',
    '.###...###.',
    '..###.###..',
    '..###.###..',
    '...#####...',
    '...#####...',
    '....###....',
  ],
  O: [
    '..#######..',
    '.#########.',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '.#########.',
    '..#######..',
  ],
  L: [
    '###......',
    '###......',
    '###......',
    '###......',
    '###......',
    '###......',
    '###......',
    '###......',
    '###......',
    '###......',
    '###......',
    '#########',
    '#########',
  ],
  T: [
    '###########',
    '###########',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
  ],
  A: [
    '...#####...',
    '..#######..',
    '.###...###.',
    '###.....###',
    '###.....###',
    '###.....###',
    '###########',
    '###########',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
  ],
};

/** RE: traço de 2 px, 9 linhas de altura. */
export const GLIFOS_RE: Readonly<Record<'R' | 'E', Glifo>> = {
  R: [
    '######.',
    '#######',
    '##...##',
    '##...##',
    '######.',
    '#####..',
    '##.###.',
    '##..###',
    '##...##',
  ],
  E: [
    '#######',
    '#######',
    '##.....',
    '##.....',
    '######.',
    '######.',
    '##.....',
    '#######',
    '#######',
  ],
};

export interface PixelLogo {
  readonly x: number;
  readonly y: number;
  readonly cor: string;
}

export interface Ponto {
  readonly x: number;
  readonly y: number;
}

export interface LogoMontada {
  readonly largura: number;
  readonly altura: number;
  /** VOLTA com contorno, sombra, musgo, rachaduras e raízes (fixo). */
  readonly volta: readonly PixelLogo[];
  /** RE com contorno (desenhado com o deslocamento de flutuação). */
  readonly re: readonly PixelLogo[];
  /** Pontas de folha do musgo (acima do VOLTA), que balançam na animação. */
  readonly folhas: readonly Ponto[];
  /** Área do RE (sem o brilho), para as faíscas e as almas que descem. */
  readonly caixaRe: { readonly x: number; readonly y: number; readonly largura: number; readonly altura: number };
  /** Topo do VOLTA (linha y), onde as almas do RE pousam. */
  readonly topoVolta: number;
}

const ESPACO_VOLTA = 2;
const ESPACO_RE = 1;
const MARGEM = 4;
const ALTURA_RE = GLIFOS_RE.R.length;
const ALTURA_VOLTA = GLIFOS_VOLTA.V.length;
/** Distância vertical entre o pé do RE e o topo do VOLTA. */
const VAO_RE_VOLTA = 4;
/** Espaço reservado abaixo do VOLTA para as raízes. */
const ESPACO_RAIZES = 6;

/** Hash determinístico (mesma logo sempre). */
function hash(x: number, y: number, sal: number): number {
  let h = (x * 374761393 + y * 668265263 + sal * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}

/** Junta glifos lado a lado numa máscara (conjunto de "x,y"). */
function montarPalavra(
  glifos: readonly Glifo[],
  espaco: number,
  x0: number,
  y0: number,
): { celulas: Set<string>; largura: number } {
  const celulas = new Set<string>();
  let x = x0;
  for (const glifo of glifos) {
    glifo.forEach((linha, dy) => {
      [...linha].forEach((c, dx) => {
        if (c === '#') celulas.add(`${x + dx},${y0 + dy}`);
      });
    });
    x += glifo[0].length + espaco;
  }
  return { celulas, largura: x - x0 - espaco };
}

const VIZINHOS_8 = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

/** Monta a logo inteira (determinística). */
export function montarLogo(): LogoMontada {
  const larguraVolta =
    (['V', 'O', 'L', 'T', 'A'] as const).reduce((s, l) => s + GLIFOS_VOLTA[l][0].length, 0) +
    4 * ESPACO_VOLTA;
  const largura = larguraVolta + MARGEM * 2;
  const yRe = MARGEM;
  const yVolta = yRe + ALTURA_RE + VAO_RE_VOLTA;
  const altura = yVolta + ALTURA_VOLTA + ESPACO_RAIZES + 1;
  const xVolta = MARGEM;
  // O RE fica sobre o "VO", recuado 2 px: lê-se RE → VOLTA.
  const xRe = xVolta + 2;

  const volta = montarPalavra(
    (['V', 'O', 'L', 'T', 'A'] as const).map((l) => GLIFOS_VOLTA[l]),
    ESPACO_VOLTA,
    xVolta,
    yVolta,
  );
  const re = montarPalavra([GLIFOS_RE.R, GLIFOS_RE.E], ESPACO_RE, xRe, yRe);

  const cheio = (mascara: Set<string>, x: number, y: number) => mascara.has(`${x},${y}`);

  // ------------------------------------------------------------- VOLTA (terra)
  const pixelsVolta = new Map<string, string>();
  const pintar = (x: number, y: number, cor: string) => {
    if (x < 0 || y < 0 || x >= largura || y >= altura) return;
    pixelsVolta.set(`${x},${y}`, cor);
  };

  // Sombra projetada (1 px para baixo e para a direita) e contorno.
  for (const chave of volta.celulas) {
    const [x, y] = chave.split(',').map(Number);
    pintar(x + 1, y + 2, CORES_LOGO.noite);
    for (const [dx, dy] of VIZINHOS_8) {
      if (!cheio(volta.celulas, x + dx, y + dy)) pintar(x + dx, y + dy, CORES_LOGO.noite);
    }
  }

  // Preenchimento em faixas (luz de cima) e bisel: topo claro, base e direita escuras.
  for (const chave of volta.celulas) {
    const [x, y] = chave.split(',').map(Number);
    const linha = y - yVolta;
    let cor: string = linha <= 1 ? CORES_LOGO.areia : linha <= 6 ? CORES_LOGO.barro : CORES_LOGO.madeira;
    if (!cheio(volta.celulas, x, y - 1)) cor = CORES_LOGO.areia;
    else if (!cheio(volta.celulas, x, y + 1) || !cheio(volta.celulas, x + 1, y)) {
      cor = linha <= 6 ? CORES_LOGO.madeira : CORES_LOGO.terraEscura;
    }
    pintar(x, y, cor);
  }

  // Rachaduras: pequenos riscos escuros no miolo dos traços (a terra ferida).
  for (const chave of volta.celulas) {
    const [x, y] = chave.split(',').map(Number);
    const miolo = VIZINHOS_8.every(([dx, dy]) => cheio(volta.celulas, x + dx, y + dy));
    if (miolo && y - yVolta >= 3 && hash(x, y, 1) < 0.07) {
      pintar(x, y, CORES_LOGO.oleo);
      if (cheio(volta.celulas, x + 1, y + 1)) pintar(x + 1, y + 1, CORES_LOGO.terraEscura);
    }
  }

  // Musgo no topo de cada traço, com pingos descendo pela face.
  const folhas: Ponto[] = [];
  for (const chave of volta.celulas) {
    const [x, y] = chave.split(',').map(Number);
    if (cheio(volta.celulas, x, y - 1)) continue;
    const r = hash(x, y, 2);
    if (r < 0.62) {
      pintar(x, y, r < 0.3 ? CORES_LOGO.broto : CORES_LOGO.verdeFolha);
      const pingo = Math.floor(hash(x, y, 3) * 4) - 1; // -1 a 2
      for (let d = 1; d <= pingo; d++) {
        if (!cheio(volta.celulas, x, y + d)) break;
        pintar(x, y + d, d === pingo ? CORES_LOGO.verdeProfundo : CORES_LOGO.verdeFolha);
      }
      if (hash(x, y, 4) < 0.28) folhas.push({ x, y: y - 1 });
    }
  }

  // Raízes saindo da base dos traços, descendo e virando de lado.
  for (const chave of volta.celulas) {
    const [x, y] = chave.split(',').map(Number);
    if (cheio(volta.celulas, x, y + 1) || hash(x, y, 5) > 0.3) continue;
    let rx = x;
    const comprimento = 2 + Math.floor(hash(x, y, 6) * (ESPACO_RAIZES - 1));
    for (let d = 1; d <= comprimento; d++) {
      if (d > 1 && hash(rx, y + d, 7) < 0.35) rx += hash(rx, y + d, 8) < 0.5 ? -1 : 1;
      pintar(rx, y + d, d === comprimento ? CORES_LOGO.madeira : CORES_LOGO.terraEscura);
    }
  }

  // ------------------------------------------------------------- RE (espírito)
  const pixelsRe = new Map<string, string>();
  for (const chave of re.celulas) {
    const [x, y] = chave.split(',').map(Number);
    for (const [dx, dy] of VIZINHOS_8) {
      if (!cheio(re.celulas, x + dx, y + dy)) pixelsRe.set(`${x + dx},${y + dy}`, CORES_LOGO.aguaLimpa);
    }
  }
  for (const chave of re.celulas) {
    const [x, y] = chave.split(',').map(Number);
    let cor: string = CORES_LOGO.totem;
    if (!cheio(re.celulas, x, y - 1) || y - yRe <= 1) cor = CORES_LOGO.luz;
    else if (!cheio(re.celulas, x, y + 1) || !cheio(re.celulas, x + 1, y)) cor = CORES_LOGO.reflexo;
    pixelsRe.set(chave, cor);
  }

  const paraLista = (mapa: Map<string, string>): PixelLogo[] =>
    [...mapa].map(([k, cor]) => {
      const [x, y] = k.split(',').map(Number);
      return { x, y, cor };
    });

  return {
    largura,
    altura,
    volta: paraLista(pixelsVolta),
    re: paraLista(pixelsRe),
    folhas,
    caixaRe: { x: xRe, y: yRe, largura: re.largura, altura: ALTURA_RE },
    topoVolta: yVolta,
  };
}
