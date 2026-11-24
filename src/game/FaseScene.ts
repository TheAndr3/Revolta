import Phaser from 'phaser';
import { CONFIG } from '../core/config';
import type { EtapaEspinho } from '../core/espinhos';
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

export interface ResumoConclusaoFase {
  readonly deslizes: number;
  readonly mortes: number;
  /** Tempo jogado na tentativa, sem pausas nem overlays de Prova. */
  readonly tempoSegundos: number;
  readonly habitanteResgatado: boolean;
  readonly temHabitante: boolean;
  readonly almasColetadas: number;
  readonly almasTotal: number;
}

export interface CallbacksFaseScene {
  aoConcluir: (resumo: ResumoConclusaoFase) => void;
  aoAtualizarDeslizes: (deslizes: number) => void;
  aoAtualizarMortes: (mortes: number) => void;
  aoAtualizarProvas: (coletadas: number, total: number) => void;
  aoAtualizarHabitante: (resgatado: boolean, temHabitante: boolean) => void;
  aoAtualizarAlmas: (coletadas: number, total: number) => void;
  aoColetarProva: (prova: ProvaNaFase) => void;
  aoAbrirProva: (prova: ProvaNaFase) => void;
  aoResgatarHabitante: () => void;
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
  gosma: 0x84cc16,
  gosmaMarca: 0x1a2e05,
  gosmaBrilho: 0xd9f99d,
  gosmaTrilho: 0xa3e635,
  drone: 0xef4444,
  droneMarca: 0x450a0a,
  guarda: 0x6366f1,
  guardaMarca: 0x1e1b4b,
  guardaOlhar: 0xf8fafc,
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

const ANGULO_PES: Record<Direcao, number> = {
  baixo: 0,
  esquerda: 90,
  cima: 180,
  direita: -90,
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
  private estado!: EstadoFase;

  private protagonista!: Phaser.GameObjects.Container;
  private corpoProtagonista!: Phaser.GameObjects.Image;
  private escalaBaseProtagonista = 1;
  private marcadorBuffer!: Phaser.GameObjects.Rectangle;

  private baseSaida!: Phaser.GameObjects.Rectangle;
  private nucleoSaida!: Phaser.GameObjects.Rectangle;
  private haloSaida!: Phaser.GameObjects.Rectangle;
  private brilhoSaidaTween: Phaser.Tweens.Tween | null = null;
  private haloSaidaTween: Phaser.Tweens.Tween | null = null;

  private readonly marcadoresProva = new Map<NumeroProva, Phaser.GameObjects.Graphics>();
  private readonly marcadoresTotem: MarcadorTotem[] = [];
  private haloTotemTween: Phaser.Tweens.Tween | null = null;
  private marcadorHabitante: Phaser.GameObjects.Graphics | null = null;
  private readonly spritesAmeaca = new Map<string, Phaser.GameObjects.Container>();
  /** Marca provisória de "para onde o Guarda olha" (até a animação em 4 direções da arte final). */
  private readonly olharGuarda = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly brilhosTrilhoGosma: CelulaBrilhoTrilho[] = [];
  /** Um gráfico por espinho, redesenhado quando a etapa muda (e piscando no aviso). */
  private readonly graficosEspinho: Array<{
    readonly grafico: Phaser.GameObjects.Graphics;
    desenho: string;
  }> = [];

  private trancoOffset = { x: 0, y: 0 };
  private trancoTween: Phaser.Tweens.Tween | null = null;
  private rotacaoTween: Phaser.Tweens.Tween | null = null;
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

  constructor(fase: Fase, callbacks: CallbacksFaseScene) {
    super({ key: 'FaseScene' });
    this.fase = fase;
    this.callbacks = callbacks;
  }

  preload(): void {
    this.load.image(
      'protagonista',
      `${import.meta.env.BASE_URL}assets/protagonista.png`,
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
  }

  create(): void {
    const tile = CONFIG.tamanhoTilePx;
    const larguraMundo = this.fase.largura * tile;
    const alturaMundo = this.fase.altura * tile;

    this.cameras.main.setBackgroundColor(CORES.fundo);
    this.cameras.main.setBounds(0, 0, larguraMundo, alturaMundo);

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
    this.marcadorHabitante?.setVisible(true);
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
    this.callbacks.aoAtualizarHabitante(
      this.estado.habitanteResgatado,
      this.fase.habitante !== null,
    );
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
    this.rotacaoTween?.stop();
    this.corpoProtagonista.setAngle(0);
    this.restaurarFormaProtagonista();
  }

  private reiniciarCiclosAmeacasEArmadilhas(): void {
    for (const item of this.brilhosTrilhoGosma) {
      item.intensidade = 0;
      item.rect.setAlpha(0.18);
    }
    if (this.estado) {
      this.sincronizarAmeacas(0);
      this.sincronizarEspinhos();
    }
  }

  /** Desenho provisório das 4 etapas dos espinhos (a arte final troca por sprites). */
  private sincronizarEspinhos(): void {
    this.estado.espinhos.forEach((espinho, i) => {
      const item = this.graficosEspinho[i];
      if (!item) return;
      // No aviso, pisca 8 vezes por segundo para chamar atenção.
      const piscando =
        espinho.etapa === 'aviso' && Math.floor(espinho.tempoNaEtapa * 8) % 2 === 1;
      const desenho = `${espinho.etapa}:${piscando ? 1 : 0}`;
      if (desenho === item.desenho) return;
      item.desenho = desenho;
      this.desenharEspinho(item.grafico, espinho.etapa, piscando);
    });
  }

  private desenharEspinho(
    g: Phaser.GameObjects.Graphics,
    etapa: EtapaEspinho,
    piscando: boolean,
  ): void {
    const tile = CONFIG.tamanhoTilePx;
    g.clear();

    if (etapa === 'ativo') {
      g.lineStyle(1, CORES.espinhosBorda, 1);
      g.strokeRect(0.5, 0.5, tile - 1, tile - 1);
      this.desenharQuadradoMarcadoLocal(g, 0, 0, CORES.espinhos, CORES.espinhosMarca, '^');
      return;
    }

    if (etapa === 'recolhendo') {
      g.fillStyle(CORES.espinhos, 0.45);
      g.fillRect(2, 2, tile - 4, tile - 4);
      g.fillStyle(CORES.espinhosMarca, 0.5);
      for (const x of [4, 8, 11]) g.fillRect(x, 8, 1, 3);
      return;
    }

    // Recolhido e aviso: furos no chão; no aviso, borda laranja e pontas aparecendo.
    const corBorda = etapa === 'aviso' ? CORES.espinhosAviso : CORES.espinhosBorda;
    const alfaBorda = etapa === 'aviso' ? (piscando ? 0.35 : 1) : 0.35;
    g.lineStyle(1, corBorda, alfaBorda);
    g.strokeRect(0.5, 0.5, tile - 1, tile - 1);
    g.fillStyle(CORES.espinhosFuro, 1);
    for (const [x, y] of [
      [4, 4],
      [10, 4],
      [7, 8],
      [4, 11],
      [10, 11],
    ] as const) {
      g.fillRect(x, y, 2, 2);
      if (etapa === 'aviso') {
        g.fillStyle(CORES.espinhosAviso, 1);
        g.fillRect(x, y, 2, 1);
        g.fillStyle(CORES.espinhosFuro, 1);
      }
    }
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

    this.marcadorHabitante = null;
    if (this.fase.habitante) {
      const marcador = this.add.graphics().setDepth(6);
      this.desenharQuadradoMarcado(
        marcador,
        this.fase.habitante,
        CORES.habitante,
        CORES.habitanteMarca,
        'H',
      );
      this.marcadorHabitante = marcador;
    }

    this.graficosEspinho.length = 0;
    for (const espinho of this.fase.espinhos) {
      const grafico = this.add
        .graphics()
        .setPosition(espinho.col * tile, espinho.lin * tile)
        .setDepth(5);
      this.graficosEspinho.push({ grafico, desenho: '' });
    }

    this.spritesAmeaca.clear();
    this.olharGuarda.clear();
    for (const ameaca of this.fase.ameacas) {
      const estilo = ESTILO_AMEACA[ameaca.tipo];
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
      } else {
        const grafico = this.add.graphics();
        this.desenharQuadradoMarcadoLocal(
          grafico,
          -tile / 2,
          -tile / 2,
          estilo.cor,
          estilo.marca,
          estilo.glifo,
        );
        const container = this.add.container(centroX, centroY, [grafico]).setDepth(8);
        if (ameaca.tipo === 'guarda') {
          const olhar = this.add.rectangle(0, 0, 4, 4, CORES.guardaOlhar, 1);
          container.add(olhar);
          this.olharGuarda.set(ameaca.id, olhar);
        }
        this.spritesAmeaca.set(ameaca.id, container);
      }
    }
  }

  private desenharQuadradoMarcadoLocal(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    corFundo: number,
    corMarca: number,
    glifo: GlifoMarcador,
  ): void {
    const tile = CONFIG.tamanhoTilePx;
    g.fillStyle(corFundo, 1);
    g.fillRect(x + 1, y + 1, tile - 3, tile - 3);

    const padrao = GLIFOS_MARCADOR[glifo];
    g.fillStyle(corMarca, 1);
    for (let lin = 0; lin < padrao.length; lin++) {
      const linha = padrao[lin];
      for (let col = 0; col < linha.length; col++) {
        if (linha[col] === '#') {
          g.fillRect(x + 5 + col, y + 5 + lin, 1, 1);
        }
      }
    }
  }

  private desenharQuadradoMarcado(
    g: Phaser.GameObjects.Graphics,
    coord: Coordenada,
    corFundo: number,
    corMarca: number,
    glifo: GlifoMarcador,
  ): void {
    const tile = CONFIG.tamanhoTilePx;
    this.desenharQuadradoMarcadoLocal(
      g,
      coord.col * tile,
      coord.lin * tile,
      corFundo,
      corMarca,
      glifo,
    );
  }

  private criarProtagonista(): void {
    const tile = CONFIG.tamanhoTilePx;
    this.corpoProtagonista = this.add.image(0, 0, 'protagonista');
    this.corpoProtagonista.setDisplaySize(tile, tile);
    this.escalaBaseProtagonista = this.corpoProtagonista.scaleX;

    this.marcadorBuffer = this.add.rectangle(0, 0, 3, 3, CORES.bufferIndicador);
    this.marcadorBuffer.setVisible(false);

    this.protagonista = this.add.container(0, 0, [
      this.corpoProtagonista,
      this.marcadorBuffer,
    ]);
    this.protagonista.setDepth(10);
  }

  private processarEventos(eventos: readonly EventoDeslize[]): void {
    if (eventos.length > 0) this.callbacks.aoEventos?.(eventos);
    for (const evento of eventos) {
      switch (evento.tipo) {
        case 'iniciou_deslize':
          this.callbacks.aoAtualizarDeslizes(this.estado.deslizes);
          this.aplicarEstiramentoDeslize(evento.direcao);
          break;
        case 'tranco':
          this.executarAnimacaoTranco(evento.direcao);
          break;
        case 'parou_na_parede':
          this.achatarAoBater();
          break;
        case 'totem_ativado':
          this.efeitoAtivacaoTotem(evento.celula);
          this.atualizarVisualTotemAtivo(evento.celula, true);
          break;
        case 'habitante_resgatado':
          this.marcadorHabitante?.setVisible(false);
          this.animarPartidaHabitante(evento.celula);
          this.callbacks.aoResgatarHabitante();
          this.callbacks.aoAtualizarHabitante(true, this.fase.habitante !== null);
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
          this.sincronizarProtagonista();
          this.atualizarIndicadorBuffer();
          this.centralizarCameraImediatamente();
          this.cameras.main.flash(180, 220, 60, 60);
          this.callbacks.aoAtualizarMortes(evento.mortes);
          break;
        case 'retornou_ao_totem':
          this.resetarVisualProtagonista();
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
            habitanteResgatado: this.estado.habitanteResgatado,
            temHabitante: this.fase.habitante !== null,
            almasColetadas: contarAlmasColetadas(this.estado),
            almasTotal: this.fase.almas.length,
          });
          break;
      }
    }
  }

  private animarPartidaHabitante(celula: Coordenada): void {
    const tile = CONFIG.tamanhoTilePx;
    const brilho = this.add
      .rectangle(
        celula.col * tile + tile / 2,
        celula.lin * tile + tile / 2,
        tile - 2,
        tile - 2,
        CORES.habitante,
        0.9,
      )
      .setDepth(9);

    this.tweens.add({
      targets: brilho,
      y: brilho.y - tile,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => brilho.destroy(),
    });
  }

  private aplicarEstiramentoDeslize(direcao: Direcao): void {
    this.girarPesPara(direcao);
    this.restaurarFormaProtagonista();
    const base = this.escalaBaseProtagonista;
    const { x, y } = CONFIG.feel.estiramentoDeslize;
    this.corpoProtagonista.setScale(base * x, base * y);
  }

  /** Achata na direção do deslize ao bater na parede e volta ao normal com um quique. */
  private achatarAoBater(): void {
    const base = this.escalaBaseProtagonista;
    const { x, y, duracaoMs } = CONFIG.feel.achatamentoBatida;
    this.restaurarFormaProtagonista();
    this.corpoProtagonista.setScale(base * x, base * y);
    this.achatamentoTween = this.tweens.add({
      targets: this.corpoProtagonista,
      scaleX: base,
      scaleY: base,
      duration: duracaoMs,
      ease: 'Back.easeOut',
    });
  }

  private girarPesPara(direcao: Direcao): void {
    const corpo = this.corpoProtagonista;
    const alvo = ANGULO_PES[direcao];
    // menor caminho angular (evita girar 270° quando 90° bastam)
    const delta = Phaser.Math.Angle.ShortestBetween(corpo.angle, alvo);

    this.rotacaoTween?.stop();
    this.rotacaoTween = this.tweens.add({
      targets: corpo,
      angle: corpo.angle + delta,
      duration: 80,
      ease: 'Quad.easeOut',
    });
  }

  private restaurarFormaProtagonista(): void {
    this.achatamentoTween?.stop();
    this.achatamentoTween = null;
    this.corpoProtagonista.setScale(this.escalaBaseProtagonista);
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
      const olhar = this.olharGuarda.get(ameaca.id);
      if (olhar) {
        const { dc, dl } = VETOR_DIRECAO[ameaca.direcao];
        olhar.setPosition(dc * 6, dl * 6);
        // Parado no ponto de pausa: a marca fica amarela, como os pontos de pausa do trilho.
        olhar.setFillStyle(ameaca.pausada ? CORES.pausaMarca : CORES.guardaOlhar, 1);
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
    this.emissorFolhas?.explode(
      folhas,
      origem.col * tile + tile / 2,
      origem.lin * tile + tile / 2,
    );
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
}
