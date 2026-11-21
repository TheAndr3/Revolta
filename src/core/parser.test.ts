import { describe, expect, it } from 'vitest';
import { parseFase } from './parser';

const MINI_FASE = [
  '; comentario',
  'REVOLTA-FASE v1',
  'LARGURA 5',
  'ALTURA 5',
  '[GRID]',
  '#####',
  '#@..#',
  '#.#.#',
  '#..X#',
  '#####',
  '[FIM]',
].join('\n');

describe('parseFase', () => {
  it('converte texto da legenda para o formato interno neutro com inicio e saida', () => {
    const fase = parseFase(MINI_FASE);

    expect(fase.largura).toBe(5);
    expect(fase.altura).toBe(5);
    expect(fase.inicio).toEqual({ col: 1, lin: 1 });
    expect(fase.saida).toEqual({ col: 3, lin: 3 });
    expect(fase.grade[0][0]).toBe('parede');
    expect(fase.grade[1][1]).toBe('inicio');
    expect(fase.grade[1][2]).toBe('chao');
    expect(fase.grade[2][2]).toBe('parede');
    expect(fase.grade[3][3]).toBe('saida');
  });

  it('rejeita caractere invalido indicando linha e coluna', () => {
    const invalida = MINI_FASE.replace('#.#.#', '#.? #');
    expect(() => parseFase(invalida)).toThrow(/linha 3.*coluna 3/i);
  });

  it('exige exatamente um inicio (@) e uma saida (X)', () => {
    const semSaida = MINI_FASE.replace('X', '.');
    expect(() => parseFase(semSaida)).toThrow(/saída|saida/i);

    const doisInicios = MINI_FASE.replace('#..X#', '#@.X#');
    expect(() => parseFase(doisInicios)).toThrow(/início|inicio/i);
  });
});
