import { describe, expect, it } from 'vitest';
import {
  faltaParaEntrar,
  formatarDiferenca,
  formatarTempoRanking,
  inserirNoRanking,
  lerEntradasRanking,
  lerEnviosRanking,
  letrasValidas,
  mesclarPendentes,
  normalizarLetras,
  ordenarRanking,
  posicaoNoRanking,
  segundosParaMs,
  type EntradaRanking,
} from './ranking';

const entrada = (letras: string, tempoMs: number, gravadoEm = '2026-11-25T10:00:00.000Z'): EntradaRanking => ({
  letras,
  tempoMs,
  gravadoEm,
});

/** Top 10 cheio: 30 s, 31 s, ..., 39 s. */
const TOP_CHEIO = Array.from({ length: 10 }, (_, i) => entrada('AAA', 30_000 + i * 1000));

describe('formatação do tempo do Ranking', () => {
  it('mostra minutos, segundos e centésimos truncados', () => {
    expect(formatarTempoRanking(0)).toBe('0:00.00');
    expect(formatarTempoRanking(83_417)).toBe('1:23.41');
    expect(formatarTempoRanking(32_009)).toBe('0:32.00');
    expect(formatarTempoRanking(3_725_120)).toBe('1:02:05.12');
    expect(formatarTempoRanking(Number.NaN)).toBe('0:00.00');
  });

  it('converte segundos do jogo em milissegundos inteiros', () => {
    expect(segundosParaMs(32.4567)).toBe(32_457);
    expect(segundosParaMs(-1)).toBe(0);
    expect(segundosParaMs(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('mostra a diferença curta em segundos e a longa em minutos', () => {
    expect(formatarDiferenca(4_123)).toBe('4.12 s');
    expect(formatarDiferenca(63_500)).toBe('1:03.50');
  });
});

describe('letras do Ranking', () => {
  it('aceita só A–Z em maiúsculas, no máximo 3', () => {
    expect(normalizarLetras('and')).toBe('AND');
    expect(normalizarLetras('a1n-d!z')).toBe('AND');
    expect(normalizarLetras('ção')).toBe('CAO');
    expect(letrasValidas('AND')).toBe(true);
    expect(letrasValidas('AN')).toBe(false);
    expect(letrasValidas('and')).toBe(false);
  });
});

describe('ordem e entrada no Ranking', () => {
  it('ordena por tempo e, no empate, quem gravou antes fica na frente', () => {
    const ordenado = ordenarRanking([
      entrada('BBB', 40_000, '2026-11-25T12:00:00.000Z'),
      entrada('CCC', 35_000),
      entrada('AAA', 40_000, '2026-11-25T11:00:00.000Z'),
    ]);
    expect(ordenado.map((e) => e.letras)).toEqual(['CCC', 'AAA', 'BBB']);
  });

  it('corta no top 10 e deixa a mesma sigla aparecer mais de uma vez', () => {
    const ordenado = ordenarRanking([...TOP_CHEIO, entrada('AAA', 50_000)]);
    expect(ordenado).toHaveLength(10);
    expect(ordenado.every((e) => e.letras === 'AAA')).toBe(true);
  });

  it('com o Ranking vazio ou incompleto, qualquer tempo entra', () => {
    expect(posicaoNoRanking([], 999_999)).toBe(1);
    expect(posicaoNoRanking(TOP_CHEIO.slice(0, 3), 999_999)).toBe(4);
    expect(faltaParaEntrar(TOP_CHEIO.slice(0, 9), 999_999)).toBeNull();
  });

  it('com o Ranking cheio, entra só quem bate o 10º', () => {
    expect(posicaoNoRanking(TOP_CHEIO, 29_000)).toBe(1);
    expect(posicaoNoRanking(TOP_CHEIO, 34_500)).toBe(6);
    expect(posicaoNoRanking(TOP_CHEIO, 38_999)).toBe(10);
    // Empatar com o 10º não basta: quem gravou antes fica.
    expect(posicaoNoRanking(TOP_CHEIO, 39_000)).toBeNull();
    expect(faltaParaEntrar(TOP_CHEIO, 39_000)).toBe(1);
    expect(faltaParaEntrar(TOP_CHEIO, 43_120)).toBe(4_121);
    expect(faltaParaEntrar(TOP_CHEIO, 38_999)).toBeNull();
  });

  it('insere o tempo do jogador na posição certa antes de o servidor confirmar', () => {
    const novo = inserirNoRanking(TOP_CHEIO, entrada('NOV', 31_500, '2026-11-25T13:00:00.000Z'));
    expect(novo).toHaveLength(10);
    expect(novo[2].letras).toBe('NOV');
    expect(novo.at(-1)?.tempoMs).toBe(38_000);
  });

  it('mostra os envios pendentes da Fase junto com o Ranking salvo', () => {
    const top = mesclarPendentes(
      [entrada('AAA', 40_000)],
      [
        { id: '1', faseId: 'fase-01', letras: 'PEN', tempoMs: 32_000, criadoEm: '2026-11-25T14:00:00.000Z' },
        { id: '2', faseId: 'outra', letras: 'OUT', tempoMs: 1_000, criadoEm: '2026-11-25T14:00:00.000Z' },
      ],
      'fase-01',
    );
    expect(top.map((e) => e.letras)).toEqual(['PEN', 'AAA']);
  });
});

describe('leitura do servidor e do cache', () => {
  it('descarta entradas fora do formato', () => {
    const lidas = lerEntradasRanking([
      entrada('AAA', 40_000),
      { letras: 'aa', tempoMs: 1, gravadoEm: 'x' },
      { letras: 'BBB', tempoMs: 1.5, gravadoEm: 'x' },
      null,
      entrada('CCC', 35_000),
    ]);
    expect(lidas.map((e) => e.letras)).toEqual(['CCC', 'AAA']);
    expect(lerEntradasRanking('lixo')).toEqual([]);
  });

  it('lê a caixa de saída descartando envios corrompidos', () => {
    const envios = lerEnviosRanking([
      { id: '1', faseId: 'fase-01', letras: 'AND', tempoMs: 32_000, criadoEm: 'x' },
      { id: '2', faseId: 'fase-01', letras: 'an', tempoMs: 32_000, criadoEm: 'x' },
      { faseId: 'fase-01', letras: 'AND', tempoMs: 32_000, criadoEm: 'x' },
    ]);
    expect(envios.map((e) => e.id)).toEqual(['1']);
  });
});
