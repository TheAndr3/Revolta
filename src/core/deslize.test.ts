import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import {
  atualizarDeslize,
  criarEstadoFase,
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

  it('conclui a Fase ao atravessar a Saída durante o deslize e ignora comandos depois', () => {
    const estado = criarEstadoFase(FASE_SAIDA_NO_MEIO);

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

  it('carrega o arquivo real fase-00-teste.txt e conclui a Fase pelo núcleo puro', () => {
    const caminho = resolve(process.cwd(), 'public/fases/fase-00-teste.txt');
    const conteudo = readFileSync(caminho, 'utf-8');
    const fase = parseFase(conteudo);

    expect(fase.largura).toBe(CONFIG.larguraFaseTiles);
    expect(fase.altura).toBeGreaterThanOrEqual(40);
    expect(fase.altura).toBeLessThanOrEqual(120);

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

    for (const direcao of rota) {
      solicitarDirecao(estado, direcao);
      // Simula passos de 16 ms até parar ou concluir
      for (let i = 0; i < 300 && estado.deslizando; i++) {
        atualizarDeslize(estado, 1 / 60);
      }
    }

    expect(estado.concluida).toBe(true);
    expect(estado.celulaAtual).toEqual(fase.saida);
  });
});
