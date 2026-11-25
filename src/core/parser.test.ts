import { describe, expect, it } from 'vitest';
import {
  atualizarDeslize,
  criarEstadoFase,
  fecharProvaEmExibicao,
  solicitarDirecao,
  type Direcao,
} from './deslize';
import { ErroParseFase, parseFase } from './parser';

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

// Fase de exemplo oficial de docs/design/legenda-fases.md (Seção 4.1)
const FASE_EXEMPLO_LEGENDA = [
  '; fase de exemplo - Re(volta) - legenda-fases',
  'REVOLTA-FASE v1',
  'LARGURA 15',
  'ALTURA 16',
  '[GRID]',
  '###############',
  '#.............#',
  '#.............#',
  '#.........R...#',
  '#....#...D.3..#',
  '#...........#.#',
  '#X............#',
  '#....H........#',
  '#..G..........#',
  '#.............#',
  '#............##',
  '#...#......2..#',
  '#............T#',
  '#.............#',
  '#@....1...^...#',
  '###############',
  '[AMEACAS]',
  'G1 | loop | 3 | 3,8 7,8 7,9 3,9 | -',
  'D1 | vai-e-volta | 10 | 9,4 9,12 | -',
  'R1 | vai-e-volta | 5 | 10,3 13,3 | 13,3=2',
  '[FIM]',
].join('\n');

function capturarErroParse(texto: string): ErroParseFase {
  try {
    parseFase(texto);
  } catch (erro) {
    expect(erro).toBeInstanceOf(ErroParseFase);
    return erro as ErroParseFase;
  }
  throw new Error('Esperava ErroParseFase, mas parseFase concluiu sem erro.');
}

describe('parseFase', () => {
  it('converte texto minimo para o formato interno neutro com inicio e saida', () => {
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
    expect(fase.totens).toEqual([]);
    expect(fase.provas).toEqual([]);
    expect(fase.habitantes).toEqual([]);
    expect(fase.espinhos).toEqual([]);
    expect(fase.ameacas).toEqual([]);
  });

  it('converte a Fase de exemplo completa da legenda com todos os 13 simbolos e rotas das Ameacas', () => {
    const fase = parseFase(FASE_EXEMPLO_LEGENDA);

    expect(fase.largura).toBe(15);
    expect(fase.altura).toBe(16);
    expect(fase.inicio).toEqual({ col: 1, lin: 14 });
    expect(fase.saida).toEqual({ col: 1, lin: 6 });
    expect(fase.totens).toEqual([{ col: 13, lin: 12 }]);
    expect(fase.provas).toEqual([
      { numero: 1, tipo: 'passado', posicao: { col: 6, lin: 14 } },
      { numero: 2, tipo: 'transformacao', posicao: { col: 11, lin: 11 } },
      { numero: 3, tipo: 'responsaveis', posicao: { col: 11, lin: 4 } },
    ]);
    expect(fase.habitantes).toEqual([{ col: 5, lin: 7 }]);
    expect(fase.espinhos).toEqual([{ col: 10, lin: 14 }]);

    // Células com elementos dinâmicos/colecionáveis viram chão transitável na grade neutra
    expect(fase.grade[12][13]).toBe('chao'); // Totem
    expect(fase.grade[14][6]).toBe('chao'); // Prova 1
    expect(fase.grade[7][5]).toBe('chao'); // Habitante
    expect(fase.grade[14][10]).toBe('chao'); // Espinhos
    expect(fase.grade[8][3]).toBe('chao'); // Gosma
    expect(fase.grade[4][9]).toBe('chao'); // Drone
    expect(fase.grade[3][10]).toBe('chao'); // Guarda

    expect(fase.ameacas).toHaveLength(3);

    const [gosma, drone, guarda] = fase.ameacas;

    expect(gosma).toEqual({
      id: 'G1',
      tipo: 'gosma',
      ciclo: 'loop',
      velocidadeTilesPorSegundo: 3,
      posicaoInicial: { col: 3, lin: 8 },
      vertices: [
        { col: 3, lin: 8 },
        { col: 7, lin: 8 },
        { col: 7, lin: 9 },
        { col: 3, lin: 9 },
      ],
      trilho: [
        { col: 3, lin: 8 },
        { col: 4, lin: 8 },
        { col: 5, lin: 8 },
        { col: 6, lin: 8 },
        { col: 7, lin: 8 },
        { col: 7, lin: 9 },
        { col: 6, lin: 9 },
        { col: 5, lin: 9 },
        { col: 4, lin: 9 },
        { col: 3, lin: 9 },
      ],
      pausas: [],
    });

    expect(drone).toEqual({
      id: 'D1',
      tipo: 'drone',
      ciclo: 'vai-e-volta',
      velocidadeTilesPorSegundo: 10,
      posicaoInicial: { col: 9, lin: 4 },
      vertices: [
        { col: 9, lin: 4 },
        { col: 9, lin: 12 },
      ],
      trilho: [
        { col: 9, lin: 4 },
        { col: 9, lin: 5 },
        { col: 9, lin: 6 },
        { col: 9, lin: 7 },
        { col: 9, lin: 8 },
        { col: 9, lin: 9 },
        { col: 9, lin: 10 },
        { col: 9, lin: 11 },
        { col: 9, lin: 12 },
      ],
      pausas: [],
    });

    expect(guarda).toEqual({
      id: 'R1',
      tipo: 'guarda',
      ciclo: 'vai-e-volta',
      velocidadeTilesPorSegundo: 5,
      posicaoInicial: { col: 10, lin: 3 },
      vertices: [
        { col: 10, lin: 3 },
        { col: 13, lin: 3 },
      ],
      trilho: [
        { col: 10, lin: 3 },
        { col: 11, lin: 3 },
        { col: 12, lin: 3 },
        { col: 13, lin: 3 },
      ],
      pausas: [{ vertice: { col: 13, lin: 3 }, duracaoSegundos: 2 }],
    });
  });

  it('permite que o nucleo de deslize conclua a Fase de exemplo da legenda em 8 deslizes', () => {
    const fase = parseFase(FASE_EXEMPLO_LEGENDA);
    const estado = criarEstadoFase(fase, { simularAmeacas: false });

    const solucao: Direcao[] = [
      'direita',
      'cima',
      'esquerda',
      'cima',
      'direita',
      'cima',
      'esquerda',
      'baixo',
    ];

    for (const direcao of solucao) {
      solicitarDirecao(estado, direcao);
      for (let i = 0; i < 300 && estado.deslizando; i++) {
        atualizarDeslize(estado, 1 / 60);
      }
      while (estado.provaEmExibicao !== null) {
        fecharProvaEmExibicao(estado);
      }
    }

    expect(estado.provasColetadas).toEqual([1, 2, 3]);
    expect(estado.saidaAcesa).toBe(true);
    expect(estado.concluida).toBe(true);
    expect(estado.deslizes).toBe(8);
    expect(estado.celulaAtual).toEqual({ col: 1, lin: 6 });
  });

  it('numera multiplas Ameacas do mesmo tipo em ordem de leitura e suporta Guarda em loop com multiplas pausas', () => {
    const texto = [
      'REVOLTA-FASE v1',
      'LARGURA 9',
      'ALTURA 6',
      '[GRID]',
      '#########',
      '#@.R..R.#',
      '#.......#',
      '#.......#',
      '#......X#',
      '#########',
      '[AMEACAS]',
      '; comentarios dentro de [AMEACAS] sao ignorados',
      'R1 | loop | 2.5 | 3,1 5,1 5,3 3,3 | 3,1=0.5 5,3=1.25',
      'R2 | vai-e-volta | 4 | 6,1 6,3 | -',
      '[FIM]',
    ].join('\n');

    const fase = parseFase(texto);
    expect(fase.ameacas).toHaveLength(2);
    expect(fase.ameacas[0].id).toBe('R1');
    expect(fase.ameacas[0].velocidadeTilesPorSegundo).toBe(2.5);
    expect(fase.ameacas[0].trilho).toHaveLength(8);
    expect(fase.ameacas[0].pausas).toEqual([
      { vertice: { col: 3, lin: 1 }, duracaoSegundos: 0.5 },
      { vertice: { col: 5, lin: 3 }, duracaoSegundos: 1.25 },
    ]);
    expect(fase.ameacas[1].id).toBe('R2');
    expect(fase.ameacas[1].posicaoInicial).toEqual({ col: 6, lin: 1 });
  });

  it('rejeita caractere invalido indicando linha e coluna', () => {
    const invalida = MINI_FASE.replace('#.#.#', '#.? #');
    const erro = capturarErroParse(invalida);

    expect(erro.message).toMatch(/linha 3.*coluna 3/i);
    expect(erro.linha).toBe(8);
    expect(erro.coluna).toBe(3);
  });

  it('exige exatamente um inicio (@), uma saida (X), sem duplicar Provas nem passar de 3 Habitantes', () => {
    const semSaida = MINI_FASE.replace('X', '.');
    expect(capturarErroParse(semSaida).message).toMatch(/saída|saida/i);

    const doisInicios = MINI_FASE.replace('#..X#', '#@.X#');
    const erroInicio = capturarErroParse(doisInicios);
    expect(erroInicio.message).toMatch(/início|inicio/i);
    expect(erroInicio.linha).toBe(9);
    expect(erroInicio.coluna).toBe(2);

    const provaDuplicada = FASE_EXEMPLO_LEGENDA.replace('#.............#', '#..1..........#');
    const erroProva = capturarErroParse(provaDuplicada);
    expect(erroProva.message).toMatch(/prova 1 duplicada/i);
    expect(erroProva.linha).toBe(20);
    expect(erroProva.coluna).toBe(7);

    // Até 3 Habitantes é válido (lidos na ordem do grid); o 4º é recusado.
    const tresHabitantes = FASE_EXEMPLO_LEGENDA.replace('#.............#', '#..H....H.....#');
    expect(parseFase(tresHabitantes).habitantes).toHaveLength(3);
    const quatroHabitantes = FASE_EXEMPLO_LEGENDA.replace('#.............#', '#..H..H..H....#');
    const erroHab = capturarErroParse(quatroHabitantes);
    expect(erroHab.message).toMatch(/mais de 3 habitantes/i);
    expect(erroHab.linha).toBe(13);
  });

  it('reporta linha e coluna em cabecalhos, dimensoes e secoes malformadas', () => {
    const semVersao = MINI_FASE.replace('REVOLTA-FASE v1\n', '');
    const erroVersao = capturarErroParse(semVersao);
    expect(erroVersao.linha).toBe(1);
    expect(erroVersao.coluna).toBe(1);

    const larguraRuim = MINI_FASE.replace('LARGURA 5', 'LARGURA 5px');
    const erroLargura = capturarErroParse(larguraRuim);
    expect(erroLargura.linha).toBe(3);
    expect(erroLargura.coluna).toBe(9);
    expect(erroLargura.message).toMatch(/linha 3, coluna 9/i);

    const linhaCurta = MINI_FASE.replace('#.#.#', '#.#');
    const erroLarguraGrid = capturarErroParse(linhaCurta);
    expect(erroLarguraGrid.linha).toBe(8);
    expect(erroLarguraGrid.coluna).toBe(4);

    const semFim = MINI_FASE.replace('[FIM]', '');
    const erroFim = capturarErroParse(semFim);
    expect(erroFim.message).toMatch(/\[FIM\]/i);
    expect(erroFim.linha).toBeGreaterThan(0);
    expect(erroFim.coluna).toBe(1);
  });

  it('reporta linha e coluna em erros da secao [AMEACAS]', () => {
    // Poucos campos separados por |
    const poucosCampos = FASE_EXEMPLO_LEGENDA.replace(
      'D1 | vai-e-volta | 10 | 9,4 9,12 | -',
      'D1 | vai-e-volta | 10 | 9,4 9,12',
    );
    const erroCampos = capturarErroParse(poucosCampos);
    expect(erroCampos.linha).toBe(24);
    expect(erroCampos.coluna).toBe(33);
    expect(erroCampos.message).toMatch(/5 campos/i);

    // Ciclo incompatível (Gosma só aceita loop)
    const cicloInvalido = FASE_EXEMPLO_LEGENDA.replace(
      'G1 | loop | 3 | 3,8 7,8 7,9 3,9 | -',
      'G1 | vai-e-volta | 3 | 3,8 7,8 7,9 3,9 | -',
    );
    const erroCiclo = capturarErroParse(cicloInvalido);
    expect(erroCiclo.linha).toBe(23);
    expect(erroCiclo.coluna).toBe(6);
    expect(erroCiclo.message).toMatch(/somente ciclo "loop"/i);

    // Velocidade inválida
    const velInvalida = FASE_EXEMPLO_LEGENDA.replace(
      'D1 | vai-e-volta | 10 | 9,4 9,12 | -',
      'D1 | vai-e-volta | 0 | 9,4 9,12 | -',
    );
    const erroVel = capturarErroParse(velInvalida);
    expect(erroVel.linha).toBe(24);
    expect(erroVel.coluna).toBe(20);
    expect(erroVel.message).toMatch(/maior que zero/i);

    // v1 não coincide com o símbolo no grid
    const v1Errado = FASE_EXEMPLO_LEGENDA.replace(
      'D1 | vai-e-volta | 10 | 9,4 9,12 | -',
      'D1 | vai-e-volta | 10 | 9,5 9,12 | -',
    );
    const erroV1 = capturarErroParse(v1Errado);
    expect(erroV1.linha).toBe(24);
    expect(erroV1.coluna).toBe(25);
    expect(erroV1.message).toMatch(/não coincide/i);

    // Segmento diagonal
    const diagonal = FASE_EXEMPLO_LEGENDA.replace(
      'D1 | vai-e-volta | 10 | 9,4 9,12 | -',
      'D1 | vai-e-volta | 10 | 9,4 10,12 | -',
    );
    const erroDiag = capturarErroParse(diagonal);
    expect(erroDiag.linha).toBe(24);
    expect(erroDiag.coluna).toBe(29);
    expect(erroDiag.message).toMatch(/horizontais ou verticais/i);

    // Vértice fora dos limites
    const foraLimite = FASE_EXEMPLO_LEGENDA.replace(
      'D1 | vai-e-volta | 10 | 9,4 9,12 | -',
      'D1 | vai-e-volta | 10 | 9,4 9,99 | -',
    );
    const erroLimite = capturarErroParse(foraLimite);
    expect(erroLimite.linha).toBe(24);
    expect(erroLimite.coluna).toBe(29);
    expect(erroLimite.message).toMatch(/fora dos limites/i);

    // Pausa em Gosma ou Drone (proibido)
    const pausaEmGosma = FASE_EXEMPLO_LEGENDA.replace(
      'G1 | loop | 3 | 3,8 7,8 7,9 3,9 | -',
      'G1 | loop | 3 | 3,8 7,8 7,9 3,9 | 3,8=1',
    );
    const erroPausaProibida = capturarErroParse(pausaEmGosma);
    expect(erroPausaProibida.linha).toBe(23);
    expect(erroPausaProibida.coluna).toBe(35);
    expect(erroPausaProibida.message).toMatch(/não pode ter pausas/i);

    // Pausa em coordenada que não é vértice da rota
    const pausaForaVertice = FASE_EXEMPLO_LEGENDA.replace(
      'R1 | vai-e-volta | 5 | 10,3 13,3 | 13,3=2',
      'R1 | vai-e-volta | 5 | 10,3 13,3 | 11,3=2',
    );
    const erroPausaVertice = capturarErroParse(pausaForaVertice);
    expect(erroPausaVertice.linha).toBe(25);
    expect(erroPausaVertice.coluna).toBe(36);
    expect(erroPausaVertice.message).toMatch(/nenhum vértice/i);

    // Símbolo no grid sem rota correspondente em [AMEACAS]
    const semRotaGuarda = FASE_EXEMPLO_LEGENDA.replace(
      'R1 | vai-e-volta | 5 | 10,3 13,3 | 13,3=2\n',
      '',
    );
    const erroFaltando = capturarErroParse(semRotaGuarda);
    expect(erroFaltando.linha).toBe(9);
    expect(erroFaltando.coluna).toBe(11);
    expect(erroFaltando.message).toMatch(/R1.*não possui rota/i);
  });

  it('rejeita trilho que passa duas vezes pela mesma celula', () => {
    const texto = [
      'REVOLTA-FASE v1',
      'LARGURA 9',
      'ALTURA 5',
      '[GRID]',
      '#########',
      '#@.R....#',
      '#.......#',
      '#......X#',
      '#########',
      '[AMEACAS]',
      'R1 | vai-e-volta | 5 | 3,1 7,1 5,1 | -',
      '[FIM]',
    ].join('\n');

    const erro = capturarErroParse(texto);
    expect(erro.linha).toBe(11);
    expect(erro.coluna).toBe(32);
    expect(erro.message).toMatch(/mais de uma vez/i);
  });
});
