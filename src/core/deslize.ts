import { CONFIG } from './config';
import { type Coordenada, type Fase, ehParede } from './fase';

export type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita';

export interface PosicaoContinua {
  x: number;
  y: number;
}

export type EventoDeslize =
  | { readonly tipo: 'iniciou_deslize'; readonly direcao: Direcao }
  | { readonly tipo: 'tranco'; readonly direcao: Direcao }
  | {
      readonly tipo: 'parou_na_parede';
      readonly celula: Coordenada;
      readonly direcao: Direcao;
    }
  | { readonly tipo: 'fase_concluida'; readonly celula: Coordenada };

export interface EstadoFase {
  readonly fase: Fase;
  readonly velocidadeTilesPorSegundo: number;
  posicao: PosicaoContinua;
  celulaAtual: Coordenada;
  deslizando: boolean;
  direcaoAtual: Direcao | null;
  destinoDeslize: Coordenada | null;
  comandoEmBuffer: Direcao | null;
  deslizes: number;
  concluida: boolean;
}

export interface OpcoesEstadoFase {
  velocidadeTilesPorSegundo?: number;
}

export const VETOR_DIRECAO: Record<Direcao, { readonly dc: number; readonly dl: number }> = {
  cima: { dc: 0, dl: -1 },
  baixo: { dc: 0, dl: 1 },
  esquerda: { dc: -1, dl: 0 },
  direita: { dc: 1, dl: 0 },
};

export function criarEstadoFase(
  fase: Fase,
  opcoes: OpcoesEstadoFase = {},
): EstadoFase {
  const inicio = { col: fase.inicio.col, lin: fase.inicio.lin };
  return {
    fase,
    velocidadeTilesPorSegundo:
      opcoes.velocidadeTilesPorSegundo ?? CONFIG.velocidadeDeslizeTilesPorSegundo,
    posicao: { x: inicio.col, y: inicio.lin },
    celulaAtual: inicio,
    deslizando: false,
    direcaoAtual: null,
    destinoDeslize: null,
    comandoEmBuffer: null,
    deslizes: 0,
    concluida: false,
  };
}

function calcularDestino(fase: Fase, origem: Coordenada, direcao: Direcao): Coordenada {
  const { dc, dl } = VETOR_DIRECAO[direcao];
  let col = origem.col;
  let lin = origem.lin;

  while (!ehParede(fase, col + dc, lin + dl)) {
    col += dc;
    lin += dl;
  }

  return { col, lin };
}

function iniciarMovimento(
  estado: EstadoFase,
  direcao: Direcao,
  eventos: EventoDeslize[],
): void {
  const destino = calcularDestino(estado.fase, estado.celulaAtual, direcao);
  if (destino.col === estado.celulaAtual.col && destino.lin === estado.celulaAtual.lin) {
    eventos.push({ tipo: 'tranco', direcao });
    return;
  }

  estado.deslizando = true;
  estado.direcaoAtual = direcao;
  estado.destinoDeslize = destino;
  estado.deslizes += 1;
  eventos.push({ tipo: 'iniciou_deslize', direcao });
}

export function solicitarDirecao(estado: EstadoFase, direcao: Direcao): EventoDeslize[] {
  if (estado.concluida) {
    return [];
  }

  if (estado.deslizando) {
    estado.comandoEmBuffer = direcao;
    return [];
  }

  const eventos: EventoDeslize[] = [];
  iniciarMovimento(estado, direcao, eventos);
  return eventos;
}

function distanciaAteSaidaNoTrajeto(
  estado: EstadoFase,
  direcao: Direcao,
  distanciaAteDestino: number,
): number | null {
  const { dc, dl } = VETOR_DIRECAO[direcao];
  const { saida } = estado.fase;
  const EPS = 1e-6;

  if (dc !== 0) {
    if (Math.abs(estado.posicao.y - saida.lin) > EPS) return null;
    const dist = (saida.col - estado.posicao.x) * dc;
    return dist >= -EPS && dist <= distanciaAteDestino + EPS ? Math.max(0, dist) : null;
  }

  if (Math.abs(estado.posicao.x - saida.col) > EPS) return null;
  const dist = (saida.lin - estado.posicao.y) * dl;
  return dist >= -EPS && dist <= distanciaAteDestino + EPS ? Math.max(0, dist) : null;
}

export function atualizarDeslize(
  estado: EstadoFase,
  deltaSegundos: number,
): EventoDeslize[] {
  if (estado.concluida || !estado.deslizando || deltaSegundos <= 0) {
    return [];
  }

  const eventos: EventoDeslize[] = [];
  let tempoRestante = deltaSegundos;

  // Limite de iterações evita laço infinito se uma configuração patológica surgir.
  for (let passos = 0; passos < 16 && estado.deslizando && tempoRestante > 0; passos++) {
    const direcao = estado.direcaoAtual;
    const destino = estado.destinoDeslize;
    if (!direcao || !destino) break;

    const { dc, dl } = VETOR_DIRECAO[direcao];
    const distanciaAteDestino =
      Math.abs(destino.col - estado.posicao.x) + Math.abs(destino.lin - estado.posicao.y);
    const deslocamento = estado.velocidadeTilesPorSegundo * tempoRestante;

    const distSaida = distanciaAteSaidaNoTrajeto(estado, direcao, distanciaAteDestino);
    if (distSaida !== null && deslocamento >= distSaida) {
      const saida = { col: estado.fase.saida.col, lin: estado.fase.saida.lin };
      estado.posicao = { x: saida.col, y: saida.lin };
      estado.celulaAtual = saida;
      estado.deslizando = false;
      estado.direcaoAtual = null;
      estado.destinoDeslize = null;
      estado.comandoEmBuffer = null;
      estado.concluida = true;
      eventos.push({ tipo: 'fase_concluida', celula: saida });
      break;
    }

    if (deslocamento < distanciaAteDestino) {
      estado.posicao.x += dc * deslocamento;
      estado.posicao.y += dl * deslocamento;
      estado.celulaAtual = {
        col: Math.round(estado.posicao.x),
        lin: Math.round(estado.posicao.y),
      };
      break;
    }

    // Chegou na parede
    estado.posicao = { x: destino.col, y: destino.lin };
    estado.celulaAtual = { col: destino.col, lin: destino.lin };
    estado.deslizando = false;
    estado.direcaoAtual = null;
    estado.destinoDeslize = null;
    eventos.push({
      tipo: 'parou_na_parede',
      celula: { col: destino.col, lin: destino.lin },
      direcao,
    });

    const tempoUsado = distanciaAteDestino / estado.velocidadeTilesPorSegundo;
    tempoRestante = Math.max(0, tempoRestante - tempoUsado);

    if (estado.comandoEmBuffer !== null) {
      const proximo = estado.comandoEmBuffer;
      estado.comandoEmBuffer = null;
      iniciarMovimento(estado, proximo, eventos);
    }
  }

  return eventos;
}
