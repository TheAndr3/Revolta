export const CONFIG = {
  /** Velocidade do deslize do Protagonista em tiles por segundo (única fonte de verdade). */
  velocidadeDeslizeTilesPorSegundo: 45,
  /** Tamanho lógico de cada tile em pixels. */
  tamanhoTilePx: 16,
  /** Largura fixa de todas as Fases em tiles. */
  larguraFaseTiles: 15,
  /** Distância mínima de arrasto (em CSS px) para reconhecer um swipe no celular/pointer. */
  distanciaMinimaSwipePx: 30,
  /** Espinhos temporários: tempos de cada etapa do ciclo, em segundos. */
  espinhos: {
    /** Depois de pisado, quanto tempo até subir (o deslize atravessa o tile bem antes disso). */
    avisoSegundos: 0.5,
    /** Quanto tempo fica ativo (mata ao contato). */
    ativoSegundos: 1.5,
    /** Animação de recolher; já não mata. */
    recolhendoSegundos: 0.25,
  },
  /** Duração visual do tranco contra a parede em milissegundos. */
  duracaoTrancoMs: 110,
  /** Alcance do look-ahead vertical da câmera em tiles. */
  lookAheadVerticalTiles: 2.5,
  /**
   * Velocidade de referência de cada Ameaça em tiles por segundo (legenda, seção 2.2).
   * Usada quando a Fase escreve `-` no campo `vel`.
   */
  velocidadeReferenciaAmeacaTilesPorSegundo: {
    gosma: 3,
    drone: 10,
    guarda: 5,
  },
} as const;
