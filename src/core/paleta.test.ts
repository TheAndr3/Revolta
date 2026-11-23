import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hexParaRgb, lerPaletaHex, MAXIMO_CORES_PALETA, MINIMO_CORES_PALETA } from './paleta';

function paletaCom(n: number): string {
  return Array.from({ length: n }, (_, i) => i.toString(16).padStart(6, '0')).join('\n');
}

describe('paleta do kit de estilo', () => {
  it('a art/paleta.hex do projeto tem de 24 a 32 cores, todas nomeadas e agrupadas', () => {
    const cores = lerPaletaHex(readFileSync(resolve(process.cwd(), 'art/paleta.hex'), 'utf-8'));
    expect(cores.length).toBeGreaterThanOrEqual(MINIMO_CORES_PALETA);
    expect(cores.length).toBeLessThanOrEqual(MAXIMO_CORES_PALETA);
    for (const cor of cores) {
      expect(cor.nome, `#${cor.hex} sem nome`).not.toBe('');
      expect(cor.grupo, `#${cor.hex} sem grupo`).not.toBe('');
    }
    // Grupos pedidos na issue #3.
    const grupos = new Set(cores.map((c) => c.grupo));
    expect(grupos).toContain('floresta viva');
    expect(grupos).toContain('floresta contaminada');
    expect(grupos).toContain('empresa');
  });

  it('lê hex com ou sem "#" e o comentário "nome · grupo · uso"', () => {
    const [cor] = lerPaletaHex(
      ['; comentário', '#A3B83A ; gosma · floresta contaminada · corpo da Gosma', paletaCom(23)].join(
        '\n',
      ),
    );
    expect(cor).toEqual({ hex: 'a3b83a', nome: 'gosma', grupo: 'floresta contaminada', uso: 'corpo da Gosma' });
    expect(hexParaRgb(cor.hex)).toEqual([163, 184, 58]);
  });

  it('rejeita cor inválida, cor repetida e paleta fora do tamanho', () => {
    expect(() => lerPaletaHex(`zzzzzz\n${paletaCom(24)}`)).toThrow(/linha 1/);
    expect(() => lerPaletaHex(`000000\n${paletaCom(24)}`)).toThrow(/repetidas: #000000/);
    expect(() => lerPaletaHex(paletaCom(MINIMO_CORES_PALETA - 1))).toThrow(/de 24 a 32/);
    expect(() => lerPaletaHex(paletaCom(MAXIMO_CORES_PALETA + 1))).toThrow(/de 24 a 32/);
  });
});
