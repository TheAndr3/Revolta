import { describe, expect, it } from 'vitest';
import {
  avaliarAmeacaNoTempo,
  colideComAmeaca,
  compilarCicloAmeaca,
} from './ameacas';
import { parseFase } from './parser';

const FASE_GOSMA = parseFase(
  [
    'REVOLTA-FASE v1',
    'LARGURA 11',
    'ALTURA 6',
    '[GRID]',
    '###########',
    '#@........#',
    '#..G......#',
    '#.........#',
    '#........X#',
    '###########',
    '[AMEACAS]',
    'G1 | loop | 3 | 3,2 7,2 7,3 3,3 | -',
    '[FIM]',
  ].join('\n'),
);

const FASE_GUARDA_PAUSA = parseFase(
  [
    'REVOLTA-FASE v1',
    'LARGURA 10',
    'ALTURA 4',
    '[GRID]',
    '##########',
    '#@..R....#',
    '#.......X#',
    '##########',
    '[AMEACAS]',
    'R1 | vai-e-volta | 4 | 4,1 8,1 | 8,1=1.5',
    '[FIM]',
  ].join('\n'),
);

describe('trilhos determinísticos de Ameaças', () => {
  it('calcula a posição da Gosma Tóxica como função pura do tempo ao longo do loop completo', () => {
    const gosma = FASE_GOSMA.ameacas[0];
    const ciclo = compilarCicloAmeaca(gosma);

    // Perímetro: 4 + 1 + 4 + 1 = 10 tiles a 3 tiles/s -> 10/3 segundos por volta
    expect(ciclo.duracaoTotalSegundos).toBeCloseTo(10 / 3, 6);

    const t0 = avaliarAmeacaNoTempo(ciclo, 0);
    expect(t0.posicao).toEqual({ x: 3, y: 2 });
    expect(t0.direcao).toBe('direita');

    // Após 2/3 s: 2 tiles para a direita -> (5, 2)
    const tMeioTopo = avaliarAmeacaNoTempo(ciclo, 2 / 3);
    expect(tMeioTopo.posicao.x).toBeCloseTo(5, 5);
    expect(tMeioTopo.posicao.y).toBeCloseTo(2, 5);

    // Após 4/3 s: vértice (7, 2)
    const tCanto = avaliarAmeacaNoTempo(ciclo, 4 / 3);
    expect(tCanto.posicao.x).toBeCloseTo(7, 5);
    expect(tCanto.posicao.y).toBeCloseTo(2, 5);

    // Após 5/3 s: vértice (7, 3)
    const tCantoInferior = avaliarAmeacaNoTempo(ciclo, 5 / 3);
    expect(tCantoInferior.posicao.x).toBeCloseTo(7, 5);
    expect(tCantoInferior.posicao.y).toBeCloseTo(3, 5);

    // Após 1 volta completa (10/3 s): retorna exatamente à posição inicial (3, 2)
    const tVolta = avaliarAmeacaNoTempo(ciclo, 10 / 3);
    expect(tVolta.posicao.x).toBeCloseTo(3, 5);
    expect(tVolta.posicao.y).toBeCloseTo(2, 5);

    // Determinismo em múltiplas voltas: t + N*ciclo == t
    const tSegundaVolta = avaliarAmeacaNoTempo(ciclo, 10 / 3 + 2 / 3);
    expect(tSegundaVolta.posicao.x).toBeCloseTo(tMeioTopo.posicao.x, 5);
    expect(tSegundaVolta.posicao.y).toBeCloseTo(tMeioTopo.posicao.y, 5);
  });

  it('suporta ciclo vai-e-volta com pausa determinística em vértice', () => {
    const guarda = FASE_GUARDA_PAUSA.ameacas[0];
    const ciclo = compilarCicloAmeaca(guarda);

    // Ida (4 tiles / 4 = 1s) + pausa (1.5s) + volta (4 tiles / 4 = 1s) = 3.5s
    expect(ciclo.duracaoTotalSegundos).toBeCloseTo(3.5, 6);

    const durantePausa = avaliarAmeacaNoTempo(ciclo, 1.8);
    expect(durantePausa.pausada).toBe(true);
    expect(durantePausa.posicao).toEqual({ x: 8, y: 1 });

    const voltando = avaliarAmeacaNoTempo(ciclo, 3.0);
    expect(voltando.pausada).toBe(false);
    expect(voltando.direcao).toBe('esquerda');
    expect(voltando.posicao.x).toBeCloseTo(6, 5);
  });

  it('detecta colisão por contato sem falso positivo em trilho paralelo adjacente', () => {
    expect(colideComAmeaca({ x: 5, y: 2 }, { x: 5, y: 2 })).toBe(true);
    expect(colideComAmeaca({ x: 5, y: 2 }, { x: 5.5, y: 2 })).toBe(true);
    // Linha adjacente (distância 1.0 tile) é segura
    expect(colideComAmeaca({ x: 5, y: 2 }, { x: 5, y: 3 })).toBe(false);
    expect(colideComAmeaca({ x: 5, y: 2 }, { x: 6, y: 2 })).toBe(false);
  });
});
