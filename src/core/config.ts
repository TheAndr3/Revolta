export const CONFIG = {
  /** Velocidade do deslize do Protagonista em tiles por segundo (única fonte de verdade). */
  velocidadeDeslizeTilesPorSegundo: 45,
  /** Tamanho lógico de cada tile em pixels. */
  tamanhoTilePx: 16,
  /** Efeitos por código ("feel", ADR 0004). Tudo aqui é visual e pode ser ajustado no playtest. */
  feel: {
    /** Escala do corpo durante o deslize (x: largura, y: comprimento na direção do movimento). */
    estiramentoDeslize: { x: 0.9, y: 1.12 },
    /** Achatamento ao bater na parede, que volta ao normal em `duracaoMs`. */
    achatamentoBatida: { x: 1.3, y: 0.72, duracaoMs: 160 },
    /** Rastro de partículas enquanto desliza. */
    rastro: { intervaloMs: 16, vidaMs: 280, alfaInicial: 0.6, cor: 0xf4d35e },
    /** Morte: tremor de tela e folhas que se espalham. */
    morte: { tremorMs: 240, tremorIntensidade: 0.012, folhas: 22, vidaFolhasMs: 900 },
    /** Ativação do Totem: clarão da câmera e partículas. */
    totem: { claraoMs: 180, particulas: 16, vidaParticulasMs: 520 },
    /**
     * Luz da Saída acesa: brilho pulsante grande (raio em tiles) e partículas subindo,
     * para ser vista de longe (sinalização diegética, sem seta nem minimapa).
     */
    saida: {
      raioBrilhoTiles: 4,
      alfaBrilho: { min: 0.28, max: 0.6 },
      pulsoMs: 900,
      particulasPorSegundo: 14,
      alturaParticulasTiles: 5,
    },
    /** Câmera: rapidez com que o look-ahead e a rolagem alcançam o alvo (maior = mais seco). */
    camera: { suavidadeLookAhead: 9, suavidadeRolagem: 12 },
  },
  /** Largura fixa de todas as Fases em tiles. */
  larguraFaseTiles: 15,
  /** Distância mínima de arrasto (em CSS px) para reconhecer um swipe no celular/pointer. */
  distanciaMinimaSwipePx: 30,
  /** Duração visual do tranco contra a parede em milissegundos. */
  duracaoTrancoMs: 110,
  /** Alcance do look-ahead vertical da câmera em tiles. */
  lookAheadVerticalTiles: 2.5,
} as const;
