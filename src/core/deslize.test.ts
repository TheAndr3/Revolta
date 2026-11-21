import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import {
  atualizarDeslize,
  criarEstadoFase,
  fecharProvaEmExibicao,
  solicitarDirecao,
  type Direcao,
} from './deslize';
import { parseFase } from './parser';

const FASE_SIMPLES = parseFase(
  [
    'REVOLTA-FASE v1',
    'LARGURA 7',
    'ALTURA 6',
    '[GRID]',
    '#######',
    '#@....#',
    '#.....#',
    '#...#.#',
    '#....X#',
    '#######',
    '[FIM]',
  ].join('\n'),
);

const FASE_SAIDA_NO_MEIO = parseFase(
  [
    'REVOLTA-FASE v1',
    'LARGURA 7',
    'ALTURA 3',
    '[GRID]',
    '#######',
    '#@..X.#',
    '#######',
    '[FIM]',
  ].join('\n'),
);

const FASE_COM_PROVAS = parseFase(
  [
    'REVOLTA-FASE v1',
    'LARGURA 9',
    'ALTURA 5',
    '[GRID]',
    '#########',
    '#@..1...#',
    '#.....2.#',
    '#..X..3.#',
    '#########',
    '[FIM]',
  ].join('\n'),
);

const FASE_DUAS_PROVAS_NA_LINHA = parseFase(
  [
    'REVOLTA-FASE v1',
    'LARGURA 10',
    'ALTURA 3',
    '[GRID]',
    '##########',
    '#@.1..2.X#',
    '##########',
    '[FIM]',
  ].join('\n'),
);

const FASE_SAIDA_ANTES_E_DEPOIS_DA_TERCEIRA = parseFase(
  [
    'REVOLTA-FASE v1',
    'LARGURA 10',
    'ALTURA 3',
    '[GRID]',
    '##########',
    '#@..X..3.#',
    '##########',
    '[FIM]',
  ].join('\n'),
);

const FASE_TERCEIRA_ANTES_DA_SAIDA = parseFase(
  [
    'REVOLTA-FASE v1',
    'LARGURA 10',
    'ALTURA 3',
    '[GRID]',
    '##########',
    '#@..3..X.#',
    '##########',
    '[FIM]',
  ].join('\n'),
);

describe('núcleo de deslize', () => {
  it('desliza na direção escolhida até bater na parede na velocidade da config', () => {
    const estado = criarEstadoFase(FASE_SIMPLES);

    const eventosInicio = solicitarDirecao(estado, 'direita');
    expect(eventosInicio).toEqual([{ tipo: 'iniciou_deslize', direcao: 'direita' }]);
    expect(estado.deslizando).toBe(true);

    // Após 2 tiles de deslocamento (2 / velocidade)
    const tempoParaDoisTiles = 2 / CONFIG.velocidadeDeslizeTilesPorSegundo;
    atualizarDeslize(estado, tempoParaDoisTiles);
    expect(estado.posicao.x).toBeCloseTo(3, 5);
    expect(estado.posicao.y).toBeCloseTo(1, 5);
    expect(estado.deslizando).toBe(true);

    // Mais 2 tiles alcança a coluna 5 (parede está na coluna 6)
    const eventosFim = atualizarDeslize(estado, tempoParaDoisTiles + 0.05);
    expect(estado.deslizando).toBe(false);
    expect(estado.celulaAtual).toEqual({ col: 5, lin: 1 });
    expect(estado.posicao).toEqual({ x: 5, y: 1 });
    expect(eventosFim).toEqual([
      { tipo: 'parou_na_parede', celula: { col: 5, lin: 1 }, direcao: 'direita' },
    ]);
  });

  it('gera apenas tranco quando o comando aponta para uma parede adjacente', () => {
    const estado = criarEstadoFase(FASE_SIMPLES);

    const eventosEsquerda = solicitarDirecao(estado, 'esquerda');
    expect(eventosEsquerda).toEqual([{ tipo: 'tranco', direcao: 'esquerda' }]);
    expect(estado.deslizando).toBe(false);
    expect(estado.celulaAtual).toEqual({ col: 1, lin: 1 });
    expect(estado.deslizes).toBe(0);

    const eventosCima = solicitarDirecao(estado, 'cima');
    expect(eventosCima).toEqual([{ tipo: 'tranco', direcao: 'cima' }]);
    expect(estado.deslizando).toBe(false);
  });

  it('guarda 1 comando em buffer durante o deslize e executa ao parar sem mudar no meio', () => {
    const estado = criarEstadoFase(FASE_SIMPLES);

    solicitarDirecao(estado, 'direita');
    atualizarDeslize(estado, 1 / CONFIG.velocidadeDeslizeTilesPorSegundo);

    // Primeiro envia 'esquerda', depois sobrescreve o buffer de 1 slot com 'baixo'
    expect(solicitarDirecao(estado, 'esquerda')).toEqual([]);
    expect(solicitarDirecao(estado, 'baixo')).toEqual([]);

    // Continua deslizando para a direita até a parede (não muda no meio)
    expect(estado.direcaoAtual).toBe('direita');
    expect(estado.comandoEmBuffer).toBe('baixo');

    // Avança tempo suficiente para chegar em (5,1) e iniciar imediatamente o deslize para baixo
    const eventos = atualizarDeslize(estado, 3.5 / CONFIG.velocidadeDeslizeTilesPorSegundo);
    expect(eventos).toEqual([
      { tipo: 'parou_na_parede', celula: { col: 5, lin: 1 }, direcao: 'direita' },
      { tipo: 'iniciou_deslize', direcao: 'baixo' },
    ]);
    expect(estado.deslizando).toBe(true);
    expect(estado.direcaoAtual).toBe('baixo');
    expect(estado.comandoEmBuffer).toBeNull();
    expect(estado.posicao.x).toBe(5);
    expect(estado.posicao.y).toBeCloseTo(1.5, 5);
  });

  it('gera tranco se o comando em buffer apontar para uma parede ao parar', () => {
    const estado = criarEstadoFase(FASE_SIMPLES);

    solicitarDirecao(estado, 'direita');
    solicitarDirecao(estado, 'cima'); // em (5,1), acima é parede (5,0)

    const eventos = atualizarDeslize(estado, 1);
    expect(eventos).toEqual([
      { tipo: 'parou_na_parede', celula: { col: 5, lin: 1 }, direcao: 'direita' },
      { tipo: 'tranco', direcao: 'cima' },
    ]);
    expect(estado.deslizando).toBe(false);
    expect(estado.celulaAtual).toEqual({ col: 5, lin: 1 });
  });

  it('não conclui a Fase ao atravessar a Saída apagada (antes de 3/3)', () => {
    const estado = criarEstadoFase(FASE_SAIDA_NO_MEIO);
    expect(estado.saidaAcesa).toBe(false);

    solicitarDirecao(estado, 'direita');
    const eventos = atualizarDeslize(estado, 1);

    expect(estado.concluida).toBe(false);
    expect(estado.celulaAtual).toEqual({ col: 5, lin: 1 });
    expect(eventos).toEqual([
      { tipo: 'parou_na_parede', celula: { col: 5, lin: 1 }, direcao: 'direita' },
    ]);
  });

  it('conclui a Fase ao atravessar a Saída acesa durante o deslize e ignora comandos depois', () => {
    const estado = criarEstadoFase(FASE_SAIDA_NO_MEIO, {
      provasJaColetadas: [1, 2, 3],
    });
    expect(estado.saidaAcesa).toBe(true);

    solicitarDirecao(estado, 'direita');
    const eventos = atualizarDeslize(estado, 1);

    expect(estado.concluida).toBe(true);
    expect(estado.deslizando).toBe(false);
    expect(estado.celulaAtual).toEqual({ col: 4, lin: 1 });
    expect(eventos).toEqual([{ tipo: 'fase_concluida', celula: { col: 4, lin: 1 } }]);

    // Comandos após concluir não têm efeito
    expect(solicitarDirecao(estado, 'esquerda')).toEqual([]);
    expect(atualizarDeslize(estado, 0.5)).toEqual([]);
  });

  it('coleta Prova no meio do deslize, salva na hora e abre o overlay só quando o Protagonista para', () => {
    const estado = criarEstadoFase(FASE_COM_PROVAS);

    solicitarDirecao(estado, 'direita');

    // Avança 4 tiles: passa pela Prova 1 em (4,1), mas ainda está deslizando rumo a (7,1)
    const eventosMeio = atualizarDeslize(estado, 4 / CONFIG.velocidadeDeslizeTilesPorSegundo);
    expect(estado.deslizando).toBe(true);
    expect(estado.provasColetadas).toEqual([1]);
    expect(estado.provaEmExibicao).toBeNull();
    expect(eventosMeio).toEqual([
      {
        tipo: 'prova_coletada',
        prova: { numero: 1, tipo: 'passado', posicao: { col: 4, lin: 1 } },
        totalColetadas: 1,
        totalProvas: 3,
      },
    ]);

    // Mesmo com comando em buffer, ao parar na parede o overlay abre e pausa o mundo
    solicitarDirecao(estado, 'baixo');
    const eventosParada = atualizarDeslize(estado, 4 / CONFIG.velocidadeDeslizeTilesPorSegundo);
    expect(estado.deslizando).toBe(false);
    expect(estado.celulaAtual).toEqual({ col: 7, lin: 1 });
    expect(estado.comandoEmBuffer).toBeNull();
    expect(estado.provaEmExibicao?.numero).toBe(1);
    expect(eventosParada).toEqual([
      { tipo: 'parou_na_parede', celula: { col: 7, lin: 1 }, direcao: 'direita' },
      {
        tipo: 'abrir_prova',
        prova: { numero: 1, tipo: 'passado', posicao: { col: 4, lin: 1 } },
      },
    ]);

    // Com o overlay aberto, comandos e atualizações não movem nada
    expect(solicitarDirecao(estado, 'esquerda')).toEqual([]);
    expect(atualizarDeslize(estado, 1)).toEqual([]);
    expect(estado.celulaAtual).toEqual({ col: 7, lin: 1 });

    // Fecha o overlay e retoma o jogo
    expect(fecharProvaEmExibicao(estado)).toEqual([]);
    expect(estado.provaEmExibicao).toBeNull();

    const eventosRetomada = solicitarDirecao(estado, 'esquerda');
    expect(eventosRetomada).toEqual([{ tipo: 'iniciou_deslize', direcao: 'esquerda' }]);
  });

  it('acende a Saída ao coletar a 3ª Prova e só então permite concluir a Fase', () => {
    const estado = criarEstadoFase(FASE_COM_PROVAS);

    // Coleta Prova 1 (4,1) indo para direita -> para em (7,1)
    solicitarDirecao(estado, 'direita');
    atualizarDeslize(estado, 1);
    expect(estado.provasColetadas).toEqual([1]);
    expect(estado.saidaAcesa).toBe(false);
    fecharProvaEmExibicao(estado);

    // Vai para baixo -> para em (7,3) sem coletar nada ainda
    solicitarDirecao(estado, 'baixo');
    atualizarDeslize(estado, 1);

    // Vai para esquerda: passa por Prova 3 em (6,3) e pela Saída em (3,3) com apenas 2/3 -> não conclui
    solicitarDirecao(estado, 'esquerda');
    const eventosSegunda = atualizarDeslize(estado, 1);
    expect(estado.provasColetadas).toEqual([1, 3]);
    expect(estado.saidaAcesa).toBe(false);
    expect(estado.concluida).toBe(false);
    expect(estado.celulaAtual).toEqual({ col: 1, lin: 3 });
    expect(eventosSegunda.some((e) => e.tipo === 'saida_acesa')).toBe(false);
    fecharProvaEmExibicao(estado);

    // Sobe até (1,1), vai direita até (7,1), desce? Não: vai cima -> (1,1), direita -> (7,1) não pega 2 em (6,2).
    // Caminho para (6,2): em (1,3) não há parede na linha 2; vamos direto testar a coleta da 3ª Prova em outro estado
    const estadoQuaseLa = criarEstadoFase(FASE_SAIDA_ANTES_E_DEPOIS_DA_TERCEIRA, {
      provasJaColetadas: [1, 2],
    });
    expect(estadoQuaseLa.saidaAcesa).toBe(false);

    // Passa por X (4,1) apagada e depois coleta a 3ª Prova (7,1): não conclui retroativamente, mas acende a Saída
    solicitarDirecao(estadoQuaseLa, 'direita');
    const eventosAcende = atualizarDeslize(estadoQuaseLa, 1);
    expect(estadoQuaseLa.provasColetadas).toEqual([1, 2, 3]);
    expect(estadoQuaseLa.saidaAcesa).toBe(true);
    expect(estadoQuaseLa.concluida).toBe(false);
    expect(eventosAcende.map((e) => e.tipo)).toEqual([
      'prova_coletada',
      'saida_acesa',
      'parou_na_parede',
      'abrir_prova',
    ]);

    fecharProvaEmExibicao(estadoQuaseLa);

    // Agora desliza para esquerda e alcança a Saída acesa em (4,1)
    solicitarDirecao(estadoQuaseLa, 'esquerda');
    const eventosConclusao = atualizarDeslize(estadoQuaseLa, 1);
    expect(estadoQuaseLa.concluida).toBe(true);
    expect(estadoQuaseLa.celulaAtual).toEqual({ col: 4, lin: 1 });
    expect(eventosConclusao).toEqual([{ tipo: 'fase_concluida', celula: { col: 4, lin: 1 } }]);
  });

  it('enfileira múltiplas Provas coletadas no mesmo deslize e exibe uma após a outra ao parar', () => {
    const estado = criarEstadoFase(FASE_DUAS_PROVAS_NA_LINHA);

    solicitarDirecao(estado, 'direita');
    const eventos = atualizarDeslize(estado, 1);

    expect(estado.provasColetadas).toEqual([1, 2]);
    expect(estado.provaEmExibicao?.numero).toBe(1);
    expect(eventos.map((e) => e.tipo)).toEqual([
      'prova_coletada',
      'prova_coletada',
      'parou_na_parede',
      'abrir_prova',
    ]);

    const eventosSegunda = fecharProvaEmExibicao(estado);
    expect(estado.provaEmExibicao?.numero).toBe(2);
    expect(eventosSegunda).toEqual([
      {
        tipo: 'abrir_prova',
        prova: { numero: 2, tipo: 'transformacao', posicao: { col: 6, lin: 1 } },
      },
    ]);

    expect(fecharProvaEmExibicao(estado)).toEqual([]);
    expect(estado.provaEmExibicao).toBeNull();
  });

  it('exibe a 3ª Prova antes de concluir quando a coleta e a Saída acontecem no mesmo deslize', () => {
    const estado = criarEstadoFase(FASE_TERCEIRA_ANTES_DA_SAIDA, {
      provasJaColetadas: [1, 2],
    });

    solicitarDirecao(estado, 'direita');
    const eventos = atualizarDeslize(estado, 1);

    expect(estado.saidaAcesa).toBe(true);
    expect(estado.celulaAtual).toEqual({ col: 7, lin: 1 });
    expect(estado.provaEmExibicao?.numero).toBe(3);
    expect(estado.concluida).toBe(false);
    expect(eventos.map((e) => e.tipo)).toEqual([
      'prova_coletada',
      'saida_acesa',
      'abrir_prova',
    ]);

    const eventosFechar = fecharProvaEmExibicao(estado);
    expect(estado.provaEmExibicao).toBeNull();
    expect(estado.concluida).toBe(true);
    expect(eventosFechar).toEqual([{ tipo: 'fase_concluida', celula: { col: 7, lin: 1 } }]);
  });

  it('carrega o arquivo real fase-00-teste.txt, coleta as 3 Provas e conclui a Fase pelo núcleo puro', () => {
    const caminho = resolve(process.cwd(), 'public/fases/fase-00-teste.txt');
    const conteudo = readFileSync(caminho, 'utf-8');
    const fase = parseFase(conteudo);

    expect(fase.largura).toBe(CONFIG.larguraFaseTiles);
    expect(fase.altura).toBeGreaterThanOrEqual(40);
    expect(fase.altura).toBeLessThanOrEqual(120);
    expect(fase.provas).toHaveLength(3);

    const estado = criarEstadoFase(fase);
    const rota: Direcao[] = [
      'baixo',
      'direita',
      'cima',
      'esquerda',
      'cima',
      'esquerda',
      'cima',
      'direita',
      'cima',
      'esquerda',
    ];

    let overlaysAbertos = 0;
    for (const direcao of rota) {
      solicitarDirecao(estado, direcao);
      // Simula passos de 16 ms até parar ou concluir
      for (let i = 0; i < 300 && estado.deslizando; i++) {
        atualizarDeslize(estado, 1 / 60);
      }
      while (estado.provaEmExibicao !== null) {
        overlaysAbertos += 1;
        fecharProvaEmExibicao(estado);
      }
    }

    expect(overlaysAbertos).toBe(3);
    expect(estado.provasColetadas).toEqual([1, 2, 3]);
    expect(estado.saidaAcesa).toBe(true);
    expect(estado.concluida).toBe(true);
    expect(estado.celulaAtual).toEqual(fase.saida);
  });
});
