import { CONFIG } from './config';
import {
  TOTAL_PROVAS_FASE,
  type Coordenada,
  type Fase,
  type NumeroProva,
  type ProvaNaFase,
  ehParede,
} from './fase';

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
  | {
      readonly tipo: 'prova_coletada';
      readonly prova: ProvaNaFase;
      readonly totalColetadas: number;
      readonly totalProvas: number;
    }
  | { readonly tipo: 'saida_acesa'; readonly celula: Coordenada }
  | { readonly tipo: 'abrir_prova'; readonly prova: ProvaNaFase }
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
  provasColetadas: NumeroProva[];
  provasPendentesOverlay: ProvaNaFase[];
  provaEmExibicao: ProvaNaFase | null;
  saidaAcesa: boolean;
  conclusaoPendente: boolean;
  concluida: boolean;
}

export interface OpcoesEstadoFase {
  velocidadeTilesPorSegundo?: number;
  provasJaColetadas?: readonly NumeroProva[];
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
  const provasColetadas = Array.from(new Set(opcoes.provasJaColetadas ?? []));

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
    provasColetadas,
    provasPendentesOverlay: [],
    provaEmExibicao: null,
    saidaAcesa: provasColetadas.length >= TOTAL_PROVAS_FASE,
    conclusaoPendente: false,
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

function abrirProximaProvaPendente(
  estado: EstadoFase,
  eventos: EventoDeslize[],
): boolean {
  const proxima = estado.provasPendentesOverlay.shift() ?? null;
  if (!proxima) {
    return false;
  }

  estado.provaEmExibicao = proxima;
  eventos.push({ tipo: 'abrir_prova', prova: proxima });
  return true;
}

export function fecharProvaEmExibicao(estado: EstadoFase): EventoDeslize[] {
  if (estado.provaEmExibicao === null) {
    return [];
  }

  estado.provaEmExibicao = null;
  const eventos: EventoDeslize[] = [];

  if (abrirProximaProvaPendente(estado, eventos)) {
    return eventos;
  }

  if (estado.conclusaoPendente) {
    estado.conclusaoPendente = false;
    estado.concluida = true;
    const saida = { col: estado.fase.saida.col, lin: estado.fase.saida.lin };
    eventos.push({ tipo: 'fase_concluida', celula: saida });
  }

  return eventos;
}

export function solicitarDirecao(estado: EstadoFase, direcao: Direcao): EventoDeslize[] {
  if (estado.concluida || estado.provaEmExibicao !== null) {
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

function distanciaAteAlvoNoTrajeto(
  posicao: PosicaoContinua,
  direcao: Direcao,
  alvo: Coordenada,
  distanciaMaxima: number,
): number | null {
  const { dc, dl } = VETOR_DIRECAO[direcao];
  const EPS = 1e-6;

  if (dc !== 0) {
    if (Math.abs(posicao.y - alvo.lin) > EPS) return null;
    const dist = (alvo.col - posicao.x) * dc;
    return dist >= -EPS && dist <= distanciaMaxima + EPS ? Math.max(0, dist) : null;
  }

  if (Math.abs(posicao.x - alvo.col) > EPS) return null;
  const dist = (alvo.lin - posicao.y) * dl;
  return dist >= -EPS && dist <= distanciaMaxima + EPS ? Math.max(0, dist) : null;
}

export function atualizarDeslize(
  estado: EstadoFase,
  deltaSegundos: number,
): EventoDeslize[] {
  if (
    estado.concluida ||
    estado.provaEmExibicao !== null ||
    !estado.deslizando ||
    deltaSegundos <= 0
  ) {
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
    const alcancePasso = Math.min(deslocamento, distanciaAteDestino);

    const provasNoPasso = estado.fase.provas
      .filter((p) => !estado.provasColetadas.includes(p.numero))
      .map((prova) => ({
        prova,
        dist: distanciaAteAlvoNoTrajeto(estado.posicao, direcao, prova.posicao, alcancePasso),
      }))
      .filter((item): item is { prova: ProvaNaFase; dist: number } => item.dist !== null)
      .sort((a, b) => a.dist - b.dist);

    let distSaidaAcesa: number | null = estado.saidaAcesa ? 0 : null;

    for (const { prova, dist } of provasNoPasso) {
      estado.provasColetadas.push(prova.numero);
      estado.provasPendentesOverlay.push(prova);
      eventos.push({
        tipo: 'prova_coletada',
        prova,
        totalColetadas: estado.provasColetadas.length,
        totalProvas: TOTAL_PROVAS_FASE,
      });

      if (!estado.saidaAcesa && estado.provasColetadas.length >= TOTAL_PROVAS_FASE) {
        estado.saidaAcesa = true;
        distSaidaAcesa = dist;
        eventos.push({
          tipo: 'saida_acesa',
          celula: { col: estado.fase.saida.col, lin: estado.fase.saida.lin },
        });
      }
    }

    const distSaida = distanciaAteAlvoNoTrajeto(
      estado.posicao,
      direcao,
      estado.fase.saida,
      alcancePasso,
    );
    if (
      estado.saidaAcesa &&
      distSaida !== null &&
      distSaidaAcesa !== null &&
      distSaida >= distSaidaAcesa - 1e-6
    ) {
      const saida = { col: estado.fase.saida.col, lin: estado.fase.saida.lin };
      estado.posicao = { x: saida.col, y: saida.lin };
      estado.celulaAtual = saida;
      estado.deslizando = false;
      estado.direcaoAtual = null;
      estado.destinoDeslize = null;
      estado.comandoEmBuffer = null;

      if (estado.provasPendentesOverlay.length > 0) {
        estado.conclusaoPendente = true;
        abrirProximaProvaPendente(estado, eventos);
      } else {
        estado.concluida = true;
        eventos.push({ tipo: 'fase_concluida', celula: saida });
      }
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

    if (estado.provasPendentesOverlay.length > 0) {
      estado.comandoEmBuffer = null;
      abrirProximaProvaPendente(estado, eventos);
      break;
    }

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
