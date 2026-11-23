import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import {
  atualizarDeslize,
  criarEstadoFase,
  pausarJogo,
  retomarJogo,
  solicitarDirecao,
  voltarAoTotem,
  type EstadoFase,
} from './deslize';
import { avancarEspinhos, criarEspinhos, pisarEspinho } from './espinhos';
import { parseFase } from './parser';

const { avisoSegundos, ativoSegundos, recolhendoSegundos } = CONFIG.espinhos;

function montarFase(linhaDoInicio: string): ReturnType<typeof parseFase> {
  return parseFase(
    [
      'REVOLTA-FASE v1',
      'LARGURA 15',
      'ALTURA 5',
      '[GRID]',
      '###############',
      linhaDoInicio,
      '#.............#',
      '#............X#',
      '###############',
      '[FIM]',
    ].join('\n'),
  );
}

/** Espinho no meio do caminho: o deslize atravessa (7,1) e para na parede em (13,1). */
const FASE_ATRAVESSAR = montarFase('#@.....^......#');
/** Espinho colado na parede: o deslize para em cima dele em (13,1). */
const FASE_PARAR_EM_CIMA = montarFase('#@...........^#');
/** Totem em (3,1) antes do espinho em (7,1). */
const FASE_COM_TOTEM = montarFase('#@.T...^......#');

/** Avança o jogo em quadros de 1/60 s, como a cena faz. */
function avancar(estado: EstadoFase, segundos: number): void {
  const quadros = Math.round(segundos * 60);
  for (let i = 0; i < quadros; i++) {
    atualizarDeslize(estado, 1 / 60);
  }
}

describe('espinhos temporários: ciclo', () => {
  it('passa por recolhido → aviso → ativo → recolhendo → recolhido com os tempos da config', () => {
    const [espinho] = criarEspinhos([{ col: 0, lin: 0 }]);
    expect(espinho.etapa).toBe('recolhido');

    avancarEspinhos([espinho], 5);
    expect(espinho.etapa).toBe('recolhido'); // sem ser pisado, nada acontece

    expect(pisarEspinho(espinho)).toBe(true);
    expect(espinho.etapa).toBe('aviso');

    avancarEspinhos([espinho], avisoSegundos - 0.01);
    expect(espinho.etapa).toBe('aviso');
    avancarEspinhos([espinho], 0.02);
    expect(espinho.etapa).toBe('ativo');

    avancarEspinhos([espinho], ativoSegundos);
    expect(espinho.etapa).toBe('recolhendo');

    avancarEspinhos([espinho], recolhendoSegundos);
    expect(espinho.etapa).toBe('recolhido');
    expect(espinho.tempoNaEtapa).toBe(0);
  });

  it('pisar de novo durante o ciclo não reinicia o relógio', () => {
    const [espinho] = criarEspinhos([{ col: 0, lin: 0 }]);
    pisarEspinho(espinho);
    avancarEspinhos([espinho], 0.3);
    expect(pisarEspinho(espinho)).toBe(false);
    expect(espinho.tempoNaEtapa).toBeCloseTo(0.3);
  });

  it('um passo grande atravessa várias etapas', () => {
    const [espinho] = criarEspinhos([{ col: 0, lin: 0 }]);
    pisarEspinho(espinho);
    avancarEspinhos([espinho], avisoSegundos + ativoSegundos + 0.1);
    expect(espinho.etapa).toBe('recolhendo');
  });
});

describe('espinhos temporários: no jogo', () => {
  it('passar deslizando nunca mata, e o espinho entra em aviso visível', () => {
    const estado = criarEstadoFase(FASE_ATRAVESSAR);
    solicitarDirecao(estado, 'direita');
    avancar(estado, 0.3);

    expect(estado.celulaAtual).toEqual({ col: 13, lin: 1 });
    expect(estado.espinhos[0].etapa).toBe('aviso');

    // O ciclo inteiro passa com o Protagonista longe dos espinhos.
    avancar(estado, avisoSegundos + ativoSegundos + recolhendoSegundos + 0.2);
    expect(estado.mortes).toBe(0);
    expect(estado.espinhos[0].etapa).toBe('recolhido');
  });

  it('parar em cima mata quando os espinhos ativam, não antes', () => {
    const estado = criarEstadoFase(FASE_PARAR_EM_CIMA);
    solicitarDirecao(estado, 'direita');
    avancar(estado, 0.3);
    expect(estado.celulaAtual).toEqual({ col: 13, lin: 1 });
    expect(estado.espinhos[0].etapa).toBe('aviso');

    avancar(estado, avisoSegundos - 0.4); // ainda em aviso
    expect(estado.mortes).toBe(0);

    avancar(estado, 0.5); // ativou
    expect(estado.mortes).toBe(1);
    expect(estado.celulaAtual).toEqual(FASE_PARAR_EM_CIMA.inicio);
  });

  it('voltar logo pelos espinhos ativos mata; esperar recolherem é seguro', () => {
    const voltandoLogo = criarEstadoFase(FASE_ATRAVESSAR);
    solicitarDirecao(voltandoLogo, 'direita');
    avancar(voltandoLogo, avisoSegundos + 0.2); // parado na parede, espinho ativo
    expect(voltandoLogo.espinhos[0].etapa).toBe('ativo');
    solicitarDirecao(voltandoLogo, 'esquerda');
    avancar(voltandoLogo, 0.3);
    expect(voltandoLogo.mortes).toBe(1);

    const esperando = criarEstadoFase(FASE_ATRAVESSAR);
    solicitarDirecao(esperando, 'direita');
    avancar(esperando, avisoSegundos + ativoSegundos + recolhendoSegundos + 0.2);
    solicitarDirecao(esperando, 'esquerda');
    avancar(esperando, 0.3);
    expect(esperando.mortes).toBe(0);
    expect(esperando.celulaAtual).toEqual({ col: 1, lin: 1 });
  });

  it('voltam ao estado inicial ao morrer', () => {
    const estado = criarEstadoFase(FASE_PARAR_EM_CIMA);
    solicitarDirecao(estado, 'direita');
    avancar(estado, 0.3 + avisoSegundos + 0.1);
    expect(estado.mortes).toBe(1);
    expect(estado.espinhos.every((e) => e.etapa === 'recolhido' && e.tempoNaEtapa === 0)).toBe(
      true,
    );
  });

  it('voltam ao estado inicial ao voltar ao Totem', () => {
    const estado = criarEstadoFase(FASE_COM_TOTEM);
    solicitarDirecao(estado, 'direita');
    avancar(estado, 0.3);
    expect(estado.totemAtivo).toEqual({ col: 3, lin: 1 });
    expect(estado.espinhos[0].etapa).toBe('aviso');

    voltarAoTotem(estado);
    expect(estado.celulaAtual).toEqual({ col: 3, lin: 1 });
    expect(estado.espinhos[0].etapa).toBe('recolhido');
  });

  it('o relógio dos espinhos para durante a pausa', () => {
    const estado = criarEstadoFase(FASE_PARAR_EM_CIMA);
    solicitarDirecao(estado, 'direita');
    avancar(estado, 0.3);
    pausarJogo(estado);
    avancar(estado, 3);
    expect(estado.espinhos[0].etapa).toBe('aviso');
    expect(estado.mortes).toBe(0);

    retomarJogo(estado);
    avancar(estado, avisoSegundos);
    expect(estado.mortes).toBe(1);
  });
});
