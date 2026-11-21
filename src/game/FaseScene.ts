import Phaser from 'phaser';
import { CONFIG } from '../core/config';
import {
  atualizarDeslize,
  criarEstadoFase,
  fecharProvaEmExibicao,
  solicitarDirecao,
  VETOR_DIRECAO,
  type Direcao,
  type EstadoFase,
  type EventoDeslize,
} from '../core/deslize';
import {
  TOTAL_PROVAS_FASE,
  type Coordenada,
  type Fase,
  type NumeroProva,
  type ProvaNaFase,
  type TipoAmeaca,
} from '../core/fase';

export interface CallbacksFaseScene {
  aoConcluir: (deslizes: number) => void;
  aoAtualizarDeslizes: (deslizes: number) => void;
  aoAtualizarProvas: (coletadas: number, total: number) => void;
  aoColetarProva: (prova: ProvaNaFase) => void;
  aoAbrirProva: (prova: ProvaNaFase) => void;
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
  protagonista: 0xf4d35e,
  protagonistaBorda: 0xfff3b0,
  bufferIndicador: 0x7ae582,
  totem: 0x38bdf8,
  totemMarca: 0x082f49,
  prova: 0xfbbf24,
  provaMarca: 0x451a03,
  habitante: 0xc084fc,
  habitanteMarca: 0x3b0764,
  espinhos: 0xf97316,
  espinhosMarca: 0x431407,
  gosma: 0x84cc16,
  gosmaMarca: 0x1a2e05,
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

const ANGULO_PES: Record<Direcao, number> = {
  baixo: 0,
  esquerda: 90,
  cima: 180,
  direita: -90,
};

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

  private trancoOffset = { x: 0, y: 0 };
  private trancoTween: Phaser.Tweens.Tween | null = null;
  private rotacaoTween: Phaser.Tweens.Tween | null = null;
  private lookAheadAtualY = 0;

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
    this.reiniciar();
  }

  public receberDirecao(direcao: Direcao): void {
    if (!this.estado || this.estado.provaEmExibicao !== null) return;
    const eventos = solicitarDirecao(this.estado, direcao);
    this.processarEventos(eventos);
    this.atualizarIndicadorBuffer();
  }

  public fecharProva(): void {
    if (!this.estado || this.estado.provaEmExibicao === null) return;
    const eventos = fecharProvaEmExibicao(this.estado);
    if (this.estado.provaEmExibicao === null) {
      this.tweens.resumeAll();
    }
    this.processarEventos(eventos);
    this.atualizarIndicadorBuffer();
  }

  public reiniciar(): void {
    this.tweens.resumeAll();
    this.estado = criarEstadoFase(this.fase);
    this.trancoTween?.stop();
    this.trancoOffset.x = 0;
    this.trancoOffset.y = 0;
    this.lookAheadAtualY = 0;
    this.rotacaoTween?.stop();
    this.corpoProtagonista.setAngle(0);
    this.restaurarFormaProtagonista();

    for (const marcador of this.marcadoresProva.values()) {
      marcador.setVisible(true);
    }
    this.atualizarVisualSaida(this.estado.saidaAcesa, false);

    this.sincronizarProtagonista();
    this.atualizarIndicadorBuffer();
    this.centralizarCameraImediatamente();
    this.callbacks.aoAtualizarDeslizes(0);
    this.callbacks.aoAtualizarProvas(this.estado.provasColetadas.length, TOTAL_PROVAS_FASE);
  }

  public atualizarTamanhoViewport(larguraLogica: number, alturaLogica: number): void {
    if (!this.cameras?.main) return;
    this.cameras.main.setViewport(0, 0, larguraLogica, alturaLogica);
    this.centralizarCameraImediatamente();
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.estado || this.estado.provaEmExibicao !== null) return;

    // Limita delta para evitar saltos gigantes ao voltar de aba em segundo plano
    const deltaSegundos = Math.min(deltaMs, 100) / 1000;
    const eventos = atualizarDeslize(this.estado, deltaSegundos);
    this.processarEventos(eventos);

    this.sincronizarProtagonista();
    this.atualizarIndicadorBuffer();

    if (this.estado.provaEmExibicao === null) {
      this.atualizarCameraVertical(deltaSegundos);
    }
  }

  private desenharGrade(): void {
    const tile = CONFIG.tamanhoTilePx;
    const g = this.add.graphics();

    for (let lin = 0; lin < this.fase.altura; lin++) {
      for (let col = 0; col < this.fase.largura; col++) {
        const tipo = this.fase.grade[lin][col];
        const x = col * tile;
        const y = lin * tile;

        if (tipo === 'parede') {
          g.fillStyle(CORES.parede, 1);
          g.fillRect(x, y, tile, tile);
          g.fillStyle(CORES.paredeBorda, 1);
          g.fillRect(x, y, tile, 2);
          g.fillStyle(CORES.paredeSombra, 1);
          g.fillRect(x, y + tile - 2, tile, 2);
          continue;
        }

        // Chão base
        g.fillStyle(CORES.chao, 1);
        g.fillRect(x, y, tile, tile);
        g.lineStyle(1, CORES.gradeChao, 0.35);
        g.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);

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

  private atualizarVisualSaida(acesa: boolean, animarAcendimento: boolean): void {
    this.brilhoSaidaTween?.stop();
    this.brilhoSaidaTween = null;
    this.haloSaidaTween?.stop();
    this.haloSaidaTween = null;

    if (!this.baseSaida || !this.nucleoSaida || !this.haloSaida) return;

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
    for (const ameaca of this.fase.ameacas) {
      const estilo = ESTILO_AMEACA[ameaca.tipo];
      g.fillStyle(estilo.cor, 0.25);
      for (const celula of ameaca.trilho) {
        g.fillRect(celula.col * tile + 4, celula.lin * tile + 4, tile - 8, tile - 8);
      }

      g.fillStyle(CORES.pausaMarca, 0.9);
      for (const pausa of ameaca.pausas) {
        g.fillRect(pausa.vertice.col * tile + 6, pausa.vertice.lin * tile + 6, 4, 4);
      }
    }

    for (const totem of this.fase.totens) {
      this.desenharQuadradoMarcado(g, totem, CORES.totem, CORES.totemMarca, 'T');
    }

    this.marcadoresProva.clear();
    for (const prova of this.fase.provas) {
      const marcador = this.add.graphics();
      marcador.setDepth(6);
      const glifo = String(prova.numero) as '1' | '2' | '3';
      this.desenharQuadradoMarcado(
        marcador,
        prova.posicao,
        CORES.prova,
        CORES.provaMarca,
        glifo,
      );
      this.marcadoresProva.set(prova.numero, marcador);
    }

    if (this.fase.habitante) {
      this.desenharQuadradoMarcado(
        g,
        this.fase.habitante,
        CORES.habitante,
        CORES.habitanteMarca,
        'H',
      );
    }

    for (const espinho of this.fase.espinhos) {
      this.desenharQuadradoMarcado(g, espinho, CORES.espinhos, CORES.espinhosMarca, '^');
    }

    for (const ameaca of this.fase.ameacas) {
      const estilo = ESTILO_AMEACA[ameaca.tipo];
      this.desenharQuadradoMarcado(
        g,
        ameaca.posicaoInicial,
        estilo.cor,
        estilo.marca,
        estilo.glifo,
      );
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
    const x = coord.col * tile;
    const y = coord.lin * tile;

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
          this.restaurarFormaProtagonista();
          break;
        case 'prova_coletada':
          this.marcadoresProva.get(evento.prova.numero)?.setVisible(false);
          this.callbacks.aoColetarProva(evento.prova);
          this.callbacks.aoAtualizarProvas(evento.totalColetadas, evento.totalProvas);
          break;
        case 'saida_acesa':
          this.atualizarVisualSaida(true, true);
          break;
        case 'abrir_prova':
          this.restaurarFormaProtagonista();
          this.sincronizarProtagonista();
          this.atualizarIndicadorBuffer();
          this.tweens.pauseAll();
          this.callbacks.aoAbrirProva(evento.prova);
          break;
        case 'fase_concluida':
          this.restaurarFormaProtagonista();
          this.callbacks.aoConcluir(this.estado.deslizes);
          break;
      }
    }
  }

  private aplicarEstiramentoDeslize(direcao: Direcao): void {
    this.girarPesPara(direcao);
    const base = this.escalaBaseProtagonista;
    this.corpoProtagonista.setScale(base * 0.9, base * 1.12);
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

  private centralizarCameraImediatamente(): void {
    const cam = this.cameras.main;
    const tile = CONFIG.tamanhoTilePx;
    const centroY = this.estado.posicao.y * tile + tile / 2;
    const scrollYAlvo = centroY - cam.height / 2;
    cam.scrollX = 0;
    cam.scrollY = Phaser.Math.Clamp(
      scrollYAlvo,
      0,
      Math.max(0, this.fase.altura * tile - cam.height),
    );
  }

  private atualizarCameraVertical(deltaSegundos: number): void {
    const cam = this.cameras.main;
    const tile = CONFIG.tamanhoTilePx;
    const dir = this.estado.direcaoAtual;

    let lookAheadAlvo = 0;
    if (dir === 'cima') lookAheadAlvo = -CONFIG.lookAheadVerticalTiles * tile;
    if (dir === 'baixo') lookAheadAlvo = CONFIG.lookAheadVerticalTiles * tile;

    const fator = Math.min(1, deltaSegundos * 9);
    this.lookAheadAtualY = Phaser.Math.Linear(this.lookAheadAtualY, lookAheadAlvo, fator);

    const centroY = this.estado.posicao.y * tile + tile / 2 + this.lookAheadAtualY;
    const maxScrollY = Math.max(0, this.fase.altura * tile - cam.height);
    const scrollAlvo = Phaser.Math.Clamp(centroY - cam.height / 2, 0, maxScrollY);

    cam.scrollX = 0;
    cam.scrollY = Math.round(
      Phaser.Math.Linear(cam.scrollY, scrollAlvo, Math.min(1, deltaSegundos * 12)),
    );
  }
}
