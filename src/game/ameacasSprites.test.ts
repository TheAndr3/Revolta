import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lerPng } from '../../scripts/png';
import { lerPaletaHex } from '../core/paleta';
import { COLUNAS_GUARDA, SPRITES_DRONE, SPRITES_GUARDA } from './ameacasSprites';
import { COLUNAS_HABITANTE, SPRITES_HABITANTES } from './habitantesSprites';

const raiz = resolve(__dirname, '../..');
const paleta = new Set(
  lerPaletaHex(readFileSync(resolve(raiz, 'art/paleta.hex'), 'utf8')).map((c) => c.hex),
);

describe.each([
  ['Drone', SPRITES_DRONE, SPRITES_DRONE.quadrosHelice],
  ['Guarda', SPRITES_GUARDA, COLUNAS_GUARDA.andar.length + COLUNAS_GUARDA.parado.length],
  ['Habitantes', SPRITES_HABITANTES, COLUNAS_HABITANTE.medo.length + COLUNAS_HABITANTE.alivio.length],
] as const)('spritesheet do %s', (_nome, folha, quadrosPorLinha) => {
  const png = lerPng(readFileSync(resolve(raiz, 'public', folha.arquivo)));

  it('tem o tamanho do layout', () => {
    expect(png.largura).toBe(folha.colunas * folha.quadroPx);
    expect(png.altura).toBe(folha.linhas * folha.quadroPx);
    expect(quadrosPorLinha).toBeLessThanOrEqual(folha.colunas);
  });

  it('usa só cores da paleta, sem semitransparência', () => {
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

  it('não tem quadro vazio', () => {
    const q = folha.quadroPx;
    for (let linha = 0; linha < folha.linhas; linha++) {
      for (let coluna = 0; coluna < quadrosPorLinha; coluna++) {
        let opacos = 0;
        for (let y = 0; y < q; y++) {
          for (let x = 0; x < q; x++) {
            if (png.dados[((linha * q + y) * png.largura + coluna * q + x) * 4 + 3] > 0) opacos++;
          }
        }
        expect(opacos, `linha ${linha}, coluna ${coluna}`).toBeGreaterThan(40);
      }
    }
  });
});
