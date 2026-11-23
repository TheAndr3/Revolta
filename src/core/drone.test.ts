import { describe, expect, it } from 'vitest';
import { avaliarAmeacaNoTempo, compilarCicloAmeaca } from './ameacas';
import { CONFIG } from './config';
import {
  atualizarDeslize,
  criarEstadoFase,
  distanciaAteAmeacaMaisProxima,
  posicoesAmeacasAtuais,
} from './deslize';
import { ErroParseFase, parseFase } from './parser';

function montarFase(grid: readonly string[], ameacas: readonly string[]): string {
  return [
    'REVOLTA-FASE v1',
    'LARGURA 15',
    `ALTURA ${grid.length}`,
    '[GRID]',
    ...grid,
    '[AMEACAS]',
    ...ameacas,
    '[FIM]',
  ].join('\n');
}

/** Drone na coluna 9, indo da linha 2 à linha 10 (8 tiles). */
const GRID_CORREDOR = [
  '###############',
  '#.............#',
  '#........D....#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#@...........X#',
  '###############',
];

const FASE_CORREDOR = parseFase(
  montarFase(GRID_CORREDOR, ['D1 | vai-e-volta | 10 | 9,2 9,10 | -']),
);

/** Protagonista parado em (1,1), no fim do trilho de um Drone que parte de (1,3). */
const FASE_ENCONTRO = parseFase(
  montarFase(
    [
      '###############',
      '#@...........X#',
      '#.............#',
      '#D............#',
      '###############',
    ],
    ['D1 | vai-e-volta | 10 | 1,3 1,1 | -'],
  ),
);

describe('Drone Desmatador: movimento', () => {
  const ciclo = compilarCicloAmeaca(FASE_CORREDOR.ameacas[0]);

  it('tem período de ida e volta = 2 × distância ÷ velocidade', () => {
    expect(ciclo.duracaoTotalSegundos).toBeCloseTo((2 * 8) / 10);
  });

  it('vai e volta entre as pontas do trilho, em linha reta', () => {
    const amostras = [0, 0.4, 0.8, 1.2, 1.6].map((t) => avaliarAmeacaNoTempo(ciclo, t));
    const esperado = [2, 6, 10, 6, 2];
    amostras.forEach((amostra, i) => {
      expect(amostra.posicao.x).toBe(9);
      expect(amostra.posicao.y).toBeCloseTo(esperado[i]);
    });
    expect(amostras[1].direcao).toBe('baixo');
    expect(amostras[3].direcao).toBe('cima');
    expect(amostras.every((a) => !a.pausada)).toBe(true);
  });

  it('é determinístico: o mesmo instante do ciclo dá a mesma posição', () => {
    for (const t of [0.13, 0.5, 1.37]) {
      const base = avaliarAmeacaNoTempo(ciclo, t).posicao;
      expect(avaliarAmeacaNoTempo(ciclo, t + ciclo.duracaoTotalSegundos * 3).posicao.y).toBeCloseTo(
        base.y,
      );
      expect(avaliarAmeacaNoTempo(ciclo, t).posicao).toEqual(base);
    }
  });
});

describe('Drone Desmatador: velocidade', () => {
  it('usa a velocidade declarada na Fase', () => {
    const fase = parseFase(montarFase(GRID_CORREDOR, ['D1 | vai-e-volta | 12.5 | 9,2 9,10 | -']));
    expect(fase.ameacas[0].velocidadeTilesPorSegundo).toBe(12.5);
  });

  it('usa a velocidade de referência da config quando a Fase escreve "-"', () => {
    const fase = parseFase(montarFase(GRID_CORREDOR, ['D1 | vai-e-volta | - | 9,2 9,10 | -']));
    expect(fase.ameacas[0].velocidadeTilesPorSegundo).toBe(
      CONFIG.velocidadeReferenciaAmeacaTilesPorSegundo.drone,
    );
  });

  it('rejeita rota que não seja vai-e-volta com 2 vértices', () => {
    expect(() =>
      parseFase(montarFase(GRID_CORREDOR, ['D1 | loop | 10 | 9,2 9,10 12,10 12,2 | -'])),
    ).toThrow(ErroParseFase);
    expect(() =>
      parseFase(montarFase(GRID_CORREDOR, ['D1 | vai-e-volta | 10 | 9,2 9,6 9,10 | -'])),
    ).toThrow(ErroParseFase);
  });
});

describe('Drone Desmatador: contato e reinício', () => {
  it('mata ao encostar e o Protagonista volta ao início', () => {
    const estado = criarEstadoFase(FASE_ENCONTRO);

    // O contato ocorre a 0,65 tile: (2 − 0,65) ÷ 10 = 0,135 s.
    atualizarDeslize(estado, 0.1);
    expect(estado.mortes).toBe(0);

    atualizarDeslize(estado, 0.1);
    expect(estado.mortes).toBe(1);
    expect(estado.celulaAtual).toEqual(FASE_ENCONTRO.inicio);
  });

  it('reinicia o ciclo do zero depois da morte (igual em toda tentativa)', () => {
    const estado = criarEstadoFase(FASE_ENCONTRO);
    const inicial = posicoesAmeacasAtuais(estado)[0].posicao;

    atualizarDeslize(estado, 0.2);
    expect(estado.mortes).toBe(1);
    expect(estado.tempoCicloSegundos).toBe(0);
    expect(posicoesAmeacasAtuais(estado)[0].posicao).toEqual(inicial);

    atualizarDeslize(estado, 0.2);
    expect(estado.mortes).toBe(2);
  });
});

describe('Drone Desmatador: distância para o áudio do motor', () => {
  it('mede a distância até o Drone mais próximo e acompanha o movimento', () => {
    const estado = criarEstadoFase(FASE_CORREDOR);
    // Protagonista em (1,11); Drone em (9,2).
    expect(distanciaAteAmeacaMaisProxima(estado, 'drone')).toBeCloseTo(Math.hypot(8, 9));

    atualizarDeslize(estado, 0.4); // Drone em (9,6)
    expect(distanciaAteAmeacaMaisProxima(estado, 'drone')).toBeCloseTo(Math.hypot(8, 5));
  });

  it('devolve null quando a Fase não tem Ameaça do tipo', () => {
    const estado = criarEstadoFase(FASE_CORREDOR);
    expect(distanciaAteAmeacaMaisProxima(estado, 'gosma')).toBeNull();
  });
});
