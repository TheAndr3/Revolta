import Phaser from 'phaser';
import { CONFIG } from '../core/config';
import type { EtapaEspinho } from '../core/espinhos';
import type { EtapaSoloErodido } from '../core/soloErodido';
import {
  OBJETOS_GRANDES,
  SO_GRAMA,
  TINTA_CONSTRUCAO,
  decorarBeiras,
  decorarParedes,
  escurecer,
  mascaraTrilha,
  variacaoGrama,
} from './cenarioFloresta';
import {
  atualizarDeslize,
  contarAlmasColetadas,
  contarHabitantesResgatados,
  criarEstadoFase,
  distanciaAteAmeacaMaisProxima,
  fecharProvaEmExibicao,
  pausarJogo,
  posicoesAmeacasAtuais,
  retomarJogo,
  solicitarDirecao,
  VETOR_DIRECAO,
  voltarAoTotem,
  type Direcao,
  type EstadoFase,
  type EventoDeslize,
} from '../core/deslize';
import type { EstadoAmeacaNoInstante } from '../core/ameacas';
import {
  TOTAL_PROVAS_FASE,
  type Coordenada,
  type Fase,
  type NumeroProva,
  type ProvaNaFase,
  type TipoAmeaca,
} from '../core/fase';
import {
  COLUNAS_ACAO,
  LINHA_MORTE,
  LINHA_OLHAR,
  QUADROS_MORTE,
  SPRITES_PROTAGONISTA,
  chaveAnimacao,
  distanciaDoDeslize,
  indiceQuadro,
  intensidadeDoImpacto,
  olharDaDirecao,
  type Olhar,
} from './protagonistaSprites';
import {
  ANGULO_DRONE,
  ANGULO_LANTERNA,
  COLUNAS_GUARDA,
  LINHA_GUARDA,
  SPRITES_DRONE,
  SPRITES_GUARDA,
  chaveAnimacaoGuarda,
} from './ameacasSprites';
import {
  COLUNAS_HABITANTE,
  SPRITES_HABITANTES,
  chaveAnimacaoHabitante,
  linhaDoHabitante,
} from './habitantesSprites';

/** Cores da paleta usadas nos efeitos do Protagonista (art/paleta.hex). */
const COR_ESPIRITO = 0x52e596;
const COR_VERDE_CLARO = 0xb5d96a;
const COR_BROTO = 0x6fae5a;
const COR_POEIRA = [0xd9a066, 0xa0703f, 0x8a9a90];
const COR_NOITE = 0x0d1512;
const COR_VERMELHO_MAQUINA = 0xc23b22;
const COR_AMARELO_SINAL = 0xf4d35e;

/**
 * Leque (em graus do Phaser: 0 = direita, 90 = baixo) em que a poeira sai da parede:
 * a parede está na direção do deslize, então a poeira volta para o lado oposto.
 */
const ANGULO_PARA_LONGE_DA_PAREDE: Record<Direcao, { min: number; max: number }> = {
  baixo: { min: 200, max: 340 },
  cima: { min: 20, max: 160 },
  direita: { min: 110, max: 250 },
  esquerda: { min: -70, max: 70 },
};

export interface ResumoConclusaoFase {
  readonly deslizes: number;
  readonly mortes: number;
  /** Tempo jogado na tentativa, sem pausas nem overlays de Prova. */
  readonly tempoSegundos: number;
  readonly habitantesResgatados: number;
  readonly habitantesTotal: number;
  readonly almasColetadas: number;
  readonly almasTotal: number;
}

export interface OpcoesFaseScene {
  /** Aparência de cada Habitante (mesma ordem de `fase.habitantes`; vazio: pelo número). */
  readonly aparenciasHabitantes?: readonly string[];
}

export interface CallbacksFaseScene {
  aoConcluir: (resumo: ResumoConclusaoFase) => void;
  aoAtualizarDeslizes: (deslizes: number) => void;
  aoAtualizarMortes: (mortes: number) => void;
  aoAtualizarProvas: (coletadas: number, total: number) => void;
  aoAtualizarHabitantes: (resgatados: number, total: number) => void;
  aoAtualizarAlmas: (coletadas: number, total: number) => void;
  aoColetarProva: (prova: ProvaNaFase) => void;
  aoAbrirProva: (prova: ProvaNaFase) => void;
  /** `indice` é a posição em `fase.habitantes` (o número do Habitante é `indice + 1`). */
  aoResgatarHabitante: (indice: number) => void;
  /** Todos os eventos do núcleo, na ordem em que acontecem (usado pelo áudio). */
  aoEventos?: (eventos: readonly EventoDeslize[]) => void;
}

const CORES = {
  fundo: 0x0d1512,
  chao: 0x1a2620,
  gradeChao: 0x22312a,
  parede: 0x3b4d45,
  paredeBorda: 0x526b5f,
  paredeSombra: 0x26332d,
  inicio: 0x2b4a3e,
  saidaApagadaBase: 0x24312b,
  saidaApagadaNucleo: 0x3b4d45,
  saidaBase: 0x2ec474,
  saidaBrilho: 0x9ef7c2,
  saidaHalo: 0x52e596,
  almaNucleo: 0xeef4f0,
  almaBrilho: 0x7dd3fc,
  almaContorno: 0x2f6f73,
  // Floresta à noite
  cogumeloChapeu: 0x7dd3fc,
  cogumeloBrilho: 0x7cc6b8,
  cogumeloPe: 0x8a9a90,
  florPetala: 0x8a6a7a,
  florMiolo: 0xf4d35e,
  vagalumeLima: 0xb5d96a,
  vagalumeCiano: 0x7dd3fc,
  protagonista: 0xf4d35e,
  protagonistaBorda: 0xfff3b0,
  bufferIndicador: 0x7ae582,
  folhaClara: 0x84cc16,
  folhaEscura: 0x4d7c0f,
  folhaSeca: 0xa16207,
  totemInativo: 0x1e4d63,
  totemInativoMarca: 0x7dd3fc,
  totemAtivo: 0x38bdf8,
  totemAtivoMarca: 0x082f49,
  totemHalo: 0x7dd3fc,
  prova: 0xfbbf24,
  provaMarca: 0x451a03,
  habitante: 0xc084fc,
  habitanteMarca: 0x3b0764,
  espinhos: 0xdc2626,
  espinhosBorda: 0xf97316,
  espinhosMarca: 0xfef2f2,
  espinhosFuro: 0x3a2a24,
  espinhosAviso: 0xfb923c,
  soloBorda: 0xc28a4b,
  soloTrinca: 0x4b3324,
  soloTrincaEscura: 0x2f1814,
  soloAviso: 0xf59e0b,
  soloAvisoForte: 0xe05d3a,
  soloBuraco: 0x0c0910,
  soloBuracoFundo: 0x1a1320,
  soloBuracoBeira: 0x5c3e2c,
  gosma: 0x84cc16,
  gosmaMarca: 0x1a2e05,
  gosmaBrilho: 0xd9f99d,
  gosmaTrilho: 0xa3e635,
  drone: 0xef4444,
  droneMarca: 0x450a0a,
  guarda: 0x6366f1,
  guardaMarca: 0x1e1b4b,
  pausaMarca: 0xfef08a,
} as const;

type GlifoMarcador = 'T' | '1' | '2' | '3' | 'H' | '^' | 'G' | 'D' | 'R';

const GLIFOS_MARCADOR: Record<GlifoMarcador, readonly string[]> = {
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  '1': ['..#..', '.##..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '..##.', '.#...', '#####'],
  '3': ['####.', '....#', '.###.', '....#', '####.'],
  H: ['#...#', '#...#', '#####', '#...#', '#...#'],
  '^': ['..#..', '.#.#.', '#...#', '.....', '#####'],
  G: ['.####', '#....', '#.###', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '####.'],
  R: ['####.', '#...#', '####.', '#..#.', '#...#'],
};

const ESTILO_AMEACA: Record<
  TipoAmeaca,
  { readonly cor: number; readonly marca: number; readonly glifo: GlifoMarcador }
> = {
  gosma: { cor: CORES.gosma, marca: CORES.gosmaMarca, glifo: 'G' },
  drone: { cor: CORES.drone, marca: CORES.droneMarca, glifo: 'D' },
  guarda: { cor: CORES.guarda, marca: CORES.guardaMarca, glifo: 'R' },
};

const QUADRO_ESPINHO: Record<EtapaEspinho, number> = {
  recolhido: 0,
  aviso: 1, // 1 e 2 alternam no pisca
  ativo: 4,
  recolhendo: 5,
};

interface MarcadorTotem {
  readonly coord: Coordenada;
  readonly halo: Phaser.GameObjects.Rectangle;
  readonly inativo: Phaser.GameObjects.Graphics;
  readonly ativo: Phaser.GameObjects.Graphics;
}

interface CelulaBrilhoTrilho {
  readonly celula: Coordenada;
  readonly rect: Phaser.GameObjects.Rectangle;
  intensidade: number;
}

export class FaseScene extends Phaser.Scene {
  private readonly fase: Fase;
  private readonly callbacks: CallbacksFaseScene;
  private readonly opcoes: OpcoesFaseScene;
  private estado!: EstadoFase;

  private protagonista!: Phaser.GameObjects.Container;
  private corpoProtagonista!: Phaser.GameObjects.Sprite;
  private marcadorBuffer!: Phaser.GameObjects.Rectangle;
  /** Para onde o Protagonista olha (escolhe a linha da spritesheet). */
  private olharAtual: Olhar = 'frente';
  /** Distância em tiles do deslize em curso (0 parado). */
  private distanciaDeslizeAtual = 0;
  /** Aura verde do espírito da mata, atrás do corpo. */
  private auraEspirito: Phaser.GameObjects.Image | null = null;
  private auraCorridaTween: Phaser.Tweens.Tween | null = null;
  private escalaBaseAura = 1;
  /** Ecos do corpo na corrida do espírito (reaproveitados). */
  private readonly ecos: Phaser.GameObjects.Image[] = [];
  private proximoEcoMs = 0;
  private emissorPoeira: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private emissorFolhasParede: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private emissorFolhasRastro: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private emissorEsporos: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private baseSaida!: Phaser.GameObjects.Rectangle;
  private nucleoSaida!: Phaser.GameObjects.Rectangle;
  private haloSaida!: Phaser.GameObjects.Rectangle;
  private brilhoSaidaTween: Phaser.Tweens.Tween | null = null;
  private haloSaidaTween: Phaser.Tweens.Tween | null = null;

  private readonly marcadoresProva = new Map<NumeroProva, Phaser.GameObjects.Graphics>();
  private readonly marcadoresTotem: MarcadorTotem[] = [];
  private haloTotemTween: Phaser.Tweens.Tween | null = null;
  /** Um sprite por Habitante (mesma ordem de `fase.habitantes`), tremendo de medo até o resgate. */
  private readonly spritesHabitante: Array<{ readonly sprite: Phaser.GameObjects.Sprite; readonly linha: number }> = [];
  private readonly spritesAmeaca = new Map<string, Phaser.GameObjects.Container>();
  /** Corpo do Drone (gira para a direção do trilho). */
  private readonly corposDrone = new Map<string, Phaser.GameObjects.Sprite>();
  /** Corpo do Guarda e o cone da lanterna, que mostra para onde ele olha. */
  private readonly guardas = new Map<
    string,
    { readonly corpo: Phaser.GameObjects.Sprite; readonly cone: Phaser.GameObjects.Image }
  >();
  private readonly brilhosTrilhoGosma: CelulaBrilhoTrilho[] = [];
  /** Um gráfico por espinho, redesenhado quando a etapa muda (e piscando no aviso). */
  /** Um sprite por espinho; troca de quadro por etapa e anima nas transições. */
  private readonly spritesEspinho: Array<{
    readonly sprite: Phaser.GameObjects.Sprite;
    etapa: EtapaEspinho | '';
    quadro: number;
    tween: Phaser.Tweens.Tween | null;
  }> = [];
  private emissorEspinho: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  /** Um sprite por tile de solo erodido (`~`). */
  private readonly spritesSoloErodido: Array<{
    readonly sprite: Phaser.GameObjects.Sprite;
    readonly baseX: number;
    readonly baseY: number;
    etapa: EtapaSoloErodido | '';
    quadro: number;
    tween: Phaser.Tweens.Tween | null;
  }> = [];
  private emissorSoloErodido: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private trancoOffset = { x: 0, y: 0 };
  private trancoTween: Phaser.Tweens.Tween | null = null;
  private lookAheadAtualY = 0;
  private lookAheadAtualX = 0;

  // Almas (colecionável opcional). O sprite `alma` vem da arte, se carregado no preload;
  // senão, um espírito de 4 quadros é desenhado por código.
  private readonly spritesAlma: Phaser.GameObjects.Sprite[] = [];
  /** Halo suave atrás de cada Alma (o brilho de um espírito), na mesma ordem. */
  private readonly halosAlma: Phaser.GameObjects.Image[] = [];
  private emissorAlmas: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  /** Vinheta da noite: fixa na tela, acompanha o tamanho da câmera. */
  private vinheta: Phaser.GameObjects.Image | null = null;

  // Efeitos por código (#20). Valores em CONFIG.feel.
  private reduzirMovimento = false;
  private achatamentoTween: Phaser.Tweens.Tween | null = null;
  private emissorRastro: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private emissorFolhas: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private emissorTotem: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private emissorSaida: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private brilhoSaida: Phaser.GameObjects.Image | null = null;
  private brilhoSaidaPulso: Phaser.Tweens.Tween | null = null;

  constructor(fase: Fase, callbacks: CallbacksFaseScene & OpcoesFaseScene) {
    super({ key: 'FaseScene' });
    this.fase = fase;
    this.callbacks = callbacks;
    this.opcoes = { aparenciasHabitantes: callbacks.aparenciasHabitantes };
  }

  preload(): void {
    this.load.spritesheet(
      SPRITES_PROTAGONISTA.chave,
      `${import.meta.env.BASE_URL}${SPRITES_PROTAGONISTA.arquivo}`,
      { frameWidth: SPRITES_PROTAGONISTA.quadroPx, frameHeight: SPRITES_PROTAGONISTA.quadroPx },
    );
    // Experimento com assets CC0 (ver public/assets/cc0/CREDITOS.md).
    const tamanho = { frameWidth: CONFIG.tamanhoTilePx, frameHeight: CONFIG.tamanhoTilePx };
    // Cenário da floresta: trilha (autotile), grama e objetos (ver cenarioFloresta.ts).
    const cc0 = `${import.meta.env.BASE_URL}assets/cc0`;
    this.load.spritesheet('trilha', `${cc0}/trilha.png`, tamanho);
    this.load.spritesheet('grama', `${cc0}/grama.png`, tamanho);
    this.load.spritesheet('cenario-pequeno', `${cc0}/cenario-pequeno.png`, tamanho);
    for (const objeto of OBJETOS_GRANDES) {
      this.load.image(`cenario-${objeto.chave}`, `${cc0}/cenario/${objeto.chave}.png`);
    }
    this.load.spritesheet('gosma', `${import.meta.env.BASE_URL}assets/cc0/gosma.png`, tamanho);
    for (const folha of [SPRITES_DRONE, SPRITES_GUARDA, SPRITES_HABITANTES]) {
      this.load.spritesheet(folha.chave, `${import.meta.env.BASE_URL}${folha.arquivo}`, {
        frameWidth: folha.quadroPx,
        frameHeight: folha.quadroPx,
      });
    }
  }

  create(): void {
    const tile = CONFIG.tamanhoTilePx;
    const larguraMundo = this.fase.largura * tile;
    const alturaMundo = this.fase.altura * tile;

    this.cameras.main.setBackgroundColor(CORES.fundo);
    this.cameras.main.setBounds(0, 0, larguraMundo, alturaMundo);
    this.reduzirMovimento =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    this.desenharGrade();
    this.desenharElementosPlaceholder();
    this.criarProtagonista();
    this.criarEfeitos();
    this.criarAlmas();
    this.criarNoite();
    this.reiniciar();
  }

  public receberDirecao(direcao: Direcao): void {
    if (!this.estado || this.estado.pausado || this.estado.provaEmExibicao !== null) return;
    const eventos = solicitarDirecao(this.estado, direcao);
    this.processarEventos(eventos);
    this.atualizarIndicadorBuffer();
  }

  /** Tempo jogado na Tentativa (sem pausas nem Prova aberta), para o contador do speedrun. */
  public tempoJogadoSegundos(): number {
    return this.estado?.tempoJogadoSegundos ?? 0;
  }

  public pausar(): void {
    if (!this.estado || this.estado.concluida) return;
    pausarJogo(this.estado);
    this.tweens.pauseAll();
  }

  public retomar(): void {
    if (!this.estado) return;
    retomarJogo(this.estado);
    if (this.estado.provaEmExibicao === null) {
      this.tweens.resumeAll();
    }
  }

  public voltarAoTotem(): void {
    if (!this.estado || this.estado.concluida) return;
    const eventos = voltarAoTotem(this.estado);
    if (!this.estado.pausado && this.estado.provaEmExibicao === null) {
      this.tweens.resumeAll();
    }
    this.processarEventos(eventos);
    this.atualizarIndicadorBuffer();
  }

  /**
   * Distância em tiles do Protagonista até a Ameaça mais próxima do tipo
   * (`null` se a Fase não tiver nenhuma). O áudio usa para o volume dos loops.
   */
  public distanciaAteAmeaca(tipo: TipoAmeaca): number | null {
    if (!this.estado) return null;
    const { x, y } = this.estado.posicao;
    let menor: number | null = null;
    for (const ameaca of posicoesAmeacasAtuais(this.estado)) {
      if (ameaca.tipo !== tipo) continue;
      const distancia = Math.hypot(ameaca.posicao.x - x, ameaca.posicao.y - y);
      if (menor === null || distancia < menor) menor = distancia;
    }
    return menor;
  }

  public fecharProva(): void {
    if (!this.estado || this.estado.provaEmExibicao === null) return;
    const eventos = fecharProvaEmExibicao(this.estado);
    if (!this.estado.pausado && this.estado.provaEmExibicao === null) {
      this.tweens.resumeAll();
    }
    this.processarEventos(eventos);
    this.atualizarIndicadorBuffer();
  }

  public reiniciar(): void {
    this.tweens.resumeAll();
    // A Prova não interrompe o deslize: a interface mostra um aviso e abre sob demanda.
    this.estado = criarEstadoFase(this.fase, { abrirProvaAoColetar: false });
    this.resetarVisualProtagonista();

    for (const marcador of this.marcadoresProva.values()) {
      marcador.setVisible(true);
    }
    this.spritesHabitante.forEach(({ sprite, linha }, i) => {
      const { col, lin } = this.fase.habitantes[i];
      const tile = CONFIG.tamanhoTilePx;
      this.tweens.killTweensOf(sprite);
      sprite
        .setVisible(true)
        .setAlpha(1)
        .setPosition(col * tile + tile / 2, lin * tile + tile / 2)
        .play(chaveAnimacaoHabitante('medo', linha));
    });
    for (const alma of this.spritesAlma) {
      alma.setVisible(true);
    }
    for (const halo of this.halosAlma) {
      halo.setVisible(true);
    }
    this.atualizarVisualTotemAtivo(null, false);
    this.atualizarVisualSaida(this.estado.saidaAcesa, false);
    this.reiniciarCiclosAmeacasEArmadilhas();

    this.sincronizarProtagonista();
    this.atualizarIndicadorBuffer();
    this.centralizarCameraImediatamente();
    this.callbacks.aoAtualizarDeslizes(0);
    this.callbacks.aoAtualizarMortes(0);
    this.callbacks.aoAtualizarProvas(this.estado.provasColetadas.length, TOTAL_PROVAS_FASE);
    this.callbacks.aoAtualizarHabitantes(0, this.fase.habitantes.length);
    this.callbacks.aoAtualizarAlmas(0, this.fase.almas.length);
  }

  /**
   * Distância em tiles do Protagonista até o Drone Desmatador mais próximo
   * (`null` sem Drone na Fase). A integração do áudio usa este valor para o
   * volume do motor.
   */
  public distanciaDroneMaisProximo(): number | null {
    if (!this.estado) return null;
    return distanciaAteAmeacaMaisProxima(this.estado, 'drone');
  }

  public atualizarTamanhoViewport(larguraLogica: number, alturaLogica: number): void {
    if (!this.cameras?.main) return;
    this.vinheta?.setDisplaySize(larguraLogica, alturaLogica);
    this.cameras.main.setViewport(0, 0, larguraLogica, alturaLogica);
    this.centralizarCameraImediatamente();
  }

  /**
   * Estado atual de cada Ameaça: posição, direção e se está parada numa pausa.
   * A arte final usa a direção para escolher a animação (Guarda em 4 direções,
   * Drone rotacionado) e `pausada` para a pose parada.
   */
  public estadosAmeacas(): EstadoAmeacaNoInstante[] {
    if (!this.estado) return [];
    return posicoesAmeacasAtuais(this.estado);
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.estado || this.estado.pausado || this.estado.provaEmExibicao !== null) return;

    // Limita delta para evitar saltos gigantes ao voltar de aba em segundo plano
    const deltaSegundos = Math.min(deltaMs, 100) / 1000;
    const eventos = atualizarDeslize(this.estado, deltaSegundos);
    this.processarEventos(eventos);

    this.sincronizarProtagonista();
    this.sincronizarAmeacas(deltaSegundos);
    this.sincronizarEspinhos();
    this.sincronizarSolosErodidos();
    this.atualizarIndicadorBuffer();

    if (!this.estado.pausado && this.estado.provaEmExibicao === null) {
      this.atualizarCamera(deltaSegundos);
    }
  }

  private resetarVisualProtagonista(): void {
    this.trancoTween?.stop();
    this.trancoOffset.x = 0;
    this.trancoOffset.y = 0;
    this.lookAheadAtualY = 0;
    this.lookAheadAtualX = 0;
    this.restaurarFormaProtagonista();
    this.encerrarCorridaEspirito();
    this.olharAtual = 'frente';
    this.corpoProtagonista.setFlipX(false);
    this.corpoProtagonista.play(chaveAnimacao('parado', 'frente'));
  }

  private reiniciarCiclosAmeacasEArmadilhas(): void {
    for (const item of this.brilhosTrilhoGosma) {
      item.intensidade = 0;
      item.rect.setAlpha(0.18);
    }

    for (const item of this.spritesEspinho) {
      item.tween?.stop();
      item.sprite.setScale(1);
      item.etapa = '';
      item.quadro = -1;
    }

    for (const item of this.spritesSoloErodido) {
      item.tween?.stop();
      item.sprite.setPosition(item.baseX, item.baseY);
      item.sprite.setScale(1);
      item.etapa = '';
      item.quadro = -1;
    }

    if (this.estado) {
      this.sincronizarAmeacas(0);
      this.sincronizarEspinhos();
      this.sincronizarSolosErodidos();
    }
  }

  private sincronizarEspinhos(): void {
  const tile = CONFIG.tamanhoTilePx;
  this.estado.espinhos.forEach((espinho, i) => {
    const item = this.spritesEspinho[i];
    if (!item) return;
    const piscando =
      espinho.etapa === 'aviso' && Math.floor(espinho.tempoNaEtapa * 12) % 2 === 1;
    const quadro = QUADRO_ESPINHO[espinho.etapa] + (piscando ? 1 : 0);
    if (quadro !== item.quadro) {
      item.quadro = quadro;
      item.sprite.setFrame(quadro);
    }
    if (espinho.etapa === item.etapa) return;
    item.etapa = espinho.etapa;

    const { x, y } = item.sprite;
    if (espinho.etapa === 'ativo') {
      this.emissorEspinho?.explode(6, x, y + tile / 3);
      if (!this.reduzirMovimento) {
        item.tween?.stop();
        item.sprite.setScale(1, 0.4);
        item.tween = this.tweens.add({
          targets: item.sprite,
          scaleY: 1,
          duration: 70,
          ease: 'Back.easeOut',
        });
      }
    } else if (espinho.etapa === 'recolhendo') {
      this.emissorEspinho?.explode(2, x, y + tile / 3);
    } else {
      item.tween?.stop();
      item.sprite.setScale(1);
    }
  });
}

  private sincronizarSolosErodidos(): void {
    const duracao = Math.max(0.01, CONFIG.soloErodido.quebraSegundos);
    this.estado.solosErodidos.forEach((solo, i) => {
      const item = this.spritesSoloErodido[i];
      if (!item) return;

      let quadro: number;
      if (solo.etapa === 'quebrado') {
        quadro = 3;
      } else if (solo.etapa === 'intacto') {
        quadro = 0;
      } else {
        const progresso = Math.min(1, solo.tempoNaEtapa / duracao);
        const frequencia = solo.passadas >= 2 || progresso > 0.6 ? 16 : 8;
        quadro = Math.floor(solo.tempoNaEtapa * frequencia) % 2 === 1 ? 2 : 1;
        if (!this.reduzirMovimento && (progresso > 0.45 || solo.passadas >= 2)) {
          const treme = Math.floor(solo.tempoNaEtapa * 40) % 2 === 0 ? -0.6 : 0.6;
          item.sprite.setPosition(item.baseX + treme, item.baseY);
        } else {
          item.sprite.setPosition(item.baseX, item.baseY);
        }
      }

      if (quadro !== item.quadro) {
        item.quadro = quadro;
        item.sprite.setFrame(quadro);
      }

      if (solo.etapa === item.etapa) return;
      item.etapa = solo.etapa;

      if (solo.etapa === 'rachando') {
        this.emissorSoloErodido?.explode(3, item.baseX, item.baseY);
      } else if (solo.etapa === 'quebrado') {
        item.sprite.setPosition(item.baseX, item.baseY);
        this.emissorSoloErodido?.explode(10, item.baseX, item.baseY);
        if (!this.reduzirMovimento) {
          item.tween?.stop();
          item.sprite.setScale(0.84);
          item.tween = this.tweens.add({
            targets: item.sprite,
            scale: 1,
            duration: 80,
            ease: 'Back.easeOut',
          });
        }
      } else {
        item.tween?.stop();
        item.sprite.setPosition(item.baseX, item.baseY);
        item.sprite.setScale(1);
      }
    });
  }

  private desenharGrade(): void {
    const tile = CONFIG.tamanhoTilePx;
    // Marcas por cima dos tiles (início etc.).
    const g = this.add.graphics().setDepth(1);
    // Floresta nas paredes: árvores, ruínas, troncos, arbustos e pedras sobre a grama.
    // Na beira da trilha só grama escura, arbustos e árvores; o que tem o tom da trilha
    // fica no miolo e escurecido (ver cenarioFloresta.ts).
    for (const { chave, col, lin } of decorarParedes(this.fase.grade)) {
      if (chave === SO_GRAMA) continue;
      const imagem = chave.startsWith('pequeno:')
        ? this.add.image(col * tile, lin * tile, 'cenario-pequeno', Number(chave.slice(8)))
        : this.add.image(col * tile, lin * tile, `cenario-${chave}`);
      imagem.setOrigin(0, 0).setDepth(0.5);
      if (escurecer(chave)) imagem.setTint(TINTA_CONSTRUCAO);
    }

    for (let lin = 0; lin < this.fase.altura; lin++) {
      for (let col = 0; col < this.fase.largura; col++) {
        const tipo = this.fase.grade[lin][col];
        const x = col * tile;
        const y = lin * tile;

        // Grama sob a floresta; trilha de terra com bordas de grama nos corredores.
        if (tipo === 'parede') {
          this.add.image(x, y, 'grama', variacaoGrama(col, lin)).setOrigin(0, 0).setDepth(0);
          continue;
        }
        this.add
          .image(x, y, 'trilha', mascaraTrilha(this.fase.grade, col, lin))
          .setOrigin(0, 0)
          .setDepth(0);

        if (tipo === 'inicio') {
          g.fillStyle(CORES.inicio, 1);
          g.fillRect(x + 3, y + 3, tile - 6, tile - 6);
        } else if (tipo === 'saida') {
          const centroX = x + tile / 2;
          const centroY = y + tile / 2;

          this.haloSaida = this.add
            .rectangle(centroX, centroY, tile + 4, tile + 4, CORES.saidaHalo, 0)
            .setDepth(2)
            .setVisible(false);

          this.baseSaida = this.add
            .rectangle(centroX, centroY, tile - 2, tile - 2, CORES.saidaApagadaBase, 1)
            .setStrokeStyle(1, CORES.paredeBorda, 0.85)
            .setDepth(3);

          this.nucleoSaida = this.add
            .rectangle(centroX, centroY, tile - 8, tile - 8, CORES.saidaApagadaNucleo, 0.75)
            .setDepth(4);
        }
      }
    }
  }

  private atualizarVisualTotemAtivo(
    totemAtivo: Coordenada | null,
    animarAtivacao: boolean,
  ): void {
    this.haloTotemTween?.stop();
    this.haloTotemTween = null;

    for (const marcador of this.marcadoresTotem) {
      const ehAtivo =
        totemAtivo !== null &&
        marcador.coord.col === totemAtivo.col &&
        marcador.coord.lin === totemAtivo.lin;

      marcador.inativo.setVisible(!ehAtivo);
      marcador.ativo.setVisible(ehAtivo);
      marcador.halo.setVisible(ehAtivo).setScale(1).setAlpha(ehAtivo ? 0.35 : 0);

      if (ehAtivo) {
        this.haloTotemTween = this.tweens.add({
          targets: marcador.halo,
          alpha: { from: 0.2, to: 0.55 },
          scaleX: { from: 0.95, to: 1.3 },
          scaleY: { from: 0.95, to: 1.3 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        if (animarAtivacao) {
          const tile = CONFIG.tamanhoTilePx;
          const onda = this.add
            .rectangle(
              marcador.halo.x,
              marcador.halo.y,
              tile,
              tile,
              CORES.totemHalo,
              0.75,
            )
            .setDepth(8);

          this.tweens.add({
            targets: onda,
            scaleX: 2.1,
            scaleY: 2.1,
            alpha: 0,
            duration: 340,
            ease: 'Quad.easeOut',
            onComplete: () => onda.destroy(),
          });
        }
      }
    }
  }

  private atualizarVisualSaida(acesa: boolean, animarAcendimento: boolean): void {
    this.brilhoSaidaTween?.stop();
    this.brilhoSaidaTween = null;
    this.haloSaidaTween?.stop();
    this.haloSaidaTween = null;

    if (!this.baseSaida || !this.nucleoSaida || !this.haloSaida) return;
    this.atualizarLuzSaida(acesa);

    if (!acesa) {
      this.baseSaida.setFillStyle(CORES.saidaApagadaBase, 1);
      this.baseSaida.setStrokeStyle(1, CORES.paredeBorda, 0.85);
      this.nucleoSaida.setFillStyle(CORES.saidaApagadaNucleo, 0.75);
      this.nucleoSaida.setScale(1).setAlpha(0.75);
      this.haloSaida.setVisible(false).setScale(1).setAlpha(0);
      return;
    }

    this.baseSaida.setFillStyle(CORES.saidaBase, 1);
    this.baseSaida.setStrokeStyle(1, CORES.saidaBrilho, 1);
    this.nucleoSaida.setFillStyle(CORES.saidaBrilho, 0.95);
    this.nucleoSaida.setScale(1).setAlpha(0.95);
    this.haloSaida.setVisible(true).setAlpha(0.35).setScale(1.05);

    this.brilhoSaidaTween = this.tweens.add({
      targets: this.nucleoSaida,
      alpha: { from: 0.45, to: 1 },
      scaleX: { from: 0.85, to: 1.3 },
      scaleY: { from: 0.85, to: 1.3 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.haloSaidaTween = this.tweens.add({
      targets: this.haloSaida,
      alpha: { from: 0.2, to: 0.55 },
      scaleX: { from: 0.95, to: 1.35 },
      scaleY: { from: 0.95, to: 1.35 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (animarAcendimento) {
      const tile = CONFIG.tamanhoTilePx;
      const onda = this.add
        .rectangle(this.baseSaida.x, this.baseSaida.y, tile, tile, CORES.saidaBrilho, 0.85)
        .setDepth(8);

      this.tweens.add({
        targets: onda,
        scaleX: 2.4,
        scaleY: 2.4,
        alpha: 0,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => onda.destroy(),
      });
    }
  }

  private desenharElementosPlaceholder(): void {
    const tile = CONFIG.tamanhoTilePx;
    const g = this.add.graphics();
    g.setDepth(5);

    // Trilhos e pausas das Ameaças (camada abaixo dos marcadores)
    this.brilhosTrilhoGosma.length = 0;
    for (const ameaca of this.fase.ameacas) {
      const estilo = ESTILO_AMEACA[ameaca.tipo];
      g.fillStyle(estilo.cor, ameaca.tipo === 'gosma' ? 0.16 : 0.25);
      for (const celula of ameaca.trilho) {
        g.fillRect(celula.col * tile + 4, celula.lin * tile + 4, tile - 8, tile - 8);
        if (ameaca.tipo === 'gosma') {
          const brilho = this.add
            .rectangle(
              celula.col * tile + tile / 2,
              celula.lin * tile + tile / 2,
              tile - 4,
              tile - 4,
              CORES.gosmaTrilho,
              0.18,
            )
            .setDepth(5);
          this.brilhosTrilhoGosma.push({
            celula,
            rect: brilho,
            intensidade: 0,
          });
        }
      }

      g.fillStyle(CORES.pausaMarca, 0.9);
      for (const pausa of ameaca.pausas) {
        g.fillRect(pausa.vertice.col * tile + 6, pausa.vertice.lin * tile + 6, 4, 4);
      }
    }

    this.marcadoresTotem.length = 0;
    for (const totem of this.fase.totens) {
      const centroX = totem.col * tile + tile / 2;
      const centroY = totem.lin * tile + tile / 2;
      const halo = this.add
        .rectangle(centroX, centroY, tile + 2, tile + 2, CORES.totemHalo, 0)
        .setDepth(4)
        .setVisible(false);

      const inativo = this.add.graphics().setDepth(5);
      this.desenharTotem(inativo, totem, false);

      const ativo = this.add.graphics().setDepth(5).setVisible(false);
      this.desenharTotem(ativo, totem, true);

      this.marcadoresTotem.push({ coord: totem, halo, inativo, ativo });
    }

    this.marcadoresProva.clear();
    for (const prova of this.fase.provas) {
      const marcador = this.add.graphics();
      marcador.setDepth(6);
      this.desenharProva(marcador, prova.posicao, String(prova.numero) as '1' | '2' | '3');
      // O papel flutua de leve, como algo que chama o jogador.
      this.tweens.add({
        targets: marcador,
        y: -2,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.marcadoresProva.set(prova.numero, marcador);
    }

    this.criarHabitantes();

    this.gerarTexturaEspinho();
    for (const item of this.spritesEspinho) item.tween?.stop();
    this.spritesEspinho.length = 0;
    for (const espinho of this.fase.espinhos) {
      const sprite = this.add
        .sprite(espinho.col * tile + tile / 2, espinho.lin * tile + tile / 2, 'espinho', 0)
        .setDepth(5);
      this.spritesEspinho.push({ sprite, etapa: '', quadro: 0, tween: null });
    }

    this.gerarTexturaSoloErodido();
    for (const item of this.spritesSoloErodido) item.tween?.stop();
    this.spritesSoloErodido.length = 0;
    for (const solo of this.fase.solosErodidos) {
      const baseX = solo.col * tile + tile / 2;
      const baseY = solo.lin * tile + tile / 2;
      const sprite = this.add.sprite(baseX, baseY, 'solo-erodido', 0).setDepth(5);
      this.spritesSoloErodido.push({
        sprite,
        baseX,
        baseY,
        etapa: '',
        quadro: 0,
        tween: null,
      });
    }

    this.gerarTexturasEfeitos();
    this.criarAnimacoesAmeacas();
    this.spritesAmeaca.clear();
    this.corposDrone.clear();
    this.guardas.clear();
    for (const ameaca of this.fase.ameacas) {
      const centroX = ameaca.posicaoInicial.col * tile + tile / 2;
      const centroY = ameaca.posicaoInicial.lin * tile + tile / 2;

      if (ameaca.tipo === 'gosma') {
        if (!this.anims.exists('gosma-loop')) {
          this.anims.create({
            key: 'gosma-loop',
            frames: this.anims.generateFrameNumbers('gosma', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1,
          });
        }
        const aura = this.add.rectangle(0, 0, tile, tile, CORES.gosmaTrilho, 0.18);
        const corpo = this.add.sprite(0, 0, 'gosma').play('gosma-loop');
        const container = this.add.container(centroX, centroY, [aura, corpo]).setDepth(8);

        this.tweens.add({
          targets: container,
          scaleX: { from: 0.94, to: 1.08 },
          scaleY: { from: 1.06, to: 0.92 },
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.spritesAmeaca.set(ameaca.id, container);
      } else if (ameaca.tipo === 'drone') {
        this.spritesAmeaca.set(ameaca.id, this.criarDrone(ameaca.id, centroX, centroY));
      } else {
        this.spritesAmeaca.set(ameaca.id, this.criarGuarda(ameaca.id, centroX, centroY));
      }
    }
  }

  /** Animações do Drone (hélices) e do Guarda (andar e parado nas 3 vistas). */
  private criarAnimacoesAmeacas(): void {
    if (!this.anims.exists('drone-helice')) {
      this.anims.create({
        key: 'drone-helice',
        frames: this.anims.generateFrameNumbers(SPRITES_DRONE.chave, {
          start: 0,
          end: SPRITES_DRONE.quadrosHelice - 1,
        }),
        frameRate: 20,
        repeat: -1,
      });
    }
    const { chave, colunas } = SPRITES_GUARDA;
    for (const olhar of ['frente', 'costas', 'lado'] as const) {
      const q = (coluna: number) => LINHA_GUARDA[olhar] * colunas + coluna;
      if (!this.anims.exists(chaveAnimacaoGuarda('andar', olhar))) {
        this.anims.create({
          key: chaveAnimacaoGuarda('andar', olhar),
          frames: COLUNAS_GUARDA.andar.map((coluna) => ({ key: chave, frame: q(coluna) })),
          frameRate: 8,
          repeat: -1,
        });
      }
      if (!this.anims.exists(chaveAnimacaoGuarda('parado', olhar))) {
        const [base, olhando] = COLUNAS_GUARDA.parado;
        this.anims.create({
          key: chaveAnimacaoGuarda('parado', olhar),
          frames: [
            { key: chave, frame: q(base), duration: 700 },
            { key: chave, frame: q(olhando), duration: 500 },
          ],
          repeat: -1,
        });
      }
    }
  }

  /**
   * Drone Desmatador: voa (sombra no chão, corpo 3 px acima e balançando), hélices
   * girando e uma luz vermelha piscando em volta. O corpo gira para a direção do trilho.
   */
  private criarDrone(id: string, x: number, y: number): Phaser.GameObjects.Container {
    const tile = CONFIG.tamanhoTilePx;
    const sombra = this.add.ellipse(1, 4, 14, 7, COR_NOITE, 0.4);
    const luz = this.add
      .image(0, -3, 'fx-brilho')
      .setDisplaySize(tile * 1.6, tile * 1.6)
      .setTint(COR_VERMELHO_MAQUINA)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.2);
    const corpo = this.add.sprite(0, -3, SPRITES_DRONE.chave, 0).play('drone-helice');
    this.corposDrone.set(id, corpo);

    this.tweens.add({
      targets: luz,
      alpha: { from: 0.12, to: 0.45 },
      duration: 260,
      yoyo: true,
      repeat: -1,
      repeatDelay: 380,
    });
    if (!this.reduzirMovimento) {
      this.tweens.add({
        targets: corpo,
        y: -4,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    return this.add.container(x, y, [sombra, luz, corpo]).setDepth(8);
  }

  /** Guarda Florestal: sprite em 3/4 que anda nas 4 direções e o cone da lanterna. */
  private criarGuarda(id: string, x: number, y: number): Phaser.GameObjects.Container {
    const tile = CONFIG.tamanhoTilePx;
    const sombra = this.add.ellipse(0, 7, 12, 4, COR_NOITE, 0.35);
    const cone = this.add
      .image(0, 0, 'fx-cone')
      .setOrigin(0, 0.5)
      .setDisplaySize(tile * 3, tile * 1.6)
      .setTint(COR_AMARELO_SINAL)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.34);
    const corpo = this.add
      .sprite(0, 0, SPRITES_GUARDA.chave, 0)
      .setOrigin(0.5, SPRITES_GUARDA.origemY)
      .play(chaveAnimacaoGuarda('andar', 'lado'));
    this.guardas.set(id, { corpo, cone });
    return this.add.container(x, y, [sombra, cone, corpo]).setDepth(8);
  }

  private criarProtagonista(): void {
    const tile = CONFIG.tamanhoTilePx;
    this.criarAnimacoesProtagonista();
    this.gerarTexturasEfeitos();

    this.corpoProtagonista = this.add
      .sprite(0, 0, SPRITES_PROTAGONISTA.chave, 0)
      .setOrigin(0.5, SPRITES_PROTAGONISTA.origemY);
    this.corpoProtagonista.play(chaveAnimacao('parado', 'frente'));

    // Aura do espírito da mata: luz verde suave atrás do corpo, pulsando devagar.
    const { aura } = CONFIG.feel.protagonista;
    this.auraEspirito = this.add
      .image(0, -2, 'fx-brilho')
      .setDisplaySize(tile * 1.7, tile * 1.7)
      .setTint(COR_ESPIRITO)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(aura.alfa.min);
    this.escalaBaseAura = this.auraEspirito.scaleX;
    this.tweens.add({
      targets: this.auraEspirito,
      alpha: { from: aura.alfa.min, to: aura.alfa.max },
      duration: aura.pulsoMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.marcadorBuffer = this.add.rectangle(0, 0, 3, 3, CORES.bufferIndicador);
    this.marcadorBuffer.setVisible(false);

    this.protagonista = this.add.container(0, 0, [
      this.auraEspirito,
      this.corpoProtagonista,
      this.marcadorBuffer,
    ]);
    this.protagonista.setDepth(10);
  }

  /** Animações da spritesheet do Protagonista (criadas uma vez por jogo). */
  private criarAnimacoesProtagonista(): void {
    const { chave } = SPRITES_PROTAGONISTA;
    const criar = (config: Phaser.Types.Animations.Animation) => {
      if (!this.anims.exists(config.key as string)) this.anims.create(config);
    };
    const olhares: Olhar[] = ['frente', 'costas', 'lado'];
    for (const olhar of olhares) {
      const linha = LINHA_OLHAR[olhar];
      const q = (coluna: number) => indiceQuadro(linha, coluna);
      const [base, respiro, balanco, extra] = COLUNAS_ACAO.parado;
      criar({
        key: chaveAnimacao('parado', olhar),
        frames: [
          { key: chave, frame: q(base), duration: 420 },
          { key: chave, frame: q(respiro), duration: 380 },
          { key: chave, frame: q(balanco), duration: 300 },
          { key: chave, frame: q(respiro), duration: 300 },
          { key: chave, frame: q(base), duration: 520 },
          // piscar (frente e lado) ou o broto balançando (costas): rápido
          { key: chave, frame: q(extra), duration: 130 },
        ],
        repeat: -1,
      });
      criar({
        key: chaveAnimacao('deslize', olhar),
        frames: COLUNAS_ACAO.deslize.map((coluna) => ({ key: chave, frame: q(coluna) })),
        frameRate: 14,
        repeat: -1,
      });
      criar({
        key: chaveAnimacao('batida', olhar),
        frames: COLUNAS_ACAO.batida.map((coluna) => ({ key: chave, frame: q(coluna) })),
        frameRate: 1,
        repeat: 0,
      });
    }
    const quadrosMorte = Array.from({ length: QUADROS_MORTE }, (_, i) => ({
      key: chave,
      frame: indiceQuadro(LINHA_MORTE, i),
    }));
    criar({ key: chaveAnimacao('morte'), frames: quadrosMorte, frameRate: 14, repeat: 0 });
    // Reaparecer: as folhas e a luz se juntam de volta (a morte ao contrário, sem o vazio).
    criar({
      key: chaveAnimacao('reaparecer'),
      frames: quadrosMorte.slice(1, -1).reverse(),
      frameRate: 16,
      repeat: 0,
    });
  }

  /** Vira o corpo para a direção (frente, costas ou lado, espelhando à esquerda). */
  private virarPara(direcao: Direcao): void {
    const { olhar, espelhar } = olharDaDirecao(direcao);
    this.olharAtual = olhar;
    this.corpoProtagonista.setFlipX(espelhar);
  }

  private tocarParado(): void {
    this.corpoProtagonista.play(chaveAnimacao('parado', this.olharAtual), true);
  }

  private processarEventos(eventos: readonly EventoDeslize[]): void {
    if (eventos.length > 0) this.callbacks.aoEventos?.(eventos);
    for (const evento of eventos) {
      switch (evento.tipo) {
        case 'iniciou_deslize':
          this.callbacks.aoAtualizarDeslizes(this.estado.deslizes);
          this.iniciarDeslizeVisual(evento.direcao);
          break;
        case 'tranco':
          this.virarPara(evento.direcao);
          this.executarAnimacaoTranco(evento.direcao);
          this.impactoNaParede(evento.direcao, 0);
          break;
        case 'parou_na_parede':
          this.impactoNaParede(evento.direcao, this.distanciaDeslizeAtual);
          this.distanciaDeslizeAtual = 0;
          break;
        case 'totem_ativado':
          this.efeitoAtivacaoTotem(evento.celula);
          this.atualizarVisualTotemAtivo(evento.celula, true);
          break;
        case 'habitante_resgatado':
          this.animarResgateHabitante(evento.indice);
          this.callbacks.aoResgatarHabitante(evento.indice);
          this.callbacks.aoAtualizarHabitantes(evento.resgatados, evento.total);
          break;
        case 'prova_coletada':
          this.marcadoresProva.get(evento.prova.numero)?.setVisible(false);
          this.callbacks.aoColetarProva(evento.prova);
          this.callbacks.aoAtualizarProvas(evento.totalColetadas, evento.totalProvas);
          break;
        case 'saida_acesa':
          this.atualizarVisualSaida(true, true);
          break;
        case 'morreu':
          this.efeitoMorte(evento.origem);
          this.resetarVisualProtagonista();
          this.animarReaparecer();
          this.sincronizarProtagonista();
          this.atualizarIndicadorBuffer();
          this.centralizarCameraImediatamente();
          this.cameras.main.flash(180, 220, 60, 60);
          this.callbacks.aoAtualizarMortes(evento.mortes);
          break;
        case 'retornou_ao_totem':
          this.resetarVisualProtagonista();
          this.animarReaparecer();
          this.sincronizarProtagonista();
          this.atualizarIndicadorBuffer();
          this.centralizarCameraImediatamente();
          this.cameras.main.flash(140, 56, 189, 248);
          break;
        case 'ciclos_reiniciados':
          this.reiniciarCiclosAmeacasEArmadilhas();
          break;
        case 'abrir_prova':
          this.restaurarFormaProtagonista();
          this.sincronizarProtagonista();
          this.atualizarIndicadorBuffer();
          this.tweens.pauseAll();
          this.callbacks.aoAbrirProva(evento.prova);
          break;
        case 'alma_coletada':
          this.coletarAlmaVisual(evento.indice);
          this.callbacks.aoAtualizarAlmas(evento.coletadas, evento.total);
          break;
        case 'fase_concluida':
          this.restaurarFormaProtagonista();
          this.callbacks.aoConcluir({
            deslizes: this.estado.deslizes,
            mortes: this.estado.mortes,
            tempoSegundos: this.estado.tempoJogadoSegundos,
            habitantesResgatados: contarHabitantesResgatados(this.estado),
            habitantesTotal: this.fase.habitantes.length,
            almasColetadas: contarAlmasColetadas(this.estado),
            almasTotal: this.fase.almas.length,
          });
          break;
      }
    }
  }

  /** Sprites dos Habitantes, tremendo de medo no lugar de cada `H`. */
  private criarHabitantes(): void {
    const tile = CONFIG.tamanhoTilePx;
    const { chave, colunas } = SPRITES_HABITANTES;
    for (const item of this.spritesHabitante) item.sprite.destroy();
    this.spritesHabitante.length = 0;

    this.fase.habitantes.forEach((celula, i) => {
      const linha = linhaDoHabitante(this.opcoes.aparenciasHabitantes?.[i], i + 1);
      const quadro = (coluna: number) => ({ key: chave, frame: linha * colunas + coluna });
      if (!this.anims.exists(chaveAnimacaoHabitante('medo', linha))) {
        // Treme (base, um lado, base, outro lado) com os olhos procurando; uma pausa
        // curta na base deixa o tremor irregular, de medo de verdade.
        const [base, direita, olhando, esquerda] = COLUNAS_HABITANTE.medo;
        this.anims.create({
          key: chaveAnimacaoHabitante('medo', linha),
          frames: [
            { ...quadro(base), duration: 90 },
            { ...quadro(direita), duration: 70 },
            { ...quadro(base), duration: 90 },
            { ...quadro(esquerda), duration: 70 },
            { ...quadro(olhando), duration: 420 },
            { ...quadro(direita), duration: 70 },
            { ...quadro(olhando), duration: 90 },
            { ...quadro(esquerda), duration: 70 },
            { ...quadro(base), duration: 480 },
          ],
          repeat: -1,
        });
      }
      if (!this.anims.exists(chaveAnimacaoHabitante('alivio', linha))) {
        this.anims.create({
          key: chaveAnimacaoHabitante('alivio', linha),
          frames: COLUNAS_HABITANTE.alivio.map((coluna) => quadro(coluna)),
          frameRate: 8,
          repeat: -1,
        });
      }
      const sprite = this.add
        .sprite(celula.col * tile + tile / 2, celula.lin * tile + tile / 2, chave, linha * colunas)
        .setOrigin(0.5, SPRITES_HABITANTES.origemY)
        .setDepth(6)
        .play(chaveAnimacaoHabitante('medo', linha));
      // Cada um começa o tremor num ponto diferente, para não tremerem em coro.
      sprite.anims.setProgress((i * 0.37) % 1);
      this.spritesHabitante.push({ sprite, linha });
    });
  }

  /**
   * Resgate: o Habitante pula de alívio, a luz do espírito da mata sobe em volta e ele
   * some subindo (vai para o ponto de encontro).
   */
  private animarResgateHabitante(indice: number): void {
    const item = this.spritesHabitante[indice];
    if (!item) return;
    const { sprite, linha } = item;
    sprite.play(chaveAnimacaoHabitante('alivio', linha));
    this.emissorTotem?.explode(10, sprite.x, sprite.y - 4);
    this.anelDeLuz(sprite.x, sprite.y, 0.6);
    this.tweens.add({
      targets: sprite,
      y: sprite.y - CONFIG.tamanhoTilePx,
      alpha: 0,
      delay: 520,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => sprite.setVisible(false),
    });
  }

  /** Começo do deslize: vira, entra na pose de voo e, se for longe, vira corrida do espírito. */
  private iniciarDeslizeVisual(direcao: Direcao): void {
    this.restaurarFormaProtagonista();
    this.virarPara(direcao);
    this.corpoProtagonista.play(chaveAnimacao('deslize', this.olharAtual));
    this.distanciaDeslizeAtual = distanciaDoDeslize(this.estado.posicao, this.estado.destinoDeslize);

    // Arrancada: um sopro de poeira para trás.
    const { x, y } = this.protagonista;
    const { dc, dl } = VETOR_DIRECAO[direcao];
    const tras = ANGULO_PARA_LONGE_DA_PAREDE[direcao];
    this.emissorPoeira?.setEmitterAngle({ min: tras.min + 180, max: tras.max + 180 });
    this.emissorPoeira?.explode(3, x - dc * 5, y - dl * 5 + 4);

    const { distanciaEspiritoTiles, aura } = CONFIG.feel.protagonista;
    if (this.distanciaDeslizeAtual >= distanciaEspiritoTiles && this.auraEspirito) {
      this.auraCorridaTween?.stop();
      this.auraCorridaTween = this.tweens.add({
        targets: this.auraEspirito,
        scale: this.escalaBaseAura * aura.escalaCorrida,
        duration: 120,
        ease: 'Quad.easeOut',
      });
      this.emissorFolhasRastro?.start();
    }
  }

  /** A aura volta ao tamanho normal e as folhas do rastro param. */
  private encerrarCorridaEspirito(): void {
    this.emissorFolhasRastro?.stop();
    const aura = this.auraEspirito;
    if (!aura) return;
    this.auraCorridaTween?.stop();
    this.auraCorridaTween = this.tweens.add({
      targets: aura,
      scale: this.escalaBaseAura,
      duration: 260,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * Batida na parede: quadro de batida (que fica mais tempo quanto mais forte), achatamento,
   * poeira da trilha, folhas caindo da mata, anel de luz e, nos deslizes longos, tremor de
   * tela e brotos que nascem no chão.
   */
  private impactoNaParede(direcao: Direcao, distanciaTiles: number): void {
    const tile = CONFIG.tamanhoTilePx;
    const forca = intensidadeDoImpacto(distanciaTiles);
    const { impacto } = CONFIG.feel.protagonista;
    const lerp = (faixa: { min: number; max: number }) => faixa.min + (faixa.max - faixa.min) * forca;
    this.encerrarCorridaEspirito();

    // Quadro de batida segurado por um instante, depois volta a respirar.
    const corpo = this.corpoProtagonista;
    corpo.play({ key: chaveAnimacao('batida', this.olharAtual), duration: lerp(impacto.pausaMs) });
    corpo.chain(chaveAnimacao('parado', this.olharAtual));

    // Achatamento extra contra a parede, mantendo o lado da parede no lugar.
    const { contra, largura, duracaoMs } = CONFIG.feel.achatamentoBatida;
    const horizontal = direcao === 'esquerda' || direcao === 'direita';
    const { dc, dl } = VETOR_DIRECAO[direcao];
    this.restaurarFormaProtagonista();
    const fator = 0.4 + 0.6 * forca;
    const escalaContra = 1 - (1 - contra) * fator;
    const escalaLargura = 1 + (largura - 1) * fator;
    corpo.setScale(horizontal ? escalaContra : escalaLargura, horizontal ? escalaLargura : escalaContra);
    // O achatamento é em volta da origem; desloca o corpo para o lado da parede continuar
    // encostado. O quadro de batida de costas também sobe 2 px (a cabeça fica na parede).
    const encolhe = 1 - escalaContra;
    corpo.x = Math.round(dc * encolhe * 6);
    corpo.y = dl > 0 ? Math.round(encolhe * 8) : dl < 0 ? -2 - Math.round(encolhe * 12) : 0;
    this.achatamentoTween = this.tweens.add({
      targets: corpo,
      scaleX: 1,
      scaleY: 1,
      x: 0,
      y: 0,
      delay: lerp(impacto.pausaMs) * 0.5,
      duration: duracaoMs,
      ease: 'Back.easeOut',
    });

    // Ponto de contato: a borda do tile, do lado da parede.
    const cx = this.protagonista.x + dc * (tile / 2);
    const cy = this.protagonista.y + dl * (tile / 2) + (horizontal ? 3 : 0);

    const angulo = ANGULO_PARA_LONGE_DA_PAREDE[direcao];
    this.emissorPoeira?.setEmitterAngle(angulo);
    this.emissorPoeira?.explode(Math.round(lerp(impacto.poeira)), cx, cy);
    this.emissorFolhasParede?.explode(Math.round(lerp(impacto.folhas)), cx + dc * 2, cy + dl * 2);
    this.anelDeLuz(cx, cy, forca);

    if (this.reduzirMovimento) return;
    if (forca >= impacto.tremorAPartir) {
      this.cameras.main.shake(lerp(impacto.tremorMs), lerp(impacto.tremorIntensidade));
    }
    if (forca >= impacto.brotosAPartir) this.brotarNoChao(direcao, forca);
  }

  /** Anel de luz do espírito que se abre no ponto da batida. */
  private anelDeLuz(x: number, y: number, forca: number): void {
    const anel = this.add
      .circle(x, y, 3)
      .setStrokeStyle(1, COR_ESPIRITO, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(10.5);
    this.tweens.add({
      targets: anel,
      scale: 2 + forca * 2.5,
      alpha: 0,
      duration: 260 + forca * 140,
      ease: 'Quad.easeOut',
      onComplete: () => anel.destroy(),
    });
  }

  /**
   * Brotos que nascem no chão junto à parede depois de uma batida forte: por onde o
   * espírito da mata passa, a floresta volta. Somem sozinhos depois de um tempo.
   */
  private brotarNoChao(direcao: Direcao, forca: number): void {
    if (!this.textures.exists('fx-broto')) return;
    const tile = CONFIG.tamanhoTilePx;
    const { dc, dl } = VETOR_DIRECAO[direcao];
    const quantidade = forca >= 0.9 ? 3 : 2;
    for (let i = 0; i < quantidade; i++) {
      // espalhados ao longo da parede, na beira do tile do Protagonista
      const lateral = (i - (quantidade - 1) / 2) * 5 + Phaser.Math.Between(-1, 1);
      const x = Math.round(this.protagonista.x + dc * (tile / 2 - 2) + (dc === 0 ? lateral : 0));
      const y = Math.round(this.protagonista.y + dl * (tile / 2 - 2) + (dl === 0 ? lateral : 0) + 6);
      const broto = this.add
        .image(x, y, 'fx-broto', i % 2)
        .setOrigin(0.5, 1)
        .setDepth(1.5)
        .setScale(1, 0);
      this.tweens.chain({
        targets: broto,
        tweens: [
          { scaleY: 1, duration: 180, delay: 60 + i * 70, ease: 'Back.easeOut' },
          { alpha: 0, duration: 600, delay: 1400 },
        ],
        onComplete: () => broto.destroy(),
      });
    }
  }

  /** Ao morrer ou voltar ao Totem, o corpo se refaz de folhas e luz. */
  private animarReaparecer(): void {
    this.corpoProtagonista.play(chaveAnimacao('reaparecer'));
    this.corpoProtagonista.chain(chaveAnimacao('parado', this.olharAtual));
  }

  /** Eco do corpo na corrida do espírito: uma cópia verde que some atrás. */
  private soltarEco(): void {
    const { eco } = CONFIG.feel.protagonista;
    let imagem = this.ecos.find((e) => !e.visible);
    if (!imagem) {
      if (this.ecos.length >= 10) return;
      imagem = this.add
        .image(0, 0, SPRITES_PROTAGONISTA.chave, 0)
        .setOrigin(0.5, SPRITES_PROTAGONISTA.origemY)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTintFill(COR_ESPIRITO)
        .setDepth(9.6)
        .setVisible(false);
      this.ecos.push(imagem);
    }
    const corpo = this.corpoProtagonista;
    imagem
      .setFrame(corpo.frame.name)
      .setFlipX(corpo.flipX)
      .setPosition(this.protagonista.x, this.protagonista.y)
      .setAlpha(eco.alfa)
      .setVisible(true);
    const alvo = imagem;
    this.tweens.add({
      targets: alvo,
      alpha: 0,
      duration: eco.vidaMs,
      ease: 'Quad.easeIn',
      onComplete: () => alvo.setVisible(false),
    });
  }

  private restaurarFormaProtagonista(): void {
    this.achatamentoTween?.stop();
    this.achatamentoTween = null;
    this.corpoProtagonista.setScale(1);
    this.corpoProtagonista.setPosition(0, 0);
  }

  private executarAnimacaoTranco(direcao: Direcao): void {
    const { dc, dl } = VETOR_DIRECAO[direcao];
    this.trancoTween?.stop();
    this.trancoOffset.x = 0;
    this.trancoOffset.y = 0;

    this.trancoTween = this.tweens.add({
      targets: this.trancoOffset,
      x: dc * 3,
      y: dl * 3,
      duration: CONFIG.duracaoTrancoMs / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.trancoOffset.x = 0;
        this.trancoOffset.y = 0;
      },
    });
  }

  private sincronizarProtagonista(): void {
    const tile = CONFIG.tamanhoTilePx;
    const px = this.estado.posicao.x * tile + tile / 2 + this.trancoOffset.x;
    const py = this.estado.posicao.y * tile + tile / 2 + this.trancoOffset.y;
    this.protagonista.setPosition(Math.round(px), Math.round(py));

    // Rastro só enquanto desliza.
    const rastro = this.emissorRastro;
    if (rastro && rastro.emitting !== this.estado.deslizando) {
      if (this.estado.deslizando) rastro.start();
      else rastro.stop();
    }

    if (this.estado.deslizando) {
      // Corrida do espírito: ecos verdes ficam para trás.
      const { distanciaEspiritoTiles, eco } = CONFIG.feel.protagonista;
      const agora = this.time.now;
      if (
        !this.reduzirMovimento &&
        this.distanciaDeslizeAtual >= distanciaEspiritoTiles &&
        agora >= this.proximoEcoMs
      ) {
        this.soltarEco();
        this.proximoEcoMs = agora + eco.intervaloMs;
      }
    } else if (this.corpoProtagonista.anims.currentAnim?.key.startsWith('protagonista-deslize')) {
      // Parou sem bater (ex.: voltou ao Totem no meio do caminho): só volta a respirar.
      this.encerrarCorridaEspirito();
      this.tocarParado();
    }
  }

  private sincronizarAmeacas(deltaSegundos: number): void {
    const tile = CONFIG.tamanhoTilePx;
    const estadosAmeacas = posicoesAmeacasAtuais(this.estado);
    const posicoesGosma: Array<{ x: number; y: number }> = [];

    for (const ameaca of estadosAmeacas) {
      const sprite = this.spritesAmeaca.get(ameaca.id);
      if (sprite) {
        const ax = ameaca.posicao.x * tile + tile / 2;
        const ay = ameaca.posicao.y * tile + tile / 2;
        sprite.setPosition(Math.round(ax), Math.round(ay));
      }
      const drone = this.corposDrone.get(ameaca.id);
      if (drone) drone.setAngle(ANGULO_DRONE[ameaca.direcao]);

      const guarda = this.guardas.get(ameaca.id);
      if (guarda) {
        const { olhar, espelhar } = olharDaDirecao(ameaca.direcao);
        guarda.corpo.setFlipX(espelhar);
        guarda.corpo.play(chaveAnimacaoGuarda(ameaca.pausada ? 'parado' : 'andar', olhar), true);
        // O cone sai da lanterna, na mão, e aponta para onde ele olha. Na pausa da ponta,
        // varre devagar de um lado para o outro (é a deixa para o jogador passar).
        const { dc, dl } = VETOR_DIRECAO[ameaca.direcao];
        const varredura = ameaca.pausada ? Math.sin(this.time.now / 420) * 28 : 0;
        guarda.cone
          .setPosition(dc * 5, 3 + dl * 2)
          .setAngle(ANGULO_LANTERNA[ameaca.direcao] + varredura);
      }
      if (ameaca.tipo === 'gosma') {
        posicoesGosma.push(ameaca.posicao);
      }
    }

    if (this.brilhosTrilhoGosma.length === 0) return;

    const decaimento = deltaSegundos * 0.9;
    for (const item of this.brilhosTrilhoGosma) {
      item.intensidade = Math.max(0, item.intensidade - decaimento);
      for (const pos of posicoesGosma) {
        if (Math.hypot(pos.x - item.celula.col, pos.y - item.celula.lin) <= 0.75) {
          item.intensidade = 1;
          break;
        }
      }
      item.rect.setAlpha(0.18 + item.intensidade * 0.54);
    }
  }

  private atualizarIndicadorBuffer(): void {
    const dir = this.estado.comandoEmBuffer;
    if (!dir) {
      this.marcadorBuffer.setVisible(false);
      return;
    }
    const { dc, dl } = VETOR_DIRECAO[dir];
    this.marcadorBuffer.setPosition(dc * 6, dl * 6);
    this.marcadorBuffer.setVisible(true);
  }

  /** Limites de rolagem: a câmera nunca mostra fora da Fase. */
  private limitesCamera(): { maxX: number; maxY: number } {
    const cam = this.cameras.main;
    const tile = CONFIG.tamanhoTilePx;
    return {
      maxX: Math.max(0, this.fase.largura * tile - cam.width),
      maxY: Math.max(0, this.fase.altura * tile - cam.height),
    };
  }

  private centralizarCameraImediatamente(): void {
    const cam = this.cameras.main;
    const tile = CONFIG.tamanhoTilePx;
    const { maxX, maxY } = this.limitesCamera();
    const centroX = this.estado.posicao.x * tile + tile / 2;
    const centroY = this.estado.posicao.y * tile + tile / 2;
    cam.scrollX = Phaser.Math.Clamp(Math.round(centroX - cam.width / 2), 0, maxX);
    cam.scrollY = Phaser.Math.Clamp(Math.round(centroY - cam.height / 2), 0, maxY);
  }

  /**
   * Câmera próxima (ADR 0006): segue o Protagonista nos dois eixos, antecipando
   * a direção do deslize para mostrar mais do caminho à frente.
   */
  private atualizarCamera(deltaSegundos: number): void {
    const cam = this.cameras.main;
    const tile = CONFIG.tamanhoTilePx;
    const dir = this.estado.direcaoAtual;

    const alcanceY = CONFIG.lookAheadVerticalTiles * tile;
    const alcanceX = CONFIG.camera.lookAheadHorizontalTiles * tile;
    const alvoY = dir === 'cima' ? -alcanceY : dir === 'baixo' ? alcanceY : 0;
    const alvoX = dir === 'esquerda' ? -alcanceX : dir === 'direita' ? alcanceX : 0;

    const { suavidadeLookAhead, suavidadeRolagem } = CONFIG.feel.camera;
    const fator = Math.min(1, deltaSegundos * suavidadeLookAhead);
    this.lookAheadAtualY = Phaser.Math.Linear(this.lookAheadAtualY, alvoY, fator);
    this.lookAheadAtualX = Phaser.Math.Linear(this.lookAheadAtualX, alvoX, fator);

    const { maxX, maxY } = this.limitesCamera();
    const centroX = this.estado.posicao.x * tile + tile / 2 + this.lookAheadAtualX;
    const centroY = this.estado.posicao.y * tile + tile / 2 + this.lookAheadAtualY;
    const alvoScrollX = Phaser.Math.Clamp(centroX - cam.width / 2, 0, maxX);
    const alvoScrollY = Phaser.Math.Clamp(centroY - cam.height / 2, 0, maxY);
    const suavidade = Math.min(1, deltaSegundos * suavidadeRolagem);

    cam.scrollX = Math.round(Phaser.Math.Linear(cam.scrollX, alvoScrollX, suavidade));
    cam.scrollY = Math.round(Phaser.Math.Linear(cam.scrollY, alvoScrollY, suavidade));
  }

  // ------------------------------------------------------------------
  // Efeitos por código (#20): texturas geradas, partículas e luz da Saída.

  private criarEfeitos(): void {
    const tile = CONFIG.tamanhoTilePx;
    const feel = CONFIG.feel;
    this.reduzirMovimento =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    this.gerarTexturasEfeitos();

    this.emissorRastro = this.add
      .particles(0, 0, 'fx-ponto', {
        lifespan: feel.rastro.vidaMs,
        frequency: feel.rastro.intervaloMs,
        quantity: 1,
        speed: 0,
        scale: { start: 2.5, end: 0.5 },
        alpha: { start: feel.rastro.alfaInicial, end: 0 },
        tint: feel.rastro.cor,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(9);
    this.emissorRastro.startFollow(this.protagonista);

    // Folhas soltas no rastro da corrida do espírito.
    this.emissorFolhasRastro = this.add
      .particles(0, 0, 'fx-folha', {
        lifespan: 520,
        frequency: 60,
        speed: { min: 4, max: 16 },
        angle: { min: 0, max: 360 },
        rotate: { min: 0, max: 360 },
        alpha: { start: 0.9, end: 0 },
        tint: [COR_ESPIRITO, COR_VERDE_CLARO, COR_BROTO],
        emitting: false,
      })
      .setDepth(9);
    this.emissorFolhasRastro.startFollow(this.protagonista);

    // Esporos do espírito da mata: pontinhos de luz que sobem devagar em volta dele.
    this.emissorEsporos = this.add
      .particles(0, 0, 'fx-ponto', {
        lifespan: { min: 900, max: 1500 },
        frequency: 340,
        speedY: { min: -14, max: -6 },
        speedX: { min: -4, max: 4 },
        emitZone: new Phaser.GameObjects.Particles.Zones.RandomZone({
          getRandomPoint: (ponto) => {
            ponto.x = (Math.random() - 0.5) * tile;
            ponto.y = (Math.random() - 0.5) * tile * 0.8;
          },
        }),
        scale: 0.5,
        alpha: { values: [0, 0.95, 0] },
        tint: [COR_ESPIRITO, COR_VERDE_CLARO],
        blendMode: Phaser.BlendModes.ADD,
        emitting: !this.reduzirMovimento,
      })
      .setDepth(10.2);
    this.emissorEsporos.startFollow(this.protagonista);

    // Batida na parede: poeira da trilha e folhas que caem da mata.
    this.emissorPoeira = this.add
      .particles(0, 0, 'fx-ponto', {
        lifespan: { min: 220, max: 420 },
        speed: { min: 18, max: 60 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0.4 },
        alpha: { start: 0.9, end: 0 },
        tint: COR_POEIRA,
        emitting: false,
      })
      .setDepth(10.4);
    this.emissorFolhasParede = this.add
      .particles(0, 0, 'fx-folha', {
        lifespan: { min: 600, max: 900 },
        speed: { min: 8, max: 30 },
        angle: { min: 0, max: 360 },
        gravityY: 55,
        rotate: { min: 0, max: 360 },
        alpha: { start: 1, end: 0 },
        tint: [CORES.folhaClara, CORES.folhaEscura, COR_BROTO],
        emitting: false,
      })
      .setDepth(10.4);

    this.emissorFolhas = this.add
      .particles(0, 0, 'fx-folha', {
        lifespan: feel.morte.vidaFolhasMs,
        speed: { min: 30, max: 120 },
        angle: { min: 0, max: 360 },
        gravityY: 150,
        rotate: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0.8 },
        alpha: { start: 1, end: 0 },
        tint: [CORES.folhaClara, CORES.folhaEscura, CORES.folhaSeca],
        emitting: false,
      })
      .setDepth(11);

    this.emissorTotem = this.add
      .particles(0, 0, 'fx-ponto', {
        lifespan: feel.totem.vidaParticulasMs,
        speed: { min: 25, max: 80 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.8, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: CORES.totemHalo,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(9);

    const saidaX = this.fase.saida.col * tile + tile / 2;
    const saidaY = this.fase.saida.lin * tile + tile / 2;
    const diametroBrilho = feel.saida.raioBrilhoTiles * 2 * tile;
    this.brilhoSaida = this.add
      .image(saidaX, saidaY, 'fx-brilho')
      .setDisplaySize(diametroBrilho, diametroBrilho)
      .setTint(CORES.saidaHalo)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2)
      .setVisible(false);

    const velocidadeSubida = 30; // px/s em média
    this.emissorSaida = this.add
      .particles(saidaX, saidaY, 'fx-ponto', {
        lifespan: ((feel.saida.alturaParticulasTiles * tile) / velocidadeSubida) * 1000,
        frequency: 1000 / feel.saida.particulasPorSegundo,
        speedY: { min: -velocidadeSubida * 1.3, max: -velocidadeSubida * 0.7 },
        speedX: { min: -6, max: 6 },
        // Nascem espalhadas sobre o tile da Saída.
        emitZone: new Phaser.GameObjects.Particles.Zones.RandomZone({
          getRandomPoint: (ponto) => {
            ponto.x = (Math.random() - 0.5) * tile;
            ponto.y = (Math.random() - 0.5) * tile;
          },
        }),
        scale: { start: 1.6, end: 0.4 },
        alpha: { start: 0.95, end: 0 },
        tint: CORES.saidaBrilho,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(9);

    this.emissorEspinho = this.add
      .particles(0, 0, 'fx-ponto', {
        lifespan: 320,
        speed: { min: 20, max: 60 },
        angle: { min: 200, max: 340 },
        gravityY: 120,
        scale: { start: 1.6, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xa0703f, 0x6b4a32, CORES.espinhosAviso],
        emitting: false,
      })
      .setDepth(9);

    this.emissorSoloErodido = this.add
      .particles(0, 0, 'fx-ponto', {
        lifespan: 420,
        speed: { min: 15, max: 52 },
        angle: { min: 0, max: 360 },
        gravityY: 160,
        scale: { start: 1.8, end: 0.4 },
        alpha: { start: 1, end: 0 },
        tint: [CORES.soloBuracoBeira, CORES.soloBorda, CORES.soloBuracoFundo],
        emitting: false,
      })
      .setDepth(9);
  }

  private gerarTexturasEfeitos(): void {
    if (!this.textures.exists('fx-ponto')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture('fx-ponto', 2, 2);
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 3, 2);
      g.fillRect(1, 2, 1, 1);
      g.generateTexture('fx-folha', 3, 3);
      g.destroy();
    }

    // Cone de luz da lanterna do Guarda: ponta à esquerda, abre para a direita e some.
    if (!this.textures.exists('fx-cone')) {
      const largura = 64;
      const altura = 32;
      const textura = this.textures.createCanvas('fx-cone', largura, altura);
      if (textura) {
        const ctx = textura.getContext();
        const gradiente = ctx.createLinearGradient(0, 0, largura, 0);
        gradiente.addColorStop(0, 'rgba(255,255,255,0.95)');
        gradiente.addColorStop(0.6, 'rgba(255,255,255,0.4)');
        gradiente.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradiente;
        ctx.beginPath();
        ctx.moveTo(0, altura / 2 - 2);
        ctx.lineTo(largura, 0);
        ctx.lineTo(largura, altura);
        ctx.lineTo(0, altura / 2 + 2);
        ctx.closePath();
        ctx.fill();
        textura.refresh();
        textura.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }

    // Brotos que nascem no chão depois de uma batida forte (2 quadros de 5×5).
    if (!this.textures.exists('fx-broto')) {
      const g = this.make.graphics({}, false);
      const pixel = (x: number, y: number, cor: number) => {
        g.fillStyle(cor, 1);
        g.fillRect(x, y, 1, 1);
      };
      // 0: dois brotos de folha
      pixel(2, 4, 0x3f7a4f); pixel(2, 3, 0x3f7a4f); pixel(1, 2, COR_BROTO); pixel(0, 1, COR_VERDE_CLARO);
      pixel(3, 2, COR_BROTO); pixel(4, 1, COR_ESPIRITO); pixel(2, 2, 0x3f7a4f);
      // 1: broto com botão de luz
      pixel(7, 4, 0x3f7a4f); pixel(7, 3, 0x3f7a4f); pixel(6, 3, COR_BROTO); pixel(8, 2, COR_BROTO);
      pixel(7, 2, 0x3f7a4f); pixel(7, 1, COR_ESPIRITO); pixel(7, 0, 0xeef4f0);
      g.generateTexture('fx-broto', 10, 5);
      g.destroy();
      const textura = this.textures.get('fx-broto');
      textura.add(0, 0, 0, 0, 5, 5);
      textura.add(1, 0, 5, 0, 5, 5);
    }

    if (!this.textures.exists('fx-brilho')) {
      const tamanho = 64;
      const textura = this.textures.createCanvas('fx-brilho', tamanho, tamanho);
      if (textura) {
        const ctx = textura.getContext();
        const meio = tamanho / 2;
        const gradiente = ctx.createRadialGradient(meio, meio, 0, meio, meio, meio);
        gradiente.addColorStop(0, 'rgba(255,255,255,1)');
        gradiente.addColorStop(0.35, 'rgba(255,255,255,0.5)');
        gradiente.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradiente;
        ctx.fillRect(0, 0, tamanho, tamanho);
        textura.refresh();
        // Luz suave mesmo com pixelArt ligado no jogo.
        textura.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
  }

  /** Saída acesa: brilho grande pulsando e partículas subindo; apagada: nada. */
  private atualizarLuzSaida(acesa: boolean): void {
    this.brilhoSaidaPulso?.stop();
    this.brilhoSaidaPulso = null;
    if (!this.brilhoSaida || !this.emissorSaida) return;

    this.brilhoSaida.setVisible(acesa);
    if (!acesa) {
      this.emissorSaida.stop();
      return;
    }

    const { alfaBrilho, pulsoMs } = CONFIG.feel.saida;
    this.brilhoSaida.setAlpha(alfaBrilho.min);
    this.brilhoSaidaPulso = this.tweens.add({
      targets: this.brilhoSaida,
      alpha: { from: alfaBrilho.min, to: alfaBrilho.max },
      duration: pulsoMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.emissorSaida.start();
  }

  /** Morte: o Protagonista "se desfaz em folhas" e a tela treme. */
  private efeitoMorte(origem: Coordenada): void {
    const tile = CONFIG.tamanhoTilePx;
    const { folhas, tremorMs, tremorIntensidade } = CONFIG.feel.morte;
    this.emissorRastro?.stop();
    this.distanciaDeslizeAtual = 0;
    const x = origem.col * tile + tile / 2;
    const y = origem.lin * tile + tile / 2;
    this.emissorFolhas?.explode(folhas, x, y);

    // O corpo fica no lugar e se desfaz em luz e folhas (o Protagonista já foi para o Totem).
    const fantasma = this.add
      .sprite(x, y, SPRITES_PROTAGONISTA.chave, indiceQuadro(LINHA_MORTE, 0))
      .setOrigin(0.5, SPRITES_PROTAGONISTA.origemY)
      .setDepth(10.6);
    fantasma.play(chaveAnimacao('morte'));
    fantasma.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fantasma.destroy());
    if (!this.reduzirMovimento) {
      this.cameras.main.shake(tremorMs, tremorIntensidade);
    }
  }

  /** Totem ativado: clarão e partículas em volta. */
  private efeitoAtivacaoTotem(celula: Coordenada): void {
    const tile = CONFIG.tamanhoTilePx;
    const { particulas, claraoMs } = CONFIG.feel.totem;
    this.emissorTotem?.explode(
      particulas,
      celula.col * tile + tile / 2,
      celula.lin * tile + tile / 2,
    );
    this.cameras.main.flash(claraoMs, 125, 211, 252, true);
  }

  // ------------------------------------------------------------------
  // Almas da floresta: colecionável opcional que conta na nota da Fase.

  /** Gera o sprite provisório da Alma (4 quadros de 16×16) quando a arte não foi carregada. */
  private gerarTexturaAlma(): void {
    if (this.textures.exists('alma')) return;
    const tile = CONFIG.tamanhoTilePx;
    const g = this.make.graphics({}, false);
    // Raio do brilho e posição da "chama" de cada quadro: a Alma pulsa e tremula.
    const quadros = [
      { brilho: 5, chama: -1 },
      { brilho: 6, chama: 0 },
      { brilho: 5, chama: 1 },
      { brilho: 4, chama: 0 },
    ];
    quadros.forEach(({ brilho, chama }, i) => {
      const cx = i * tile + tile / 2;
      const cy = tile / 2 + 1;
      g.fillStyle(CORES.almaBrilho, 0.35);
      g.fillCircle(cx, cy, brilho);
      g.fillStyle(CORES.almaContorno, 1);
      g.fillCircle(cx, cy, 3);
      g.fillStyle(CORES.almaBrilho, 1);
      g.fillCircle(cx, cy, 2.5);
      g.fillRect(cx - 1 + chama, cy - 5, 2, 3);
      g.fillStyle(CORES.almaNucleo, 1);
      g.fillRect(cx - 1, cy - 1, 2, 2);
      g.fillRect(cx + chama, cy - 6, 1, 1);
    });
    g.generateTexture('alma', quadros.length * tile, tile);
    g.destroy();
    const textura = this.textures.get('alma');
    quadros.forEach((_, i) => textura.add(i, 0, i * tile, 0, tile, tile));
  }

  private criarAlmas(): void {
    const tile = CONFIG.tamanhoTilePx;
    this.gerarTexturaAlma();
    if (!this.anims.exists('alma-flutuar')) {
      const quadros = this.textures.get('alma').getFrameNames(false);
      this.anims.create({
        key: 'alma-flutuar',
        frames: quadros.map((frame) => ({ key: 'alma', frame })),
        frameRate: 6,
        repeat: -1,
      });
    }

    this.spritesAlma.length = 0;
    this.halosAlma.length = 0;
    this.fase.almas.forEach((alma, i) => {
      if (this.textures.exists('fx-brilho')) {
        const halo = this.add
          .image(alma.col * tile + tile / 2, alma.lin * tile + tile / 2, 'fx-brilho')
          .setDisplaySize(tile * 1.5, tile * 1.5)
          .setTint(CORES.almaBrilho)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.3)
          .setDepth(5);
        this.tweens.add({
          targets: halo,
          alpha: { from: 0.2, to: 0.45 },
          duration: 900,
          delay: (i * 131) % 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.halosAlma.push(halo);
      }
      const sprite = this.add
        .sprite(alma.col * tile + tile / 2, alma.lin * tile + tile / 2, 'alma')
        .setDepth(6)
        .play({ key: 'alma-flutuar', startFrame: i % 4 });
      // Flutua de leve, fora de fase com as vizinhas.
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 2,
        duration: 650,
        delay: (i * 97) % 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.spritesAlma.push(sprite);
    });

    this.emissorAlmas = this.add
      .particles(0, 0, this.textures.exists('fx-ponto') ? 'fx-ponto' : 'alma', {
        lifespan: 380,
        speed: { min: 15, max: 45 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.4, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: CORES.almaBrilho,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(9);
  }

  private coletarAlmaVisual(indice: number): void {
    const sprite = this.spritesAlma[indice];
    if (!sprite) return;
    sprite.setVisible(false);
    this.halosAlma[indice]?.setVisible(false);
    const tile = CONFIG.tamanhoTilePx;
    const alma = this.fase.almas[indice];
    this.emissorAlmas?.explode(8, alma.col * tile + tile / 2, alma.lin * tile + tile / 2);
  }

  // ------------------------------------------------------------------
  // Marcadores desenhados no estilo do cenário (cores da paleta do kit).

  /** Totem: poste de madeira entalhado com uma pedra no topo, que acende quando ativo. */
  private desenharTotem(g: Phaser.GameObjects.Graphics, coord: Coordenada, ativo: boolean): void {
    const tile = CONFIG.tamanhoTilePx;
    const x = coord.col * tile;
    const y = coord.lin * tile;
    // sombra no chão
    g.fillStyle(0x0d1512, 0.35);
    g.fillEllipse(x + 8, y + 14.5, 10, 3);
    // poste
    g.fillStyle(0x3a2a20, 1);
    g.fillRect(x + 5, y + 5, 6, 10);
    g.fillStyle(0x6b4a32, 1);
    g.fillRect(x + 6, y + 6, 4, 8);
    g.fillStyle(0xa0703f, 1);
    g.fillRect(x + 6, y + 8, 4, 1);
    g.fillRect(x + 6, y + 11, 4, 1);
    // pedra do topo
    const pedra = ativo ? 0x7dd3fc : 0x8a9a90;
    const contorno = ativo ? 0x2f6f73 : 0x3b4d45;
    g.fillStyle(contorno, 1);
    g.fillRect(x + 5, y + 1, 6, 5);
    g.fillRect(x + 6, y + 0, 4, 7);
    g.fillStyle(pedra, 1);
    g.fillRect(x + 6, y + 1, 4, 5);
    g.fillStyle(ativo ? 0xeef4f0 : 0xb5c2ba, 1);
    g.fillRect(x + 7, y + 2, 1, 2);
  }

  /** Prova: papel com linhas de texto e o número, com borda de luz dourada. */
  private desenharProva(
    g: Phaser.GameObjects.Graphics,
    coord: Coordenada,
    numero: '1' | '2' | '3',
  ): void {
    const tile = CONFIG.tamanhoTilePx;
    const x = coord.col * tile;
    const y = coord.lin * tile;
    // brilho
    g.fillStyle(CORES.prova, 0.28);
    g.fillRect(x + 1, y + 1, 14, 14);
    // papel
    g.fillStyle(0x3a2a20, 1);
    g.fillRect(x + 3, y + 2, 10, 12);
    g.fillStyle(0xeef4f0, 1);
    g.fillRect(x + 4, y + 3, 8, 10);
    // canto dobrado
    g.fillStyle(0xd9a066, 1);
    g.fillRect(x + 10, y + 3, 2, 2);
    // linhas de texto
    g.fillStyle(0x8a9a90, 1);
    g.fillRect(x + 5, y + 4, 4, 1);
    g.fillRect(x + 5, y + 6, 6, 1);
    // número da Prova (glifo 5×5) em tom de madeira
    const padrao = GLIFOS_MARCADOR[numero];
    g.fillStyle(0x6b4a32, 1);
    padrao.forEach((linha, l) =>
      [...linha].forEach((c, col) => {
        if (c === '#') g.fillRect(x + 6 + col, y + 8 + l, 1, 1);
      }),
    );
  }

  // ------------------------------------------------------------------
  // Floresta à noite: cogumelos que brilham, flores, vagalumes, halo e vinheta.

  private gerarTexturasNoite(): void {
    if (!this.textures.exists('cogumelo')) {
      const g = this.make.graphics({}, false);
      // três cogumelinhos de tamanhos diferentes, no pé da mata
      const cogumelos: [number, number, number][] = [
        [4, 12, 2],
        [9, 13, 3],
        [12, 11, 2],
      ];
      for (const [x, y, r] of cogumelos) {
        g.fillStyle(CORES.cogumeloPe, 1);
        g.fillRect(x, y, 1, 3);
        g.fillStyle(CORES.cogumeloBrilho, 1);
        g.fillRect(x - r, y - 1, r * 2 + 1, 2);
        g.fillStyle(CORES.cogumeloChapeu, 1);
        g.fillRect(x - r + 1, y - 2, r * 2 - 1, 1);
        g.fillStyle(CORES.almaNucleo, 1);
        g.fillRect(x - 1, y - 1, 1, 1);
      }
      g.generateTexture('cogumelo', 16, 16);
      g.destroy();
    }
    if (!this.textures.exists('flor')) {
      const g = this.make.graphics({}, false);
      const flores: [number, number][] = [
        [5, 12],
        [11, 10],
      ];
      for (const [x, y] of flores) {
        g.fillStyle(0x234836, 1);
        g.fillRect(x, y + 1, 1, 3);
        g.fillStyle(CORES.florPetala, 1);
        g.fillRect(x - 1, y, 3, 1);
        g.fillRect(x, y - 1, 1, 3);
        g.fillStyle(CORES.florMiolo, 1);
        g.fillRect(x, y, 1, 1);
      }
      g.generateTexture('flor', 16, 16);
      g.destroy();
    }
    if (!this.textures.exists('fx-vinheta')) {
      const tamanho = 128;
      const textura = this.textures.createCanvas('fx-vinheta', tamanho, tamanho);
      if (textura) {
        const ctx = textura.getContext();
        const meio = tamanho / 2;
        const gradiente = ctx.createRadialGradient(meio, meio, tamanho * 0.36, meio, meio, tamanho * 0.75);
        gradiente.addColorStop(0, 'rgba(5,10,14,0)');
        gradiente.addColorStop(1, 'rgba(5,10,14,0.65)');
        ctx.fillStyle = gradiente;
        ctx.fillRect(0, 0, tamanho, tamanho);
        textura.refresh();
        textura.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
  }

  private criarNoite(): void {
    const tile = CONFIG.tamanhoTilePx;
    this.gerarTexturasNoite();

    // Cogumelos e flores na beira da mata; os cogumelos brilham e pulsam devagar.
    decorarBeiras(this.fase.grade).forEach(({ tipo, col, lin }, i) => {
      const x = col * tile;
      const y = lin * tile;
      if (tipo === 'cogumelo' && this.textures.exists('fx-brilho')) {
        const brilho = this.add
          .image(x + tile / 2, y + tile * 0.75, 'fx-brilho')
          .setDisplaySize(tile * 1.8, tile * 1.8)
          .setTint(CORES.cogumeloBrilho)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.3)
          .setDepth(0.8);
        this.tweens.add({
          targets: brilho,
          alpha: { from: 0.18, to: 0.42 },
          duration: 1600,
          delay: (i * 233) % 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      this.add.image(x, y, tipo).setOrigin(0, 0).setDepth(0.9);
    });

    // Vagalumes: pontinhos lima e ciano à deriva por toda a Fase.
    const largura = this.fase.largura * tile;
    const altura = this.fase.altura * tile;
    if (this.textures.exists('fx-ponto')) {
      this.add
        .particles(0, 0, 'fx-ponto', {
          emitZone: new Phaser.GameObjects.Particles.Zones.RandomZone({
            getRandomPoint: (ponto) => {
              ponto.x = Math.random() * largura;
              ponto.y = Math.random() * altura;
            },
          }),
          lifespan: { min: 3000, max: 6000 },
          frequency: 45,
          speedX: { min: -6, max: 6 },
          speedY: { min: -8, max: 2 },
          scale: { start: 1, end: 0.6 },
          alpha: { values: [0, 0.9, 0.3, 0.9, 0] },
          tint: [CORES.vagalumeLima, CORES.vagalumeCiano],
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(9.5);

      // Halo suave em volta do Protagonista: ele nunca some no escuro.
      const halo = this.add
        .image(0, 0, 'fx-brilho')
        .setDisplaySize(tile * 3.6, tile * 3.6)
        .setTint(0xeef4f0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.32);
      this.protagonista.addAt(halo, 0);
    }

    // Vinheta: escurece as bordas da tela, como a noite fechando em volta.
    this.vinheta = this.add
      .image(0, 0, 'fx-vinheta')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50)
      .setDisplaySize(this.cameras.main.width, this.cameras.main.height);
  }

    /** Folha 6×16px: 0 recolhido, 1-2 aviso (pisca), 3 reserva, 4 ativo, 5 recolhendo. */
  private gerarTexturaEspinho(): void {
    if (this.textures.exists('espinho')) return;
    const tile = CONFIG.tamanhoTilePx;
    const g = this.make.graphics({}, false);
    const furos = [[4, 4], [10, 4], [7, 8], [4, 11], [10, 11]]
      .sort((a, b) => a[1] - b[1]); // fundo -> frente

        // Espinho de planta/osso: base larga, ponta fina, luz à esquerda e sombra à direita.
    const pico = (ox: number, x: number, base: number, h: number, ponta: number | null) => {
      for (let r = 0; r < h; r++) {
        const yy = base - h + 1 + r;
        if (r === 0) {
          g.fillStyle(ponta ?? 0xd9b27c, 1);
          g.fillRect(ox + x + 1, yy, 1, 1);
        } else if (r === 1 && h >= 5) {
          g.fillStyle(0x9a6a3c, 1);
          g.fillRect(ox + x + 1, yy, 1, 1);
        } else {
          g.fillStyle(0xd9b27c, 1); // luz
          g.fillRect(ox + x, yy, 1, 1);
          g.fillStyle(0x9a6a3c, 1); // meio
          g.fillRect(ox + x + 1, yy, 1, 1);
          g.fillStyle(0x4a2e1c, 1); // sombra
          g.fillRect(ox + x + 2, yy, 1, 1);
        }
      }
    };

    const quadros = [
      { borda: CORES.espinhosBorda, alfa: 0.3, h: 0, ponta: null },
      { borda: CORES.espinhosAviso, alfa: 1, h: 1, ponta: CORES.espinhosAviso },
      { borda: CORES.espinhosAviso, alfa: 0.35, h: 2, ponta: CORES.espinhosAviso },
      { borda: CORES.espinhosBorda, alfa: 0.6, h: 3, ponta: CORES.espinhosBorda },
      { borda: CORES.espinhosBorda, alfa: 1, h: 5, ponta: CORES.espinhos },
      { borda: CORES.espinhosBorda, alfa: 0.4, h: 2, ponta: 0x6b4a32 },
    ] as const;

    quadros.forEach(({ borda, alfa, h, ponta }, i) => {
      const ox = i * tile;
      g.lineStyle(1, borda, alfa);
      g.strokeRect(ox + 0.5, 0.5, tile - 1, tile - 1);
      for (const [x, y] of furos) {
        g.fillStyle(CORES.espinhosFuro, 1);
        g.fillRect(ox + x, y, 2, 2);
        g.fillStyle(0x0d1512, 0.8);
        g.fillRect(ox + x, y + 1, 2, 1); // sombra do furo
      }
      if (h > 0) {
        if (i === 4) { // brilho de perigo no chão
          g.fillStyle(CORES.espinhos, 0.26);
          g.fillRect(ox + 1, 1, tile - 2, tile - 2);
        }
        for (const [x, y] of furos) pico(ox, x, y + 1, h, ponta);
      }
    });

    g.generateTexture('espinho', quadros.length * tile, tile);
    g.destroy();
    const textura = this.textures.get('espinho');
    quadros.forEach((_, i) => textura.add(i, 0, i * tile, 0, tile, tile));
  }

  /**
   * Folha 4×16px do solo erodido (`~`):
   * 0 intacto · 1 rachando A · 2 rachando B (pisca) · 3 quebrado (buraco letal).
   */
  private gerarTexturaSoloErodido(): void {
    if (this.textures.exists('solo-erodido')) return;
    const tile = CONFIG.tamanhoTilePx;
    const g = this.make.graphics({}, false);

    const desenharTrincasLeves = (ox: number, cor: number, alfa: number) => {
      g.fillStyle(cor, alfa);
      const pts: readonly [number, number][] = [
        [3, 4], [4, 5], [5, 5], [6, 6], [7, 7], [8, 7], [9, 8], [10, 9], [11, 10],
        [7, 8], [6, 9], [5, 10],
      ];
      for (const [x, y] of pts) g.fillRect(ox + x, y, 1, 1);
    };

    const desenharTrincasDensa = (ox: number, cor: number, corCentro: number) => {
      g.fillStyle(cor, 1);
      const pts: readonly [number, number][] = [
        [2, 3], [3, 4], [4, 5], [5, 6], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11], [12, 12],
        [12, 3], [11, 4], [10, 5], [9, 6], [8, 7], [6, 8], [5, 9], [4, 10], [3, 12],
        [7, 2], [7, 3], [7, 4], [7, 5], [8, 9], [8, 10], [8, 11], [8, 12],
        [3, 7], [4, 7], [5, 7], [10, 7], [11, 8], [12, 8],
      ];
      for (const [x, y] of pts) g.fillRect(ox + x, y, 1, 1);
      g.fillStyle(corCentro, 0.95);
      g.fillRect(ox + 6, 6, 3, 3);
    };

    // 0: intacto (~)
    g.lineStyle(1, CORES.soloBorda, 0.55);
    g.strokeRect(0.5, 0.5, tile - 1, tile - 1);
    desenharTrincasLeves(0, CORES.soloTrinca, 0.85);
    g.fillStyle(CORES.soloBorda, 0.4);
    g.fillRect(2, 12, 2, 1);
    g.fillRect(11, 3, 2, 1);

    // 1: rachando A
    g.fillStyle(CORES.soloAviso, 0.14);
    g.fillRect(tile + 1, 1, tile - 2, tile - 2);
    g.lineStyle(1, CORES.soloAviso, 0.9);
    g.strokeRect(tile + 0.5, 0.5, tile - 1, tile - 1);
    desenharTrincasLeves(tile, CORES.soloTrincaEscura, 1);
    g.fillStyle(CORES.soloBuraco, 0.75);
    g.fillRect(tile + 6, 6, 2, 2);

    // 2: rachando B (pisca urgente)
    g.fillStyle(CORES.soloAviso, 0.28);
    g.fillRect(2 * tile + 1, 1, tile - 2, tile - 2);
    g.lineStyle(1, CORES.soloAvisoForte, 1);
    g.strokeRect(2 * tile + 0.5, 0.5, tile - 1, tile - 1);
    desenharTrincasDensa(2 * tile, CORES.soloTrincaEscura, CORES.soloBuraco);

    // 3: quebrado (buraco/fenda escura letal)
    const ox3 = 3 * tile;
    g.fillStyle(CORES.soloBuracoBeira, 1);
    g.fillRect(ox3 + 1, 1, tile - 2, tile - 2);
    g.fillStyle(CORES.soloBuracoFundo, 1);
    g.fillRect(ox3 + 2, 2, tile - 4, tile - 4);
    g.fillStyle(CORES.soloBuraco, 1);
    g.fillRect(ox3 + 3, 4, tile - 6, tile - 6);
    g.fillRect(ox3 + 2, 5, tile - 4, tile - 8);
    g.fillStyle(CORES.soloBorda, 0.75);
    g.fillRect(ox3 + 2, tile - 2, tile - 4, 1);
    g.lineStyle(1, CORES.soloTrincaEscura, 0.95);
    g.strokeRect(ox3 + 0.5, 0.5, tile - 1, tile - 1);

    g.generateTexture('solo-erodido', 4 * tile, tile);
    g.destroy();
    const textura = this.textures.get('solo-erodido');
    for (let i = 0; i < 4; i++) textura.add(i, 0, i * tile, 0, tile, tile);
  }
}