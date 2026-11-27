import { CONFIG } from './config';
import type { Coordenada } from './fase';

/**
 * Solo erodido (`~`, Armadilha): racha após a passagem do Protagonista e desaba em
 * buraco letal permanente até morrer ou voltar ao Totem.
 *
 * Ciclo:
 * - 1ª passada: `intacto` → `rachando` (conta `quebraSegundos` até desabar).
 * - 2ª passada enquanto ainda `rachando`: o Protagonista sobrevive deslizando, e o tile
 *   desaba assim que ele sai (parar em cima na 2ª passada derruba na hora).
 * - `quebrado`: mata ao contato e só restaura ao morrer ou voltar ao Totem.
 */
export type EtapaSoloErodido = 'intacto' | 'rachando' | 'quebrado';

export interface EstadoSoloErodido {
  readonly celula: Coordenada;
  etapa: EtapaSoloErodido;
  /** Tempo decorrido em `rachando`, em segundos. */
  tempoNaEtapa: number;
  /** Quantas entradas distintas o Protagonista já fez neste tile (0, 1 ou 2). */
  passadas: number;
  /** Verdadeiro enquanto o Protagonista ainda não deixou a célula após a última entrada. */
  ocupado: boolean;
}

export type ResultadoPisarSoloErodido = 'acionado' | 'segunda_passada' | 'nenhum';

export function criarSolosErodidos(celulas: readonly Coordenada[]): EstadoSoloErodido[] {
  return celulas.map((celula) => ({
    celula: { col: celula.col, lin: celula.lin },
    etapa: 'intacto',
    tempoNaEtapa: 0,
    passadas: 0,
    ocupado: false,
  }));
}

/** Restaura todo o solo erodido da Fase ao estado intacto (ao morrer ou voltar ao Totem). */
export function reiniciarSolosErodidos(solos: EstadoSoloErodido[]): void {
  for (const solo of solos) {
    solo.etapa = 'intacto';
    solo.tempoNaEtapa = 0;
    solo.passadas = 0;
    solo.ocupado = false;
  }
}

/**
 * O Protagonista entrou na célula do solo erodido:
 * - se `intacto`, inicia o cronômetro (`acionado`);
 * - se `rachando` e já tinha saído antes, marca a 2ª passada (`segunda_passada`);
 * - se ainda está na mesma passada ou já quebrou, devolve `nenhum`.
 */
export function pisarSoloErodido(solo: EstadoSoloErodido): ResultadoPisarSoloErodido {
  if (solo.etapa === 'intacto') {
    solo.etapa = 'rachando';
    solo.tempoNaEtapa = 0;
    solo.passadas = 1;
    solo.ocupado = true;
    return 'acionado';
  }
  if (solo.etapa === 'rachando' && !solo.ocupado) {
    solo.passadas = 2;
    solo.ocupado = true;
    return 'segunda_passada';
  }
  return 'nenhum';
}

export function quebrarSoloErodido(solo: EstadoSoloErodido): boolean {
  if (solo.etapa === 'quebrado') return false;
  solo.etapa = 'quebrado';
  solo.tempoNaEtapa = 0;
  solo.ocupado = false;
  return true;
}

export function soloErodidoLetal(solo: EstadoSoloErodido): boolean {
  return solo.etapa === 'quebrado';
}

export function algumSoloErodidoRachando(solos: readonly EstadoSoloErodido[]): boolean {
  return solos.some((solo) => solo.etapa === 'rachando');
}

/** O Protagonista ocupa a célula do solo erodido (metade de um tile em cada eixo). */
export function protagonistaSobreSoloErodido(
  posicao: { readonly x: number; readonly y: number },
  solo: EstadoSoloErodido,
): boolean {
  return (
    Math.abs(posicao.x - solo.celula.col) < 0.5 &&
    Math.abs(posicao.y - solo.celula.lin) < 0.5
  );
}

/**
 * Avança o relógio dos solos em `rachando` e devolve os que acabaram de desabar.
 * Durante a 2ª passada deslizando, o tile espera o Protagonista sair da célula
 * (desabando em `atualizarOcupacaoSolosErodidos`), para que atravessar seja seguro.
 */
export function avancarSolosErodidos(
  solos: EstadoSoloErodido[],
  deltaSegundos: number,
  protagonistaDeslizando: boolean,
  quebraSegundos: number = CONFIG.soloErodido.quebraSegundos,
): EstadoSoloErodido[] {
  const quebrados: EstadoSoloErodido[] = [];
  for (const solo of solos) {
    if (solo.etapa !== 'rachando') continue;
    solo.tempoNaEtapa += deltaSegundos;

    if (solo.passadas >= 2 && solo.ocupado && protagonistaDeslizando) {
      continue;
    }

    if (solo.tempoNaEtapa >= quebraSegundos) {
      quebrarSoloErodido(solo);
      quebrados.push(solo);
    }
  }
  return quebrados;
}

/**
 * Atualiza quais tiles o Protagonista já deixou. Na 2ª passada, deixar a célula
 * derruba o tile imediatamente e o devolve na lista de quebrados.
 */
export function atualizarOcupacaoSolosErodidos(
  solos: EstadoSoloErodido[],
  posicao: { readonly x: number; readonly y: number },
): EstadoSoloErodido[] {
  const quebrados: EstadoSoloErodido[] = [];
  for (const solo of solos) {
    if (!solo.ocupado) continue;
    if (protagonistaSobreSoloErodido(posicao, solo)) continue;

    solo.ocupado = false;
    if (solo.etapa === 'rachando' && solo.passadas >= 2) {
      quebrarSoloErodido(solo);
      quebrados.push(solo);
    }
  }
  return quebrados;
}
