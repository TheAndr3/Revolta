import { describe, expect, it } from 'vitest';
import { avaliarAmeacaNoTempo, compilarCicloAmeaca } from './ameacas';
import {
  atualizarDeslize,
  criarEstadoFase,
  posicoesAmeacasAtuais,
  solicitarDirecao,
} from './deslize';
import { parseFase } from './parser';

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

/**
 * Ronda em loop no retângulo (3,2)-(9,5) a 5 tiles/s, pausando 1 s em v1 e 0,5 s em (9,5).
 * Perímetro 18 tiles = 3,6 s + 1,5 s de pausas = 5,1 s.
 */
const FASE_RONDA_LOOP = parseFase(
  montarFase(
    [
      '###############',
      '#.............#',
      '#..R..........#',
      '#.............#',
      '#.............#',
      '#.............#',
      '#@...........X#',
      '###############',
    ],
    ['R1 | loop | 5 | 3,2 9,2 9,5 3,5 | 3,2=1 9,5=0.5'],
  ),
);

/**
 * Vai-e-volta 2,1 → 6,1 → 6,4 com pausa de 1 s no vértice do meio (6,1).
 * Linha do tempo: anda 0–0,8 · pausa 0,8–1,8 · desce 1,8–2,4 · sobe 2,4–3,0 ·
 * pausa 3,0–4,0 · volta 4,0–4,8.
 */
const FASE_RONDA_VAI_E_VOLTA = parseFase(
  montarFase(
    [
      '###############',
      '#.R...........#',
      '#.............#',
      '#.............#',
      '#.............#',
      '#@...........X#',
      '###############',
    ],
    ['R1 | vai-e-volta | 5 | 2,1 6,1 6,4 | 6,1=1'],
  ),
);

/** Guarda parado 2 s em v1 (5,1), na linha por onde o Protagonista desliza. */
const FASE_GUARDA_NO_CAMINHO = parseFase(
  montarFase(
    [
      '###############',
      '#@...R........#',
      '#.............#',
      '#.............#',
      '#............X#',
      '###############',
    ],
    ['R1 | vai-e-volta | 5 | 5,1 5,3 | 5,1=2'],
  ),
);

describe('Guarda Florestal: ronda com pausas', () => {
  const ciclo = compilarCicloAmeaca(FASE_RONDA_LOOP.ameacas[0]);

  it('soma as pausas ao período da ronda', () => {
    expect(ciclo.duracaoTotalSegundos).toBeCloseTo(5.1);
  });

  it('espera a pausa de v1 antes de partir (t = 0 é o início da pausa)', () => {
    for (const t of [0, 0.5, 0.99]) {
      const estado = avaliarAmeacaNoTempo(ciclo, t);
      expect(estado.pausada).toBe(true);
      expect(estado.posicao).toEqual({ x: 3, y: 2 });
    }
    const partindo = avaliarAmeacaNoTempo(ciclo, 1.6);
    expect(partindo.pausada).toBe(false);
    expect(partindo.direcao).toBe('direita');
    expect(partindo.posicao.x).toBeCloseTo(6);
  });

  it('para pelo tempo definido em cada ponto marcado e segue a ronda', () => {
    // Chega a (9,5) em 1 + 1,2 + 0,6 = 2,8 s e fica até 3,3 s.
    const parado = avaliarAmeacaNoTempo(ciclo, 3.0);
    expect(parado.pausada).toBe(true);
    expect(parado.posicao).toEqual({ x: 9, y: 5 });

    const seguindo = avaliarAmeacaNoTempo(ciclo, 3.5);
    expect(seguindo.pausada).toBe(false);
    expect(seguindo.direcao).toBe('esquerda');
    expect(seguindo.posicao.x).toBeCloseTo(8);
  });

  it('volta a pausar em v1 a cada ciclo', () => {
    const proximoCiclo = avaliarAmeacaNoTempo(ciclo, 5.1 + 0.5);
    expect(proximoCiclo.pausada).toBe(true);
    expect(proximoCiclo.posicao).toEqual({ x: 3, y: 2 });
  });

  it('em vai-e-volta, pausa no vértice marcado na ida e na volta', () => {
    const vaiEVolta = compilarCicloAmeaca(FASE_RONDA_VAI_E_VOLTA.ameacas[0]);
    expect(vaiEVolta.duracaoTotalSegundos).toBeCloseTo(4.8);

    const naIda = avaliarAmeacaNoTempo(vaiEVolta, 1.2);
    const naVolta = avaliarAmeacaNoTempo(vaiEVolta, 3.5);
    expect(naIda.pausada).toBe(true);
    expect(naVolta.pausada).toBe(true);
    expect(naIda.posicao).toEqual({ x: 6, y: 1 });
    expect(naVolta.posicao).toEqual({ x: 6, y: 1 });

    expect(avaliarAmeacaNoTempo(vaiEVolta, 2.0).direcao).toBe('baixo');
    expect(avaliarAmeacaNoTempo(vaiEVolta, 4.4).direcao).toBe('esquerda');
  });
});

describe('Guarda Florestal: direção para a animação', () => {
  const ciclo = compilarCicloAmeaca(FASE_RONDA_LOOP.ameacas[0]);

  it('expõe a direção de cada trecho da ronda nas 4 direções', () => {
    expect(avaliarAmeacaNoTempo(ciclo, 1.5).direcao).toBe('direita');
    expect(avaliarAmeacaNoTempo(ciclo, 2.5).direcao).toBe('baixo');
    expect(avaliarAmeacaNoTempo(ciclo, 4.0).direcao).toBe('esquerda');
    expect(avaliarAmeacaNoTempo(ciclo, 4.9).direcao).toBe('cima');
  });

  it('durante a pausa, mantém a direção em que chegou ao ponto', () => {
    expect(avaliarAmeacaNoTempo(ciclo, 3.0).direcao).toBe('baixo');
    expect(avaliarAmeacaNoTempo(ciclo, 0.5).direcao).toBe('cima');
  });
});

describe('Guarda Florestal: contato e determinismo', () => {
  it('mata ao contato, inclusive parado na pausa', () => {
    const estado = criarEstadoFase(FASE_GUARDA_NO_CAMINHO);
    solicitarDirecao(estado, 'direita');
    atualizarDeslize(estado, 0.3);
    expect(estado.mortes).toBe(1);
    expect(estado.celulaAtual).toEqual(FASE_GUARDA_NO_CAMINHO.inicio);
  });

  it('recomeça a ronda do zero após a morte (igual em toda tentativa)', () => {
    const estado = criarEstadoFase(FASE_GUARDA_NO_CAMINHO);
    const naPrimeiraTentativa = posicoesAmeacasAtuais(estado)[0];

    solicitarDirecao(estado, 'direita');
    atualizarDeslize(estado, 0.3);
    expect(estado.mortes).toBe(1);
    expect(estado.tempoCicloSegundos).toBe(0);
    expect(posicoesAmeacasAtuais(estado)[0]).toEqual(naPrimeiraTentativa);
    expect(naPrimeiraTentativa).toMatchObject({ posicao: { x: 5, y: 1 }, pausada: true });
  });
});
