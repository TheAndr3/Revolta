export const CONFIG = {
  /** Velocidade do deslize do Protagonista em tiles por segundo (única fonte de verdade). */
  velocidadeDeslizeTilesPorSegundo: 45,
  /** Tamanho lógico de cada tile em pixels. */
  tamanhoTilePx: 16,
  /** Largura fixa de todas as Fases em tiles. */
  larguraFaseTiles: 15,
  /** Distância mínima de arrasto (em CSS px) para reconhecer um swipe no celular/pointer. */
  distanciaMinimaSwipePx: 30,
  /** Duração visual do tranco contra a parede em milissegundos. */
  duracaoTrancoMs: 110,
  /** Alcance do look-ahead vertical da câmera em tiles. */
  lookAheadVerticalTiles: 2.5,
} as const;
