export type TipoCelula = 'chao' | 'parede' | 'inicio' | 'saida';

export type NumeroProva = 1 | 2 | 3;

export const TOTAL_PROVAS_FASE = 3;

export type TipoProva = 'passado' | 'transformacao' | 'responsaveis';

export const TIPO_PROVA_POR_NUMERO: Record<NumeroProva, TipoProva> = {
  1: 'passado',
  2: 'transformacao',
  3: 'responsaveis',
};

export type TipoAmeaca = 'gosma' | 'drone' | 'guarda';

export type TipoCicloAmeaca = 'loop' | 'vai-e-volta';

export interface Coordenada {
  readonly col: number;
  readonly lin: number;
}

export interface ProvaNaFase {
  readonly numero: NumeroProva;
  readonly tipo: TipoProva;
  readonly posicao: Coordenada;
}

export interface PausaAmeaca {
  readonly vertice: Coordenada;
  readonly duracaoSegundos: number;
}

export interface AmeacaNaFase {
  readonly id: string;
  readonly tipo: TipoAmeaca;
  readonly ciclo: TipoCicloAmeaca;
  readonly velocidadeTilesPorSegundo: number;
  readonly posicaoInicial: Coordenada;
  readonly vertices: readonly Coordenada[];
  readonly trilho: readonly Coordenada[];
  readonly pausas: readonly PausaAmeaca[];
}

/** Uma Fase tem de 0 a 4 Habitantes (2–4 nas Fases do jogo, um por Desvio). */
export const MAXIMO_HABITANTES_FASE = 4;

export interface Fase {
  readonly largura: number;
  readonly altura: number;
  readonly grade: readonly (readonly TipoCelula[])[];
  readonly inicio: Coordenada;
  readonly saida: Coordenada;
  readonly totens: readonly Coordenada[];
  readonly provas: readonly ProvaNaFase[];
  /**
   * Habitantes a resgatar (símbolo `H`), de 0 a `MAXIMO_HABITANTES_FASE`, na ordem de
   * leitura do grid. O número de cada um (1, 2, 3) liga ao conteúdo
   * `content/habitantes/<conteudo>/<número>.md`.
   */
  readonly habitantes: readonly Coordenada[];
  readonly espinhos: readonly Coordenada[];
  /** Solo erodido que desaba após a passagem (símbolo `~`). */
  readonly solosErodidos: readonly Coordenada[];
  /** Almas da floresta (colecionável opcional, símbolo `o`), na ordem de leitura do grid. */
  readonly almas: readonly Coordenada[];
  readonly ameacas: readonly AmeacaNaFase[];
}

export function celulaEm(fase: Fase, col: number, lin: number): TipoCelula | null {
  if (lin < 0 || lin >= fase.altura || col < 0 || col >= fase.largura) {
    return null;
  }
  return fase.grade[lin][col];
}

export function ehParede(fase: Fase, col: number, lin: number): boolean {
  const celula = celulaEm(fase, col, lin);
  return celula === null || celula === 'parede';
}
