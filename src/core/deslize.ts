import {
  avaliarAmeacaNoTempo,
  calcularPosicoesAmeacas,
  colideComAmeaca,
  compilarCicloAmeaca,
  type CicloAmeaca,
  type EstadoAmeacaNoInstante,
} from './ameacas';
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
  | { readonly tipo: 'totem_ativado'; readonly celula: Coordenada }
  | { readonly tipo: 'habitante_resgatado'; readonly celula: Coordenada }
  | {
      readonly tipo: 'prova_coletada';
      readonly prova: ProvaNaFase;
      readonly totalColetadas: number;
      readonly totalProvas: number;
    }
  | { readonly tipo: 'saida_acesa'; readonly celula: Coordenada }
  | { readonly tipo: 'abrir_prova'; readonly prova: ProvaNaFase }
  | {
      readonly tipo: 'morreu';
      readonly origem: Coordenada;
      readonly destinoRetorno: Coordenada;
      readonly mortes: number;
    }
  | { readonly tipo: 'retornou_ao_totem'; readonly destinoRetorno: Coordenada }
  | { readonly tipo: 'ciclos_reiniciados' }
  | { readonly tipo: 'fase_concluida'; readonly celula: Coordenada };

export interface EstadoFase {
  readonly fase: Fase;
  readonly velocidadeTilesPorSegundo: number;
  readonly perigosProvisorios: readonly Coordenada[];
  readonly simularAmeacas: boolean;
  readonly ciclosAmeacas: readonly CicloAmeaca[];
  posicao: PosicaoContinua;
  celulaAtual: Coordenada;
  deslizando: boolean;
  direcaoAtual: Direcao | null;
  destinoDeslize: Coordenada | null;
  comandoEmBuffer: Direcao | null;
  deslizes: number;
  mortes: number;
  versaoCiclos: number;
  tempoCicloSegundos: number;
  totemAtivo: Coordenada | null;
  habitanteResgatado: boolean;
  provasColetadas: NumeroProva[];
  provasPendentesOverlay: ProvaNaFase[];
  provaEmExibicao: ProvaNaFase | null;
  pausado: boolean;
  saidaAcesa: boolean;
  conclusaoPendente: boolean;
  concluida: boolean;
}

export interface OpcoesEstadoFase {
  velocidadeTilesPorSegundo?: number;
  provasJaColetadas?: readonly NumeroProva[];
  habitanteJaResgatado?: boolean;
  perigosProvisorios?: readonly Coordenada[];
  simularAmeacas?: boolean;
}

export const VETOR_DIRECAO: Record<Direcao, { readonly dc: number; readonly dl: number }> = {
  cima: { dc: 0, dl: -1 },
  baixo: { dc: 0, dl: 1 },
  esquerda: { dc: -1, dl: 0 },
  direita: { dc: 1, dl: 0 },
};

function mesmaCoordenada(a: Coordenada | null, b: Coordenada | null): boolean {
  return a !== null && b !== null && a.col === b.col && a.lin === b.lin;
}

export function pontoDeRetorno(estado: EstadoFase): Coordenada {
  const ponto = estado.totemAtivo ?? estado.fase.inicio;
  return { col: ponto.col, lin: ponto.lin };
}

export function posicoesAmeacasAtuais(estado: EstadoFase): EstadoAmeacaNoInstante[] {
  return calcularPosicoesAmeacas(estado.ciclosAmeacas, estado.tempoCicloSegundos);
}

function estaCongelado(estado: EstadoFase): boolean {
  return estado.concluida || estado.pausado || estado.provaEmExibicao !== null;
}

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
    perigosProvisorios: (opcoes.perigosProvisorios ?? []).map((p) => ({
      col: p.col,
      lin: p.lin,
    })),
    simularAmeacas: opcoes.simularAmeacas ?? true,
    ciclosAmeacas: fase.ameacas.map((ameaca) => compilarCicloAmeaca(ameaca)),
    posicao: { x: inicio.col, y: inicio.lin },
    celulaAtual: inicio,
    deslizando: false,
    direcaoAtual: null,
    destinoDeslize: null,
    comandoEmBuffer: null,
    deslizes: 0,
    mortes: 0,
    versaoCiclos: 0,
    tempoCicloSegundos: 0,
    totemAtivo: null,
    habitanteResgatado: opcoes.habitanteJaResgatado ?? false,
    provasColetadas,
    provasPendentesOverlay: [],
    provaEmExibicao: null,
    pausado: false,
    saidaAcesa: provasColetadas.length >= TOTAL_PROVAS_FASE,
    conclusaoPendente: false,
    concluida: false,
  };
}

export function pausarJogo(estado: EstadoFase): void {
  if (estado.concluida) return;
  estado.pausado = true;
}

export function retomarJogo(estado: EstadoFase): void {
  estado.pausado = false;
}

function reposicionarNoRetorno(
  estado: EstadoFase,
  contarMorte: boolean,
  origemMorte: Coordenada,
  eventos: EventoDeslize[],
): void {
  const destino = pontoDeRetorno(estado);

  if (contarMorte) {
    estado.mortes += 1;
  }

  estado.pausado = false;
  estado.posicao = { x: destino.col, y: destino.lin };
  estado.celulaAtual = { col: destino.col, lin: destino.lin };
  estado.deslizando = false;
  estado.direcaoAtual = null;
  estado.destinoDeslize = null;
  estado.comandoEmBuffer = null;
  estado.conclusaoPendente = false;
  estado.tempoCicloSegundos = 0;
  estado.versaoCiclos += 1;

  if (contarMorte) {
    eventos.push({
      tipo: 'morreu',
      origem: { col: origemMorte.col, lin: origemMorte.lin },
      destinoRetorno: destino,
      mortes: estado.mortes,
    });
  } else {
    eventos.push({
      tipo: 'retornou_ao_totem',
      destinoRetorno: destino,
    });
  }

  eventos.push({ tipo: 'ciclos_reiniciados' });

  if (estado.provaEmExibicao === null && estado.provasPendentesOverlay.length > 0) {
    abrirProximaProvaPendente(estado, eventos);
  }
}

export function matarProtagonista(
  estado: EstadoFase,
  origem: Coordenada = estado.celulaAtual,
): EventoDeslize[] {
  if (estado.concluida) {
    return [];
  }

  const eventos: EventoDeslize[] = [];
  reposicionarNoRetorno(estado, true, origem, eventos);
  return eventos;
}

export function voltarAoTotem(estado: EstadoFase): EventoDeslize[] {
  if (estado.concluida) {
    return [];
  }

  const eventos: EventoDeslize[] = [];
  reposicionarNoRetorno(estado, false, estado.celulaAtual, eventos);
  return eventos;
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
  if (estaCongelado(estado)) {
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

type EncontroNoPasso =
  | {
      readonly dist: number;
      readonly prioridade: number;
      readonly tipo: 'totem';
      readonly celula: Coordenada;
    }
  | {
      readonly dist: number;
      readonly prioridade: number;
      readonly tipo: 'prova';
      readonly prova: ProvaNaFase;
    }
  | {
      readonly dist: number;
      readonly prioridade: number;
      readonly tipo: 'habitante';
      readonly celula: Coordenada;
    }
  | {
      readonly dist: number;
      readonly prioridade: number;
      readonly tipo: 'saida';
      readonly celula: Coordenada;
    }
  | {
      readonly dist: number;
      readonly prioridade: number;
      readonly tipo: 'perigo';
      readonly celula: Coordenada;
    };

function coletarEncontrosNoPasso(
  estado: EstadoFase,
  direcao: Direcao,
  alcancePasso: number,
): EncontroNoPasso[] {
  const encontros: EncontroNoPasso[] = [];

  for (const totem of estado.fase.totens) {
    const dist = distanciaAteAlvoNoTrajeto(estado.posicao, direcao, totem, alcancePasso);
    if (dist !== null) {
      encontros.push({ dist, prioridade: 0, tipo: 'totem', celula: totem });
    }
  }

  for (const prova of estado.fase.provas) {
    if (estado.provasColetadas.includes(prova.numero)) continue;
    const dist = distanciaAteAlvoNoTrajeto(
      estado.posicao,
      direcao,
      prova.posicao,
      alcancePasso,
    );
    if (dist !== null) {
      encontros.push({ dist, prioridade: 1, tipo: 'prova', prova });
    }
  }

  if (estado.fase.habitante && !estado.habitanteResgatado) {
    const dist = distanciaAteAlvoNoTrajeto(
      estado.posicao,
      direcao,
      estado.fase.habitante,
      alcancePasso,
    );
    if (dist !== null) {
      encontros.push({
        dist,
        prioridade: 2,
        tipo: 'habitante',
        celula: estado.fase.habitante,
      });
    }
  }

  const distSaida = distanciaAteAlvoNoTrajeto(
    estado.posicao,
    direcao,
    estado.fase.saida,
    alcancePasso,
  );
  if (distSaida !== null) {
    encontros.push({
      dist: distSaida,
      prioridade: 3,
      tipo: 'saida',
      celula: estado.fase.saida,
    });
  }

  for (const perigo of estado.perigosProvisorios) {
    const dist = distanciaAteAlvoNoTrajeto(estado.posicao, direcao, perigo, alcancePasso);
    if (dist !== null) {
      encontros.push({ dist, prioridade: 4, tipo: 'perigo', celula: perigo });
    }
  }

  return encontros.sort((a, b) => a.dist - b.dist || a.prioridade - b.prioridade);
}

function avancarDeslize(
  estado: EstadoFase,
  deltaSegundos: number,
  eventos: EventoDeslize[],
): void {
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

    const encontros = coletarEncontrosNoPasso(estado, direcao, alcancePasso);
    let interrompido = false;

    for (const encontro of encontros) {
      switch (encontro.tipo) {
        case 'totem':
          if (!mesmaCoordenada(estado.totemAtivo, encontro.celula)) {
            estado.totemAtivo = { col: encontro.celula.col, lin: encontro.celula.lin };
            eventos.push({
              tipo: 'totem_ativado',
              celula: { col: encontro.celula.col, lin: encontro.celula.lin },
            });
          }
          break;

        case 'prova': {
          const { prova } = encontro;
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
            eventos.push({
              tipo: 'saida_acesa',
              celula: { col: estado.fase.saida.col, lin: estado.fase.saida.lin },
            });
          }
          break;
        }

        case 'habitante':
          estado.habitanteResgatado = true;
          eventos.push({
            tipo: 'habitante_resgatado',
            celula: { col: encontro.celula.col, lin: encontro.celula.lin },
          });
          break;

        case 'saida': {
          if (!estado.saidaAcesa) break;
          const saida = { col: encontro.celula.col, lin: encontro.celula.lin };
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
          interrompido = true;
          break;
        }

        case 'perigo':
          reposicionarNoRetorno(estado, true, encontro.celula, eventos);
          interrompido = true;
          break;
      }

      if (interrompido) break;
    }

    if (interrompido) {
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
}

function encontrarAmeacaEmContato(estado: EstadoFase): EstadoAmeacaNoInstante | null {
  for (const ciclo of estado.ciclosAmeacas) {
    const atual = avaliarAmeacaNoTempo(ciclo, estado.tempoCicloSegundos);
    if (colideComAmeaca(estado.posicao, atual.posicao)) {
      return atual;
    }
  }
  return null;
}

export function atualizarDeslize(
  estado: EstadoFase,
  deltaSegundos: number,
): EventoDeslize[] {
  if (estaCongelado(estado) || deltaSegundos <= 0) {
    return [];
  }

  const eventos: EventoDeslize[] = [];
  const temAmeacasAtivas = estado.simularAmeacas && estado.ciclosAmeacas.length > 0;

  if (!temAmeacasAtivas) {
    if (!estado.deslizando) {
      return [];
    }
    avancarDeslize(estado, deltaSegundos, eventos);
    return eventos;
  }

  const passoMaximo = Math.min(
    1 / 120,
    0.35 / Math.max(1, estado.velocidadeTilesPorSegundo),
  );
  let tempoRestante = deltaSegundos;

  while (tempoRestante > 1e-9 && !estaCongelado(estado)) {
    const dt = Math.min(tempoRestante, passoMaximo);
    tempoRestante -= dt;

    const versaoAntes = estado.versaoCiclos;
    estado.tempoCicloSegundos += dt;

    if (estado.deslizando) {
      avancarDeslize(estado, dt, eventos);
    }

    if (estado.versaoCiclos !== versaoAntes || estaCongelado(estado)) {
      break;
    }

    const emContato = encontrarAmeacaEmContato(estado);
    if (emContato) {
      reposicionarNoRetorno(estado, true, emContato.celula, eventos);
      break;
    }
  }

  return eventos;
}
