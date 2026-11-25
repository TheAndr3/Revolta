import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  atualizarDeslize,
  criarEstadoFase,
  fecharProvaEmExibicao,
  solicitarDirecao,
  type Direcao,
  type EstadoFase,
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

  const FASE_1 = parseFase(
    readFileSync(resolve(process.cwd(), 'public/fases/fase-01.txt'), 'utf-8'),
  );

  /** Desliza até parar (fechando Provas no caminho). */
  const deslizarAtePararFase = (estado: ReturnType<typeof criarEstadoFase>, direcao: Direcao) => {
    solicitarDirecao(estado, direcao);
    for (let i = 0; i < 600 && (estado.deslizando || estado.provaEmExibicao); i++) {
      if (estado.provaEmExibicao) fecharProvaEmExibicao(estado);
      else atualizarDeslize(estado, 1 / 60);
    }
    atualizarDeslize(estado, 1 / 60); // um quadro de reação
  };

  it('a Fase 1 é válida, sem avisos, grande, com todos os perigos e 2–4 Habitantes', () => {
    const resultado = resolverFase(FASE_1);
    expect(resultado.erros).toEqual([]);
    expect(resultado.avisos).toEqual([]); // Saída, Almas e Habitantes alcançáveis
    expect(FASE_1.altura).toBeGreaterThanOrEqual(70); // R14: 60–100 linhas
    expect(FASE_1.espinhos.length).toBeGreaterThan(0);
    expect(new Set(FASE_1.ameacas.map((a) => a.tipo))).toEqual(new Set(['gosma', 'drone', 'guarda']));
    expect(FASE_1.totens.length).toBeGreaterThanOrEqual(4);
    expect(FASE_1.habitantes.length).toBeGreaterThanOrEqual(2);
    expect(FASE_1.habitantes.length).toBeLessThanOrEqual(4);
  });

  it('a rota mínima da Fase 1 conclui a Fase no núcleo (sem Ameaças nem espinhos)', () => {
    // A Fase 1 é de reflexo: a rota para de propósito em cima de espinhos e de trilhos
    // de Ameaça (a R12 antiga não vale para ela; ver docs/design/fase-01.md).
    const rota = resolverFase(FASE_1).rotaMinima ?? [];
    const estado = criarEstadoFase(FASE_1, { simularAmeacas: false, simularEspinhos: false });
    for (const direcao of rota) deslizarAtePararFase(estado, direcao);
    expect(estado.concluida).toBe(true);
  });

  it(
    'a Fase 1 dá para terminar sem morrer, com Ameaças e espinhos ligados, saindo na hora certa',
    () => {
      // Difícil não é impossível: segue a rota mínima e, em cada parada, tenta partir em
      // cada momento (de 1/30 em 1/30 s, até 6 s). Se um trecho trava, volta e tenta outro
      // momento no trecho anterior; janelas curtas (como a do Guarda na linha 5, ~0,17 s)
      // são o desafio de reflexo da Fase, não um defeito.
      const rota = resolverFase(FASE_1).rotaMinima ?? [];
      const copiar = (estado: EstadoFase): EstadoFase => {
        const { fase, ...resto } = estado; // a Fase não muda: não precisa clonar o grid
        return { ...structuredClone(resto), fase } as EstadoFase;
      };
      const falhas = new Set<string>();
      // A busca é síncrona: o timeout do Vitest não a interrompe. Com um orçamento de
      // deslizes simulados, uma Fase impossível faz o teste falhar em vez de travar.
      let orcamento = 60_000;
      const seguir = (estado: EstadoFase, i: number): EstadoFase | null => {
        if (orcamento <= 0) return null;
        if (i === rota.length) return estado.concluida ? estado : null;
        const chave = `${i}|${estado.tempoCicloSegundos.toFixed(3)}`;
        if (falhas.has(chave)) return null;
        const esperando = copiar(estado);
        for (let q = 0; q <= 180; q++) {
          if (q > 0) {
            atualizarDeslize(esperando, 1 / 30);
            if (esperando.mortes !== estado.mortes) break; // ficar parado ali já mata
          }
          const tentativa = copiar(esperando);
          orcamento -= 1;
          deslizarAtePararFase(tentativa, rota[i]);
          if (tentativa.mortes !== estado.mortes) continue;
          const fim = seguir(tentativa, i + 1);
          if (fim) return fim;
        }
        falhas.add(chave);
        return null;
      };

      const fim = seguir(criarEstadoFase(FASE_1), 0);
      expect(orcamento, 'a busca estourou o orçamento: a Fase 1 parece impossível sem morrer').toBeGreaterThan(0);
      expect(fim, 'nenhum jeito de terminar a Fase 1 sem morrer').not.toBeNull();
      expect(fim?.mortes).toBe(0);
      expect(fim?.concluida).toBe(true);
    },
    120_000,
  );

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
      'Habitante 1 em (11,3) não é alcançável: ninguém conseguirá resgatá-lo.',
    ]);
  });
});
