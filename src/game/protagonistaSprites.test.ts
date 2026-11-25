import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lerPng } from '../../scripts/png';
import { lerPaletaHex } from '../core/paleta';
import {
  COLUNAS_ACAO,
  QUADROS_MORTE,
  SPRITES_PROTAGONISTA,
  distanciaDoDeslize,
  indiceQuadro,
  intensidadeDoImpacto,
  olharDaDirecao,
} from './protagonistaSprites';

const raiz = resolve(__dirname, '../..');

describe('olharDaDirecao', () => {
  it('olha de frente ao descer, de costas ao subir e de lado (espelhado à esquerda)', () => {
    expect(olharDaDirecao('baixo')).toEqual({ olhar: 'frente', espelhar: false });
    expect(olharDaDirecao('cima')).toEqual({ olhar: 'costas', espelhar: false });
    expect(olharDaDirecao('direita')).toEqual({ olhar: 'lado', espelhar: false });
    expect(olharDaDirecao('esquerda')).toEqual({ olhar: 'lado', espelhar: true });
  });
});

describe('distanciaDoDeslize', () => {
  it('conta os tiles até o destino', () => {
    expect(distanciaDoDeslize({ x: 2, y: 10 }, { col: 2, lin: 3 })).toBe(7);
    expect(distanciaDoDeslize({ x: 2, y: 3 }, { col: 9, lin: 3 })).toBe(7);
  });

  it('é zero sem destino', () => {
    expect(distanciaDoDeslize({ x: 2, y: 3 }, null)).toBe(0);
  });
});

describe('intensidadeDoImpacto', () => {
  it('é zero para deslizes de até 1 tile e cresce até 1', () => {
    expect(intensidadeDoImpacto(0)).toBe(0);
    expect(intensidadeDoImpacto(1)).toBe(0);
    expect(intensidadeDoImpacto(4.5)).toBeCloseTo(0.5);
    expect(intensidadeDoImpacto(8)).toBe(1);
    expect(intensidadeDoImpacto(30)).toBe(1);
  });

  it('não quebra com distância inválida', () => {
    expect(intensidadeDoImpacto(Number.NaN)).toBe(0);
  });
});

describe('spritesheet gerada', () => {
  const png = lerPng(readFileSync(resolve(raiz, 'public', SPRITES_PROTAGONISTA.arquivo)));
  const { quadroPx, colunas, linhas } = SPRITES_PROTAGONISTA;

  it('tem o tamanho do layout', () => {
    expect(png.largura).toBe(colunas * quadroPx);
    expect(png.altura).toBe(linhas * quadroPx);
    const quadrosPorOlhar = Object.values(COLUNAS_ACAO).flat().length;
    expect(quadrosPorOlhar).toBeLessThanOrEqual(colunas);
    expect(QUADROS_MORTE).toBeLessThanOrEqual(colunas);
  });

  it('usa só cores da paleta, sem semitransparência (pixel art)', () => {
    const paleta = new Set(lerPaletaHex(readFileSync(resolve(raiz, 'art/paleta.hex'), 'utf8')).map((c) => c.hex));
    const fora = new Set<string>();
    let semitransparentes = 0;
    for (let i = 0; i < png.dados.length; i += 4) {
      const a = png.dados[i + 3];
      if (a !== 0 && a !== 255) semitransparentes++;
      if (a === 0) continue;
      const hex = [png.dados[i], png.dados[i + 1], png.dados[i + 2]]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
      if (!paleta.has(hex)) fora.add(hex);
    }
    expect([...fora]).toEqual([]);
    expect(semitransparentes).toBe(0);
  });

  it('não tem quadro vazio nas poses (só o último da morte é vazio)', () => {
    const vazio = (indice: number) => {
      const qx = (indice % colunas) * quadroPx;
      const qy = Math.floor(indice / colunas) * quadroPx;
      for (let y = 0; y < quadroPx; y++) {
        for (let x = 0; x < quadroPx; x++) {
          if (png.dados[((qy + y) * png.largura + qx + x) * 4 + 3] > 0) return false;
        }
      }
      return true;
    };
    for (let linha = 0; linha < 3; linha++) {
      for (const coluna of Object.values(COLUNAS_ACAO).flat()) {
        expect(vazio(indiceQuadro(linha, coluna)), `linha ${linha}, coluna ${coluna}`).toBe(false);
      }
    }
    expect(vazio(indiceQuadro(3, QUADROS_MORTE - 1))).toBe(true);
  });
});
