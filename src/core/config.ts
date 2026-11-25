export const CONFIG = {
  /** Velocidade do deslize do Protagonista em tiles por segundo (única fonte de verdade). */
  velocidadeDeslizeTilesPorSegundo: 45,
  /** Tamanho lógico de cada tile em pixels. */
  tamanhoTilePx: 16,
  /** Efeitos por código ("feel", ADR 0004). Tudo aqui é visual e pode ser ajustado no playtest. */
  feel: {
    /**
     * Achatamento extra ao bater na parede (além do quadro de batida da spritesheet):
     * `contra` é a escala no eixo do deslize e `largura` no outro; volta em `duracaoMs`.
     */
    achatamentoBatida: { contra: 0.86, largura: 1.12, duracaoMs: 160 },
    /** Rastro de partículas enquanto desliza (luz do espírito da mata). */
    rastro: { intervaloMs: 16, vidaMs: 280, alfaInicial: 0.6, cor: 0x52e596 },
    /** Protagonista como espírito da mata: aura, esporos, ecos no deslize longo e impacto. */
    protagonista: {
      /** A partir de quantos tiles o deslize vira "corrida do espírito" (ecos, folhas, aura maior). */
      distanciaEspiritoTiles: 5,
      /** Ecos (imagens que ficam para trás) durante a corrida do espírito. */
      eco: { intervaloMs: 40, vidaMs: 200, alfa: 0.36 },
      /** Aura verde em volta do corpo: pulso do alfa e escala extra na corrida do espírito. */
      aura: { alfa: { min: 0.14, max: 0.3 }, pulsoMs: 1400, escalaCorrida: 1.6 },
      /**
       * Impacto na parede, interpolado pela força (0 = deslize de 1 tile, 1 = 8 tiles ou mais):
       * poeira e folhas sempre; tremor de tela e brotos no chão só nos fortes.
       */
      impacto: {
        poeira: { min: 4, max: 14 },
        folhas: { min: 1, max: 8 },
        tremorAPartir: 0.35,
        tremorMs: { min: 70, max: 150 },
        tremorIntensidade: { min: 0.003, max: 0.008 },
        brotosAPartir: 0.5,
        /** Quanto o quadro de batida fica na tela (a "parada" do impacto), em ms. */
        pausaMs: { min: 110, max: 220 },
      },
    },
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
  /**
   * Câmera próxima (ADR 0006): mostra cerca de 9 das 15 colunas e segue nos dois eixos.
   * A escala é sempre inteira, então o número de linhas visíveis varia com a tela.
   */
  camera: {
    colunasVisiveis: 9,
    /** Mínimo de linhas visíveis: 7 acima e 7 abaixo do Protagonista (RAIO_VISAO da legenda). */
    linhasMinimasVisiveis: 15,
    /** Alcance do look-ahead horizontal em tiles (o vertical é `lookAheadVerticalTiles`). */
    lookAheadHorizontalTiles: 2,
  },
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
    // 5 → 4 em 25/11/2026: no playtest o Guarda estava rápido demais.
    guarda: 4,
  },
} as const;
