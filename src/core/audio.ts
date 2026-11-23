/**
 * Regras puras do áudio (#30): qual som toca em cada evento do núcleo e
 * o volume dos loops das Ameaças pela distância ao Protagonista.
 */

/** Efeitos sonoros do jogo (~15 na issue #6). */
export type IdSom =
  | 'deslize'
  | 'batida'
  | 'tranco'
  | 'prova'
  | 'totem'
  | 'saida'
  | 'morte'
  | 'reaparecer'
  | 'espinho'
  | 'resgate'
  | 'conclusao'
  | 'alma'
  | 'interface';

/** Loops contínuos: a música e o som das Ameaças. */
export type IdLoop = 'musica' | 'gosma' | 'drone';

export const IDS_SOM: readonly IdSom[] = [
  'deslize',
  'batida',
  'tranco',
  'prova',
  'totem',
  'saida',
  'morte',
  'reaparecer',
  'espinho',
  'resgate',
  'conclusao',
  'alma',
  'interface',
];

export const CONFIG_AUDIO = {
  /** Volumes de 0 a 1. Sem botão de mudo: o volume geral fica com o sistema. */
  volumeMusica: 0.35,
  volumeEfeitos: 0.7,
  /** Volume máximo de cada loop de Ameaça, quando ela está colada no Protagonista. */
  volumeMaximoLoop: { gosma: 0.35, drone: 0.55 },
  /** A partir desta distância (em tiles) o loop da Ameaça fica em silêncio. */
  alcanceLoopTiles: { gosma: 6, drone: 9 },
} as const;

/**
 * Sons disparados por um evento do núcleo do deslize.
 * Recebe o tipo como texto para aceitar eventos novos sem quebrar (ex.: `espinho_acionado`).
 */
export function sonsDoEvento(tipo: string): IdSom[] {
  switch (tipo) {
    case 'iniciou_deslize':
      return ['deslize'];
    case 'parou_na_parede':
      return ['batida'];
    case 'tranco':
      return ['tranco'];
    case 'prova_coletada':
      return ['prova'];
    case 'totem_ativado':
      return ['totem'];
    case 'saida_acesa':
      return ['saida'];
    case 'morreu':
      return ['morte', 'reaparecer'];
    case 'retornou_ao_totem':
      return ['reaparecer'];
    case 'espinho_acionado':
      return ['espinho'];
    case 'habitante_resgatado':
      return ['resgate'];
    case 'fase_concluida':
      return ['conclusao'];
    case 'alma_coletada':
      return ['alma'];
    default:
      return [];
  }
}

/**
 * Volume de um loop pela distância: máximo colado no Protagonista, cai com o
 * quadrado da distância relativa e chega a zero no alcance. `null` (sem Ameaça) é silêncio.
 */
export function volumePorDistancia(
  distanciaTiles: number | null,
  alcanceTiles: number,
  volumeMaximo: number,
): number {
  if (distanciaTiles === null || !Number.isFinite(distanciaTiles) || alcanceTiles <= 0) return 0;
  const proximidade = Math.max(0, 1 - distanciaTiles / alcanceTiles);
  return volumeMaximo * proximidade * proximidade;
}
