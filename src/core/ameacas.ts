import type { Direcao, PosicaoContinua } from './deslize';
import type { AmeacaNaFase, Coordenada, TipoAmeaca } from './fase';

/** Raio de contato em tiles (menor que 1.0 para nunca atingir trilhos paralelos adjacentes). */
export const RAIO_COLISAO_AMEACA_TILES = 0.65;

export interface EtapaCicloAmeaca {
  readonly inicioSegundos: number;
  readonly fimSegundos: number;
  readonly duracaoSegundos: number;
  readonly origem: Coordenada;
  readonly destino: Coordenada;
  readonly direcao: Direcao;
  readonly pausada: boolean;
}

export interface CicloAmeaca {
  readonly ameaca: AmeacaNaFase;
  readonly etapas: readonly EtapaCicloAmeaca[];
  readonly duracaoTotalSegundos: number;
}

export interface EstadoAmeacaNoInstante {
  readonly id: string;
  readonly tipo: TipoAmeaca;
  readonly posicao: PosicaoContinua;
  readonly celula: Coordenada;
  readonly direcao: Direcao;
  readonly pausada: boolean;
}

function chaveCoord(coord: Coordenada): string {
  return `${coord.col},${coord.lin}`;
}

function direcaoEntre(origem: Coordenada, destino: Coordenada): Direcao {
  const dc = destino.col - origem.col;
  const dl = destino.lin - origem.lin;
  if (Math.abs(dc) >= Math.abs(dl)) {
    return dc >= 0 ? 'direita' : 'esquerda';
  }
  return dl >= 0 ? 'baixo' : 'cima';
}

export function compilarCicloAmeaca(ameaca: AmeacaNaFase): CicloAmeaca {
  const pausasPorVertice = new Map<string, number>();
  for (const pausa of ameaca.pausas) {
    pausasPorVertice.set(chaveCoord(pausa.vertice), pausa.duracaoSegundos);
  }

  const sequenciaVertices: Coordenada[] = [...ameaca.vertices];
  if (ameaca.ciclo === 'loop') {
    sequenciaVertices.push(ameaca.vertices[0]);
  } else {
    for (let i = ameaca.vertices.length - 2; i >= 0; i--) {
      sequenciaVertices.push(ameaca.vertices[i]);
    }
  }

  const etapas: EtapaCicloAmeaca[] = [];
  let cursorTempo = 0;

  for (let i = 0; i < sequenciaVertices.length - 1; i++) {
    const origem = sequenciaVertices[i];
    const destino = sequenciaVertices[i + 1];
    const distanciaTiles =
      Math.abs(destino.col - origem.col) + Math.abs(destino.lin - origem.lin);
    const direcao = direcaoEntre(origem, destino);

    if (distanciaTiles > 0) {
      const duracao = distanciaTiles / ameaca.velocidadeTilesPorSegundo;
      etapas.push({
        inicioSegundos: cursorTempo,
        fimSegundos: cursorTempo + duracao,
        duracaoSegundos: duracao,
        origem,
        destino,
        direcao,
        pausada: false,
      });
      cursorTempo += duracao;
    }

    const pausaDestino = pausasPorVertice.get(chaveCoord(destino));
    if (pausaDestino && pausaDestino > 0) {
      etapas.push({
        inicioSegundos: cursorTempo,
        fimSegundos: cursorTempo + pausaDestino,
        duracaoSegundos: pausaDestino,
        origem: destino,
        destino,
        direcao,
        pausada: true,
      });
      cursorTempo += pausaDestino;
    }
  }

  return {
    ameaca,
    etapas,
    duracaoTotalSegundos: cursorTempo,
  };
}

function ehCicloCompilado(valor: AmeacaNaFase | CicloAmeaca): valor is CicloAmeaca {
  return 'etapas' in valor && 'duracaoTotalSegundos' in valor;
}

export function avaliarAmeacaNoTempo(
  ameacaOuCiclo: AmeacaNaFase | CicloAmeaca,
  tempoSegundos: number,
): EstadoAmeacaNoInstante {
  const ciclo = ehCicloCompilado(ameacaOuCiclo)
    ? ameacaOuCiclo
    : compilarCicloAmeaca(ameacaOuCiclo);
  const { ameaca, etapas, duracaoTotalSegundos } = ciclo;

  if (etapas.length === 0 || duracaoTotalSegundos <= 0) {
    return {
      id: ameaca.id,
      tipo: ameaca.tipo,
      posicao: { x: ameaca.posicaoInicial.col, y: ameaca.posicaoInicial.lin },
      celula: { col: ameaca.posicaoInicial.col, lin: ameaca.posicaoInicial.lin },
      direcao: 'direita',
      pausada: true,
    };
  }

  const tempoSeguro = tempoSegundos <= 0 ? 0 : tempoSegundos;
  const tempoNoCiclo = tempoSeguro % duracaoTotalSegundos;

  let etapaAtual = etapas[etapas.length - 1];
  for (const etapa of etapas) {
    if (tempoNoCiclo < etapa.fimSegundos || etapa === etapas[etapas.length - 1]) {
      etapaAtual = etapa;
      break;
    }
  }

  if (etapaAtual.pausada || etapaAtual.duracaoSegundos <= 0) {
    return {
      id: ameaca.id,
      tipo: ameaca.tipo,
      posicao: { x: etapaAtual.origem.col, y: etapaAtual.origem.lin },
      celula: { col: etapaAtual.origem.col, lin: etapaAtual.origem.lin },
      direcao: etapaAtual.direcao,
      pausada: true,
    };
  }

  const progresso = Math.min(
    1,
    Math.max(0, (tempoNoCiclo - etapaAtual.inicioSegundos) / etapaAtual.duracaoSegundos),
  );
  const x =
    etapaAtual.origem.col + (etapaAtual.destino.col - etapaAtual.origem.col) * progresso;
  const y =
    etapaAtual.origem.lin + (etapaAtual.destino.lin - etapaAtual.origem.lin) * progresso;

  return {
    id: ameaca.id,
    tipo: ameaca.tipo,
    posicao: { x, y },
    celula: { col: Math.round(x), lin: Math.round(y) },
    direcao: etapaAtual.direcao,
    pausada: false,
  };
}

export function calcularPosicoesAmeacas(
  ciclos: readonly CicloAmeaca[],
  tempoSegundos: number,
): EstadoAmeacaNoInstante[] {
  return ciclos.map((ciclo) => avaliarAmeacaNoTempo(ciclo, tempoSegundos));
}

export function colideComAmeaca(
  posicaoProtagonista: PosicaoContinua,
  posicaoAmeaca: PosicaoContinua,
  raioColisaoTiles: number = RAIO_COLISAO_AMEACA_TILES,
): boolean {
  const dx = posicaoProtagonista.x - posicaoAmeaca.x;
  const dy = posicaoProtagonista.y - posicaoAmeaca.y;
  return Math.hypot(dx, dy) <= raioColisaoTiles;
}
