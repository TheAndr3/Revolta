import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  atualizarDeslize,
  criarEstadoFase,
  fecharProvaEmExibicao,
  solicitarDirecao,
} from './deslize';
import { parseFase } from './parser';
import { resolverFase } from './solver';

function montarFase(grid: readonly string[], ameacas: readonly string[] = []): string {
  return [
    'REVOLTA-FASE v1',
    'LARGURA 15',
    `ALTURA ${grid.length}`,
    '[GRID]',
    ...grid,
    ...(ameacas.length > 0 ? ['[AMEACAS]', ...ameacas] : []),
    '[FIM]',
  ].join('\n');
}

const FASE_TESTE = parseFase(
  readFileSync(resolve(process.cwd(), 'public/fases/fase-00-teste.txt'), 'utf-8'),
);

describe('solver estático', () => {
  it('valida a Fase de teste e a rota mínima realmente conclui a Fase no núcleo', () => {
    const resultado = resolverFase(FASE_TESTE);
    expect(resultado.erros).toEqual([]);
    expect(resultado.avisos).toEqual([]);
    expect(resultado.valida).toBe(true);
    expect(resultado.rotaMinima).not.toBeNull();

    // Reproduz a rota no núcleo do jogo (sem Ameaças) e confere que a Fase termina.
    const estado = criarEstadoFase(FASE_TESTE, { simularAmeacas: false });
    for (const direcao of resultado.rotaMinima ?? []) {
      solicitarDirecao(estado, direcao);
      for (let i = 0; i < 64 && (estado.deslizando || estado.provaEmExibicao); i++) {
        if (estado.provaEmExibicao) fecharProvaEmExibicao(estado);
        else atualizarDeslize(estado, 1);
      }
    }
    expect(estado.concluida).toBe(true);
    expect(estado.provasColetadas.sort()).toEqual([1, 2, 3]);
  });

  it('a proposta da Fase 1 é válida, sem avisos, e todo Deslize às cegas termina seguro', () => {
    const fase = parseFase(
      readFileSync(resolve(process.cwd(), 'public/fases/fase-01.txt'), 'utf-8'),
    );
    const resultado = resolverFase(fase);
    expect(resultado.erros).toEqual([]);
    expect(resultado.avisos).toEqual([]);
    expect(fase.altura).toBeGreaterThanOrEqual(60); // R14: 60–100 linhas
    expect(fase.almas.length).toBeGreaterThan(0);
  });

  it('a Fase 1 é jogável de ponta a ponta com os espinhos ligados, reagindo sem demora', () => {
    const fase = parseFase(
      readFileSync(resolve(process.cwd(), 'public/fases/fase-01.txt'), 'utf-8'),
    );
    const rota = resolverFase(fase).rotaMinima ?? [];
    const estado = criarEstadoFase(fase); // espinhos ligados, como no jogo
    for (const direcao of rota) {
      solicitarDirecao(estado, direcao);
      for (let i = 0; i < 600 && (estado.deslizando || estado.provaEmExibicao); i++) {
        if (estado.provaEmExibicao) fecharProvaEmExibicao(estado);
        else atualizarDeslize(estado, 1 / 60);
      }
      atualizarDeslize(estado, 1 / 60); // um quadro de reação antes do próximo comando
    }
    expect(estado.mortes).toBe(0);
    expect(estado.concluida).toBe(true);
    expect(estado.almasColetadas.filter(Boolean).length).toBeGreaterThan(0);
  });

  it('na Fase 1, ficar parado sobre o espinho da lição mata', () => {
    const fase = parseFase(
      readFileSync(resolve(process.cwd(), 'public/fases/fase-01.txt'), 'utf-8'),
    );
    const rota = resolverFase(fase).rotaMinima ?? [];
    const estado = criarEstadoFase(fase);
    // Joga até a 12ª parada (o espinho do meio da Fase) e fica parado 1 s.
    for (const direcao of rota.slice(0, 12)) {
      solicitarDirecao(estado, direcao);
      for (let i = 0; i < 600 && (estado.deslizando || estado.provaEmExibicao); i++) {
        if (estado.provaEmExibicao) fecharProvaEmExibicao(estado);
        else atualizarDeslize(estado, 1 / 60);
      }
    }
    expect(fase.espinhos).toContainEqual(estado.celulaAtual);
    for (let i = 0; i < 60; i++) atualizarDeslize(estado, 1 / 60);
    expect(estado.mortes).toBe(1);
  });

  it('acha a rota mínima em número de deslizes', () => {
    // Início em (1,1): direita coleta 1 e 2 e para em (13,1); baixo coleta 3 em (13,3)
    // e para em (13,4); esquerda atravessa a Saída em (7,4). Mínimo: 3 deslizes.
    const fase = parseFase(
      montarFase([
        '###############',
        '#@..1....2....#',
        '#.............#',
        '#............3#',
        '#......X......#',
        '###############',
      ]),
    );
    const resultado = resolverFase(fase);
    expect(resultado.valida).toBe(true);
    expect(resultado.rotaMinima).toEqual(['direita', 'baixo', 'esquerda']);
  });

  it('acusa a Prova inalcançável e diz onde ela está', () => {
    // A Prova 3 está num bolsão fechado por paredes.
    const fase = parseFase(
      montarFase([
        '###############',
        '#@..1....2....#',
        '#.........###.#',
        '#.........#3#.#',
        '#......X..###.#',
        '###############',
      ]),
    );
    const resultado = resolverFase(fase);
    expect(resultado.valida).toBe(false);
    expect(resultado.rotaMinima).toBeNull();
    expect(resultado.erros).toEqual([
      'Prova 3 em (11,3) é inalcançável a partir do Início (R11).',
    ]);
  });

  it('acusa quando as Provas são alcançáveis mas a Saída não fecha a rota', () => {
    // A Saída fica num bolsão: dá para pegar as 3 Provas, mas nunca atravessar a Saída.
    const fase = parseFase(
      montarFase([
        '###############',
        '#@..1....2...3#',
        '#.........###.#',
        '#.........#X#.#',
        '#.........###.#',
        '###############',
      ]),
    );
    const resultado = resolverFase(fase);
    expect(resultado.valida).toBe(false);
    expect(resultado.erros).toEqual([
      'Nenhuma rota coleta as 3 Provas e depois atravessa a Saída em (11,3) (R11).',
    ]);
  });

  it('acusa Totem em trilho de Ameaça', () => {
    const grid = [
      '###############',
      '#@..1....2...3#',
      '#.............#',
      '#.R...T.......#',
      '#......X......#',
      '###############',
    ];
    // O parser não aceita trilho sobre o T; aqui o trilho é montado à mão sobre (6,3).
    const base = parseFase(montarFase(grid, ['R1 | vai-e-volta | 5 | 2,3 5,3 | -']));
    const fase = {
      ...base,
      ameacas: [
        {
          ...base.ameacas[0],
          trilho: [...base.ameacas[0].trilho, { col: 6, lin: 3 }],
        },
      ],
    };
    const resultado = resolverFase(fase);
    expect(resultado.valida).toBe(false);
    expect(resultado.erros).toContain('Totem em (6,3) está no trilho da Ameaça R1 (R09).');
  });

  it('acusa trilhos de Ameaças que se cruzam e diz em que células', () => {
    const fase = parseFase(
      montarFase(
        [
          '###############',
          '#@..1....2...3#',
          '#.....R.......#',
          '#.............#',
          '#..D..........#',
          '#.............#',
          '#......X......#',
          '###############',
        ],
        ['R1 | vai-e-volta | 5 | 6,2 6,5 | -', 'D1 | vai-e-volta | 10 | 3,4 10,4 | -'],
      ),
    );
    const resultado = resolverFase(fase);
    expect(resultado.valida).toBe(false);
    expect(resultado.erros).toEqual(['Os trilhos de R1 e D1 se cruzam em (6,4) (R08).']);
  });

  it('só avisa (sem invalidar) quando o Habitante é inalcançável', () => {
    const fase = parseFase(
      montarFase([
        '###############',
        '#@..1....2...3#',
        '#.........###.#',
        '#.........#H#.#',
        '#......X..###.#',
        '###############',
      ]),
    );
    const resultado = resolverFase(fase);
    expect(resultado.valida).toBe(true);
    expect(resultado.avisos).toEqual([
      'Habitante em (11,3) não é alcançável: ninguém conseguirá resgatá-lo.',
    ]);
  });
});
