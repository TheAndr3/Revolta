/**
 * Ajudantes para pixel art desenhada em texto (Protagonista, Drone, Guarda): cada letra
 * de um desenho é uma cor de `art/paleta.hex`; '.' é transparente. Os quadros são
 * quadrados de `Q` px e a folha é montada em linhas e colunas de quadros.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPaletaHex } from '../src/core/paleta';
import { criarImagem, type ImagemRgba } from './png';

export const Q = 24;

export type Grade = string[][];
export type Ponto = readonly [number, number, string];

export const RAIZ = resolve(import.meta.dirname ?? '.', '..');

export function grade(linhas: readonly string[]): Grade {
  if (linhas.length !== Q) throw new Error(`Desenho com ${linhas.length} linhas; esperado ${Q}.`);
  return linhas.map((linha, i) => {
    if (linha.length !== Q) {
      throw new Error(`Linha ${i} com ${linha.length} colunas; esperado ${Q}: "${linha}"`);
    }
    return [...linha];
  });
}

export const clonar = (g: Grade): Grade => g.map((l) => [...l]);
export const vazia = (): Grade => Array.from({ length: Q }, () => Array<string>(Q).fill('.'));

export function pintar(g: Grade, pontos: readonly Ponto[]): Grade {
  const r = clonar(g);
  for (const [x, y, c] of pontos) if (x >= 0 && x < Q && y >= 0 && y < Q) r[y][x] = c;
  return r;
}

/** Move as linhas [de, ate] `dy` px (a parte de baixo cobre o que ficar por cima). */
export function moverFaixa(g: Grade, de: number, ate: number, dy: number): Grade {
  const r = clonar(g);
  for (let y = de; y <= ate; y++) for (let x = 0; x < Q; x++) r[y][x] = '.';
  const ordem = dy > 0 ? [...Array(ate - de + 1).keys()].reverse() : [...Array(ate - de + 1).keys()];
  for (const i of ordem) {
    const y = de + i;
    const ny = y + dy;
    if (ny < 0 || ny >= Q) continue;
    for (let x = 0; x < Q; x++) if (g[y][x] !== '.') r[ny][x] = g[y][x];
  }
  return r;
}

/** Tira linhas (achatamento) e completa por cima, mantendo os pés no lugar. */
export function tirarLinhas(g: Grade, linhas: readonly number[]): Grade {
  const restantes = g.filter((_, y) => !linhas.includes(y));
  const topo = Array.from({ length: linhas.length }, () => Array<string>(Q).fill('.'));
  return [...topo, ...restantes.map((l) => [...l])];
}

/** Tira colunas (achatamento lateral) e completa pela esquerda, mantendo a frente no lugar. */
export function tirarColunas(g: Grade, colunas: readonly number[]): Grade {
  return g.map((l) => [...Array(colunas.length).fill('.'), ...l.filter((_, x) => !colunas.includes(x))]);
}

/** Espelha na horizontal (troca esquerda e direita). */
export function espelhar(g: Grade): Grade {
  return g.map((l) => [...l].reverse());
}

/** Sobrepõe `cima` em `base` (pixels transparentes de `cima` não cobrem). */
export function sobrepor(base: Grade, cima: Grade): Grade {
  return base.map((l, y) => l.map((c, x) => (cima[y][x] !== '.' ? cima[y][x] : c)));
}

/** Número pseudoaleatório determinístico em [0, 1) para um pixel. */
export function hash(x: number, y: number, sal: number): number {
  let h = (x * 374761393 + y * 668265263 + sal * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}

/** Letra → RGB, a partir do nome das cores em art/paleta.hex. */
export function carregarCores(letras: Record<string, string>): Map<string, readonly [number, number, number]> {
  const paleta = lerPaletaHex(readFileSync(resolve(RAIZ, 'art/paleta.hex'), 'utf8'));
  const rgb = new Map<string, readonly [number, number, number]>();
  for (const [letra, nome] of Object.entries(letras)) {
    const cor = paleta.find((c) => c.nome === nome);
    if (!cor) throw new Error(`Cor "${nome}" não está em art/paleta.hex.`);
    const h = cor.hex;
    rgb.set(letra, [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
  }
  return rgb;
}

/** Monta a folha: `linhas[i][j]` é o quadro da linha i, coluna j. */
export function montarFolha(
  linhas: ReadonlyArray<readonly Grade[]>,
  colunas: number,
  cores: Map<string, readonly [number, number, number]>,
): ImagemRgba {
  const folha = criarImagem(colunas * Q, linhas.length * Q);
  linhas.forEach((quadros, linha) => {
    if (quadros.length > colunas) throw new Error(`Linha ${linha} com ${quadros.length} quadros; máximo ${colunas}.`);
    quadros.forEach((g, coluna) => {
      for (let y = 0; y < Q; y++) {
        for (let x = 0; x < Q; x++) {
          const c = g[y][x];
          if (c === '.') continue;
          const cor = cores.get(c);
          if (!cor) throw new Error(`Letra "${c}" sem cor.`);
          const i = ((linha * Q + y) * folha.largura + coluna * Q + x) * 4;
          folha.dados.set([...cor, 255], i);
        }
      }
    });
  });
  return folha;
}

/** Cópia ampliada sobre fundos de trilha e de mata alternados, com a grade dos quadros. */
export function previa(folha: ImagemRgba, zoom: number): ImagemRgba {
  const out = criarImagem(folha.largura * zoom, folha.altura * zoom);
  const fundoA = [0xc9, 0xa2, 0x8c];
  const fundoB = [0x1a, 0x26, 0x20];
  for (let y = 0; y < out.altura; y++) {
    for (let x = 0; x < out.largura; x++) {
      const sx = Math.floor(x / zoom);
      const sy = Math.floor(y / zoom);
      const qx = Math.floor(sx / Q);
      const i = (sy * folha.largura + sx) * 4;
      const o = (y * out.largura + x) * 4;
      const fundo = qx % 2 === 0 ? fundoA : fundoB;
      const borda = sx % Q === 0 || sy % Q === 0;
      if (folha.dados[i + 3] > 0) out.dados.set(folha.dados.subarray(i, i + 4), o);
      else out.dados.set([...(borda ? [0x55, 0x55, 0x55] : fundo), 255], o);
    }
  }
  return out;
}

/** Caminho passado em `--previa <arquivo.png>`, se houver. */
export function argumentoPrevia(): string | null {
  const i = process.argv.indexOf('--previa');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}
