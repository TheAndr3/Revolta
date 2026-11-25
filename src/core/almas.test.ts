import { describe, expect, it } from 'vitest';
import {
  atualizarDeslize,
  contarAlmasColetadas,
  criarEstadoFase,
  fecharProvaEmExibicao,
  matarProtagonista,
  solicitarDirecao,
  type EventoDeslize,
} from './deslize';
import { parseFase } from './parser';
import { calcularMarcas, contarMarcas } from './progresso';
import { resolverFase } from './solver';

function montarFase(grid: readonly string[]): ReturnType<typeof parseFase> {
  return parseFase(
    ['REVOLTA-FASE v1', 'LARGURA 15', `ALTURA ${grid.length}`, '[GRID]', ...grid, '[FIM]'].join('\n'),
  );
}

/**
 * Corredor de cima com 3 Almas e as 3 Provas; Saída embaixo à esquerda
 * (direita → esquerda → baixo); 1 Alma presa num bolsão fechado.
 */
const FASE_ALMAS = montarFase([
  '###############',
  '#@.o.o.123.o..#',
  '#.............#',
  '#.........###.#',
  '#X........#o#.#',
  '###############',
]);

function deslizarAteParar(estado: ReturnType<typeof criarEstadoFase>, direcao: Parameters<typeof solicitarDirecao>[1]): EventoDeslize[] {
  const eventos = [...solicitarDirecao(estado, direcao)];
  for (let i = 0; i < 120 && (estado.deslizando || estado.provaEmExibicao); i++) {
    if (estado.provaEmExibicao) eventos.push(...fecharProvaEmExibicao(estado));
    else eventos.push(...atualizarDeslize(estado, 1 / 60));
  }
  return eventos;
}

describe('Almas: leitura da Fase', () => {
  it('lê o símbolo "o" como Alma sobre chão, na ordem do grid', () => {
    expect(FASE_ALMAS.almas).toEqual([
      { col: 3, lin: 1 },
      { col: 5, lin: 1 },
      { col: 11, lin: 1 },
      { col: 11, lin: 4 },
    ]);
    expect(resolverFase(FASE_ALMAS).rotaMinima).toEqual(['direita', 'esquerda', 'baixo']);
    expect(FASE_ALMAS.grade[1][3]).toBe('chao');
  });
});

describe('Almas: coleta', () => {
  it('são pegas ao deslizar por cima, uma vez cada, com contagem no evento', () => {
    const estado = criarEstadoFase(FASE_ALMAS);
    const eventos = deslizarAteParar(estado, 'direita');
    const coletas = eventos.filter((e) => e.tipo === 'alma_coletada');

    expect(coletas.map((e) => (e.tipo === 'alma_coletada' ? e.coletadas : 0))).toEqual([1, 2, 3]);
    expect(coletas.every((e) => e.tipo === 'alma_coletada' && e.total === 4)).toBe(true);
    expect(contarAlmasColetadas(estado)).toBe(3);

    // Voltando pelo mesmo corredor, nada é contado de novo.
    const volta = deslizarAteParar(estado, 'esquerda');
    expect(volta.some((e) => e.tipo === 'alma_coletada')).toBe(false);
  });

  it('não voltam ao morrer (como as Provas)', () => {
    const estado = criarEstadoFase(FASE_ALMAS);
    deslizarAteParar(estado, 'direita');
    matarProtagonista(estado);
    expect(estado.mortes).toBe(1);
    expect(contarAlmasColetadas(estado)).toBe(3);
  });
});

describe('Almas: solver e Marcas', () => {
  it('o solver avisa sobre Almas inalcançáveis sem invalidar a Fase', () => {
    const resultado = resolverFase(FASE_ALMAS);
    expect(resultado.valida).toBe(true);
    expect(resultado.avisos).toEqual([
      '1 Alma(s) inalcançável(is): (11,4). Ninguém conseguirá a Marca de todas as Almas.',
    ]);
  });

  it('calcula as 3 Marcas: concluir, todas as Almas e todos os Habitantes', () => {
    const base = {
      concluida: true,
      melhorAlmas: 40,
      totalAlmas: 50,
      habitantesResgatados: 2,
      totalHabitantes: 3,
    };
    expect(calcularMarcas(base)).toEqual({ concluida: true, todasAsAlmas: false, habitantes: false });
    expect(contarMarcas(calcularMarcas(base))).toBe(1);

    const tudo = calcularMarcas({ ...base, melhorAlmas: 50, habitantesResgatados: 3 });
    expect(contarMarcas(tudo)).toBe(3);

    // Fase sem Habitantes: a Marca vem com a conclusão.
    expect(calcularMarcas({ ...base, habitantesResgatados: 0, totalHabitantes: 0 }).habitantes).toBe(true);

    // Fase sem Almas: a Marca vem com a conclusão.
    expect(calcularMarcas({ ...base, totalAlmas: 0, melhorAlmas: 0 }).todasAsAlmas).toBe(true);
    expect(calcularMarcas({ ...base, concluida: false, totalAlmas: 0 }).todasAsAlmas).toBe(false);
  });
});
