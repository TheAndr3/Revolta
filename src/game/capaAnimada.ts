/**
 * Abertura animada (capa e menu): o Protagonista em dash de lado, no centro, correndo
 * pela floresta à noite. As camadas (copas, árvores e ruínas, trilha, capim da frente)
 * deslizam para a esquerda em velocidades diferentes; atrás dele ficam ecos verdes,
 * linhas de velocidade e folhas. Almas azuis sobem, vagalumes piscam; por cima, a logo
 * do Revolta (ver `logoRevolta.ts`).
 *
 * Princípios (docs/design/capa.md): céu calmo e escuro atrás da logo, para ela não
 * competir com nada; um foco só (o Protagonista com a aura); paralaxe em movimento;
 * cores da paleta; pixel art em escala inteira.
 */
import { CONFIG } from '../core/config';
import { CORES_LOGO, montarLogo } from './logoRevolta';
import {
  COLUNAS_ACAO,
  LINHA_OLHAR,
  SPRITES_PROTAGONISTA,
  indiceQuadro,
} from './protagonistaSprites';

const TILE = CONFIG.tamanhoTilePx;

/** Cores da cena (hex de `art/paleta.hex`). */
const COR = {
  noite: '#0d1512',
  sombraMata: '#1a2620',
  verdeProfundo: '#163325',
  verdeCopa: '#234836',
  nevoa: '#8a9a90',
  luz: '#eef4f0',
  totem: '#7dd3fc',
  espirito: '#52e596',
  verdeClaro: '#b5d96a',
  reflexo: '#7cc6b8',
} as const;

/** Altura lógica alvo da cena (a escala inteira se ajusta à tela). */
const ALTURA_LOGICA_ALVO = 250;

/** Velocidade (px lógicos/s) de cada camada: quanto mais perto, mais rápido passa. */
const VEL = { longe: 6, meio: 22, chao: 70, frente: 110 } as const;
/** Período (px) em que meio, chão e frente se repetem ao deslizar. */
const PERIODO = 512;
/** O Protagonista é desenhado em 2× (48 px), como o desenho antigo da capa. */
const ESCALA_PROTAGONISTA = 2;

interface Recursos {
  readonly sprites: HTMLImageElement;
  readonly grama: HTMLImageElement;
  readonly trilha: HTMLImageElement;
  readonly pequenos: HTMLImageElement;
  readonly arvores: readonly HTMLImageElement[];
  readonly arvoresMedias: readonly HTMLImageElement[];
  readonly ruina: HTMLImageElement;
  readonly casas: readonly HTMLImageElement[];
}

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  vidaTotal: number;
  fase: number;
  tamanho: number;
}

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar ${url}`));
    img.src = url;
  });
}

/** Pseudoaleatório determinístico (cenário estável entre quadros e telas). */
function hash(x: number, sal: number): number {
  let h = (x * 374761393 + sal * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}

function criarCanvas(largura: number, altura: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, largura);
  c.height = Math.max(1, altura);
  return c;
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível.');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Escurece um desenho já feito (para as camadas de trás recuarem). */
function escurecer(canvas: HTMLCanvasElement, cor: string, alfa: number): void {
  const ctx = ctx2d(canvas);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = alfa;
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/** Brilho radial reutilizável (uma textura branca, tingida ao desenhar). */
function criarBrilho(cor: string): HTMLCanvasElement {
  const tamanho = 32;
  const c = criarCanvas(tamanho, tamanho);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, cor);
  g.addColorStop(0.4, `${cor}88`);
  g.addColorStop(1, `${cor}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, tamanho, tamanho);
  return c;
}

export interface AberturaAnimada {
  /** Liga (capa/menu visíveis) ou desliga a animação. */
  ativar(ativo: boolean): void;
}

export function criarAberturaAnimada(opcoes: {
  readonly fundo: HTMLCanvasElement;
  readonly logos: readonly HTMLCanvasElement[];
  readonly resolverUrlAsset: (caminho: string) => string;
}): AberturaAnimada {
  const { fundo, logos, resolverUrlAsset } = opcoes;
  const reduzirMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const logo = montarLogo();

  let recursos: Recursos | null = null;
  let ativo = false;
  /** Cada ativação ganha um número; um laço antigo para sozinho ao ver outro número. */
  let geracao = 0;
  let quadro = 0;
  const inicio = performance.now();
  let ultimo = inicio;

  // Camadas pré-desenhadas (refeitas quando a tela muda de tamanho).
  let largura = 0;
  let altura = 0;
  let escala = 1;
  let ceu: HTMLCanvasElement | null = null;
  let copasLonge: HTMLCanvasElement | null = null;
  let meio: HTMLCanvasElement | null = null;
  let chao: HTMLCanvasElement | null = null;
  let frente: HTMLCanvasElement | null = null;
  let cogumelos: { x: number; y: number; fase: number }[] = [];
  /** Quadros do dash de lado e os mesmos pintados de verde (para os ecos). */
  let quadrosDash: HTMLCanvasElement[] = [];
  let ecosDash: HTMLCanvasElement[] = [];
  const rastros: Particula[] = [];
  const folhas: Particula[] = [];
  let protagonista = { x: 0, y: 0 };

  const brilhoAzul = criarBrilho(COR.totem);
  const brilhoVerde = criarBrilho(COR.espirito);
  const brilhoLima = criarBrilho(COR.verdeClaro);

  const almas: Particula[] = [];
  const vagalumes: Particula[] = [];
  const almasLogo: Particula[] = [];

  // Logo: VOLTA fixo pré-desenhado; RE, brilho, folhas e faíscas a cada quadro.
  const voltaFixo = criarCanvas(logo.largura, logo.altura);
  {
    const ctx = ctx2d(voltaFixo);
    for (const p of logo.volta) {
      ctx.fillStyle = p.cor;
      ctx.fillRect(p.x, p.y, 1, 1);
    }
  }
  for (const canvas of logos) {
    canvas.width = logo.largura;
    canvas.height = logo.altura;
  }

  const carregar = async () => {
    const cc0 = (n: string) => resolverUrlAsset(`assets/cc0/${n}`);
    const [sprites, grama, trilha, pequenos, a, b, ma, mb, ruina, ca, cb] = await Promise.all([
      carregarImagem(resolverUrlAsset(SPRITES_PROTAGONISTA.arquivo)),
      carregarImagem(cc0('grama.png')),
      carregarImagem(cc0('trilha.png')),
      carregarImagem(cc0('cenario-pequeno.png')),
      carregarImagem(cc0('cenario/arvore-grande-a.png')),
      carregarImagem(cc0('cenario/arvore-grande-b.png')),
      carregarImagem(cc0('cenario/arvore-media-a.png')),
      carregarImagem(cc0('cenario/arvore-media-b.png')),
      carregarImagem(cc0('cenario/ruina-pedra.png')),
      carregarImagem(cc0('cenario/casa-madeira-a.png')),
      carregarImagem(cc0('cenario/casa-barro.png')),
    ]);
    // Recorta os 2 quadros do dash de lado (e uma versão verde de cada para os ecos).
    const q = SPRITES_PROTAGONISTA.quadroPx;
    quadrosDash = COLUNAS_ACAO.deslize.map((coluna) => {
      const indice = indiceQuadro(LINHA_OLHAR.lado, coluna);
      const c = criarCanvas(q, q);
      ctx2d(c).drawImage(
        sprites,
        (indice % SPRITES_PROTAGONISTA.colunas) * q,
        Math.floor(indice / SPRITES_PROTAGONISTA.colunas) * q,
        q,
        q,
        0,
        0,
        q,
        q,
      );
      return c;
    });
    ecosDash = quadrosDash.map((quadroOriginal) => {
      const c = criarCanvas(q, q);
      const ctx = ctx2d(c);
      ctx.drawImage(quadroOriginal, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = COR.espirito;
      ctx.fillRect(0, 0, q, q);
      return c;
    });
    recursos = {
      sprites,
      grama,
      trilha,
      pequenos,
      arvores: [a, b],
      arvoresMedias: [ma, mb],
      ruina,
      casas: [ca, cb],
    };
    montarCamadas();
  };

  /** Escala inteira para a altura lógica ficar perto do alvo. */
  const medir = () => {
    const w = Math.max(1, fundo.clientWidth || window.innerWidth);
    const h = Math.max(1, fundo.clientHeight || window.innerHeight);
    escala = Math.max(2, Math.round(h / ALTURA_LOGICA_ALVO));
    largura = Math.ceil(w / escala);
    altura = Math.ceil(h / escala);
    fundo.width = largura;
    fundo.height = altura;
    const larguraDisponivel = Math.min(w - 32, 440);
    const escalaLogo = Math.max(2, Math.min(7, Math.floor(larguraDisponivel / logo.largura)));
    for (const canvas of logos) {
      canvas.style.width = `${logo.largura * escalaLogo}px`;
      canvas.style.height = `${logo.altura * escalaLogo}px`;
    }
  };

  // Chão na metade da tela: o Protagonista fica acima dos botões do menu.
  const linhaDoChao = () => Math.round(altura * 0.5);

  const montarCamadas = () => {
    if (!recursos) return;
    medir();
    const r = recursos;
    const chaoY = linhaDoChao();
    const centro = Math.round(largura / 2);

    // Céu: faixas da paleta com transição em pontilhado ordenado (Bayer 4×4), sem
    // degradê liso e sem linhas marcadas entre as faixas.
    ceu = criarCanvas(largura, altura);
    {
      const ctx = ctx2d(ceu);
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const faixas: [number, string][] = [
        [0, COR.noite],
        // A primeira transição fica abaixo da logo: céu liso atrás dela.
        [0.56, COR.sombraMata],
        [0.76, COR.verdeProfundo],
      ];
      const transicao = Math.max(10, Math.round(chaoY * 0.13));
      for (let y = 0; y < chaoY; y++) {
        const t = y / chaoY;
        let i = 0;
        while (i + 1 < faixas.length && t >= faixas[i + 1][0]) i++;
        const proxima = faixas[i + 1];
        const inicioProxima = proxima ? proxima[0] * chaoY : Infinity;
        const progresso = 1 - (inicioProxima - y) / transicao; // 0 → 1 dentro da transição
        for (let x = 0; x < largura; x++) {
          const limite = (bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
          ctx.fillStyle = proxima && progresso > 0 && progresso > limite ? proxima[1] : faixas[i][1];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Copas distantes: silhueta escura contínua, que desliza devagar (repete em x).
    const larguraLonge = largura + 96;
    copasLonge = criarCanvas(larguraLonge, altura);
    {
      const ctx = ctx2d(copasLonge);
      // Duas fileiras: a de trás mais alta e lisa, a da frente mais recortada.
      const base = chaoY - 6;
      const fileiras: [string, number, number, number][] = [
        [COR.sombraMata, 52, 12, 0],
        [COR.noite, 34, 9, 2],
      ];
      for (const [cor, alturaBase, amplitude, sal] of fileiras) {
        ctx.fillStyle = cor;
        for (let x = 0; x < larguraLonge; x++) {
          const u = (x / 96) * Math.PI * 2;
          const h =
            alturaBase +
            Math.round(amplitude * Math.sin(u * 2 + sal) + amplitude * 0.6 * Math.sin(u * 5 + 1 + sal)) +
            // Copas arredondadas: pequenas bossas por cima do contorno.
            Math.round(4 * Math.abs(Math.sin(u * (sal ? 14 : 10) + sal))) +
            Math.round(hash((x % 96) + sal * 97, 1) * 3);
          ctx.fillRect(x, base - h, 1, h + 20);
        }
      }
    }

    // Meio: árvores e ruínas da aldeia, escurecidas, numa faixa que se repete a cada
    // PERIODO px (desenhada com folga para os objetos que passam da borda).
    meio = criarCanvas(largura + PERIODO, altura);
    {
      const ctx = ctx2d(meio);
      const objetos: { img: HTMLImageElement; x: number; y: number }[] = [];
      let x = 0;
      let i = 0;
      while (x < PERIODO) {
        const especial = i % 7 === 3 ? r.ruina : i % 7 === 6 ? r.casas[i % 2] : null;
        const img = especial ?? (i % 3 === 2 ? r.arvoresMedias[i % 2] : r.arvores[i % 2]);
        const y = chaoY - img.height + (especial ? 4 : 8 - Math.round(hash(i * 7, 4) * 6));
        objetos.push({ img, x: Math.round(x - img.width / 2), y });
        x += 34 + Math.round(hash(i, 5) * 16);
        i++;
      }
      for (let k = 0; k * PERIODO < largura + PERIODO * 2; k++) {
        for (const o of objetos) ctx.drawImage(o.img, o.x + k * PERIODO, o.y);
      }
      escurecer(meio, COR.noite, 0.42);
    }

    // Chão: grama escura com a trilha passando de lado (2 tiles de altura), onde o
    // Protagonista corre; arbustos e cogumelos nas beiras. Também se repete em PERIODO.
    chao = criarCanvas(largura + PERIODO, altura);
    cogumelos = [];
    {
      const ctx = ctx2d(chao);
      const linhas = Math.ceil((altura - chaoY) / TILE) + 1;
      const colunas = Math.ceil((largura + PERIODO) / TILE) + 1;
      const colunasPeriodo = PERIODO / TILE;
      for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < colunas; c++) {
          const cp = c % colunasPeriodo;
          const x = c * TILE;
          const y = chaoY + l * TILE;
          const frameGrama = hash(cp * 31 + l, 6) < 0.6 ? 0 : 1 + Math.floor(hash(cp, l + 9) * 3);
          ctx.drawImage(r.grama, frameGrama * TILE, 0, TILE, TILE, x, y, TILE, TILE);
          if (l === 1 || l === 2) {
            // Trilha: leste e oeste sempre abertos; borda de cima e de baixo.
            const mascara = 2 | 8 | (l === 2 ? 1 : 4);
            ctx.drawImage(r.trilha, mascara * TILE, 0, TILE, TILE, x, y, TILE, TILE);
          } else if ((l === 0 || l === 3) && hash(cp, l + 20) < 0.45) {
            if (hash(cp, l + 30) < 0.4) {
              cogumelos.push({ x: x + 8, y: y + 12, fase: hash(cp, l + 40) * Math.PI * 2 });
            } else {
              ctx.drawImage(r.pequenos, (hash(cp, l) < 0.5 ? 0 : 1) * TILE, 0, TILE, TILE, x, y, TILE, TILE);
            }
          } else if (l > 3 && hash(cp, l + 50) < 0.12) {
            ctx.drawImage(r.pequenos, (hash(cp, l + 80) < 0.5 ? 0 : 1) * TILE, 0, TILE, TILE, x, y, TILE, TILE);
          }
        }
      }
      // Arbustos ao longo da linha do horizonte, escondendo o pé das árvores.
      for (let x = -8; x < largura + PERIODO + 8; x += 12 + Math.round(hash(((x % PERIODO) + PERIODO) % PERIODO, 7) * 8)) {
        const u = ((x % PERIODO) + PERIODO) % PERIODO;
        ctx.drawImage(r.pequenos, (hash(u, 8) < 0.5 ? 0 : 1) * TILE, 0, TILE, TILE, x, chaoY - 10, TILE, TILE);
      }
    }

    // Frente: silhuetas de capim nos cantos de baixo (profundidade).
    // (passa rápido, em tufos, e se repete em PERIODO)
    frente = criarCanvas(largura + PERIODO, altura);
    {
      const ctx = ctx2d(frente);
      ctx.fillStyle = COR.noite;
      for (let x = 0; x < largura + PERIODO; x++) {
        const u = x % PERIODO;
        const tufo = Math.max(0, Math.sin((u / PERIODO) * Math.PI * 6));
        if (tufo < 0.2) continue;
        const h = Math.round(4 + tufo * 18 * (0.6 + hash(u, 9) * 0.6));
        ctx.fillRect(x, altura - h, 1, h);
        if (hash(u, 10) < 0.18) ctx.fillRect(x, altura - h - 4, 1, 4); // folha mais alta
      }
    }

    // Centro do dash: o corpo deitado flutua sobre a trilha (linhas 1–2 do chão).
    const lado = SPRITES_PROTAGONISTA.quadroPx * ESCALA_PROTAGONISTA;
    protagonista = { x: centro - lado / 2, y: chaoY + TILE + 4 - lado * (15 / 24) };
  };

  // ------------------------------------------------------------- partículas

  const novaAlma = (inicial: boolean): Particula => {
    const chaoY = linhaDoChao();
    const vidaTotal = 5 + Math.random() * 4;
    return {
      x: Math.random() * largura,
      y: inicial ? Math.random() * chaoY + 20 : chaoY + Math.random() * (altura - chaoY),
      vx: (Math.random() - 0.5) * 2,
      vy: -(4 + Math.random() * 6),
      vida: inicial ? Math.random() * vidaTotal : 0,
      vidaTotal,
      fase: Math.random() * Math.PI * 2,
      tamanho: Math.random() < 0.3 ? 2 : 1,
    };
  };

  const novoVagalume = (): Particula => ({
    x: Math.random() * largura,
    y: linhaDoChao() - 40 + Math.random() * 70,
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() - 0.5) * 2,
    vida: 0,
    vidaTotal: 3 + Math.random() * 4,
    fase: Math.random() * Math.PI * 2,
    tamanho: 1,
  });

  const novaAlmaLogo = (): Particula => {
    const c = logo.caixaRe;
    return {
      x: c.x + Math.random() * c.largura,
      y: c.y + c.altura,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 3 + Math.random() * 3,
      vida: 0,
      vidaTotal: 1.4 + Math.random(),
      fase: Math.random() * Math.PI * 2,
      tamanho: 1,
    };
  };

  const atualizarParticulas = (dt: number) => {
    while (almas.length < Math.round(largura / 6)) almas.push(novaAlma(almas.length < 10 || quadro === 0));
    while (vagalumes.length < Math.round(largura / 14)) vagalumes.push(novoVagalume());
    if (almasLogo.length < 3 && Math.random() < dt * 1.5) almasLogo.push(novaAlmaLogo());

    if (!reduzirMovimento && quadrosDash.length > 0) {
      const lado = SPRITES_PROTAGONISTA.quadroPx * ESCALA_PROTAGONISTA;
      const t = (performance.now() - inicio) / 1000;
      const px = protagonista.x + Math.sin(t * 0.55) * 14;
      if (Math.random() < dt * 22) {
        rastros.push({
          x: px + 2,
          y: protagonista.y + lado * (0.32 + Math.random() * 0.45),
          vx: -(160 + Math.random() * 80),
          vy: 0,
          vida: 0,
          vidaTotal: 0.25 + Math.random() * 0.2,
          fase: 0,
          tamanho: Math.random() < 0.3 ? 2 : 1,
        });
      }
      if (Math.random() < dt * 6) {
        folhas.push({
          x: px + 4,
          y: protagonista.y + lado * (0.3 + Math.random() * 0.3),
          vx: -(50 + Math.random() * 40),
          vy: -6 + Math.random() * 6,
          vida: 0,
          vidaTotal: 0.8 + Math.random() * 0.6,
          fase: Math.random() * Math.PI * 2,
          tamanho: Math.random() < 0.5 ? 2 : 1,
        });
      }
    }
    for (const lista of [rastros, folhas]) {
      for (let i = lista.length - 1; i >= 0; i--) {
        const p = lista[i];
        p.vida += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 18 * dt;
        if (p.vida >= p.vidaTotal) lista.splice(i, 1);
      }
    }

    for (const lista of [almas, vagalumes, almasLogo]) {
      for (let i = lista.length - 1; i >= 0; i--) {
        const p = lista[i];
        p.vida += dt;
        p.fase += dt;
        const vento = lista === almasLogo || reduzirMovimento ? 0 : lista === almas ? -14 : -8;
        p.x += (p.vx + vento + Math.sin(p.fase * 1.7) * 2) * dt;
        if (p.x < -8) p.x += largura + 16;
        p.y += p.vy * dt;
        if (p.vida >= p.vidaTotal) lista.splice(i, 1);
      }
    }
  };

  /** Alfa que nasce e some suave ao longo da vida. */
  const alfaDaVida = (p: Particula) => {
    const t = p.vida / p.vidaTotal;
    return Math.min(1, t * 4, (1 - t) * 3);
  };

  // ------------------------------------------------------------- desenho

  const desenharFundo = (t: number) => {
    if (!recursos || !ceu || !copasLonge || !meio || !chao || !frente) return;
    const ctx = ctx2d(fundo);
    const chaoY = linhaDoChao();
    ctx.drawImage(ceu, 0, 0);

    // Paralaxe em movimento: cada camada desliza para a esquerda na sua velocidade.
    const desloc = (vel: number, periodo: number) => (reduzirMovimento ? 0 : Math.floor((t * vel) % periodo));
    ctx.drawImage(copasLonge, -desloc(VEL.longe, 96), 0);

    // Posição do Protagonista: centro da tela, avançando e recuando devagar (como quem
    // acelera e solta) e subindo e descendo 1–2 px no ar.
    const lado = SPRITES_PROTAGONISTA.quadroPx * ESCALA_PROTAGONISTA;
    const px = Math.round(protagonista.x + (reduzirMovimento ? 0 : Math.sin(t * 0.55) * 14));
    const py = Math.round(protagonista.y + (reduzirMovimento ? 0 : Math.sin(t * 3.1) * 1.5));

    // Aura do espírito atrás do Protagonista: o único foco claro da cena.
    const pulso = reduzirMovimento ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16 + 0.08 * pulso;
    ctx.drawImage(brilhoVerde, px - 40, py - 44, 128, 128);
    ctx.globalAlpha = 0.12 + 0.06 * pulso;
    ctx.drawImage(brilhoAzul, px - 8, py - 6, 64, 64);
    ctx.restore();

    ctx.drawImage(meio, -desloc(VEL.meio, PERIODO), 0);

    // Névoa baixa em duas faixas que se cruzam.
    ctx.save();
    for (const [dy, vel, alfa] of [
      [-6, 3, 0.07],
      [4, -2, 0.05],
    ] as const) {
      const desloc = reduzirMovimento ? 0 : (t * vel) % (largura + 80);
      ctx.globalAlpha = alfa;
      ctx.fillStyle = COR.nevoa;
      for (let k = -1; k <= 1; k++) {
        const x = desloc + k * (largura + 80);
        ctx.beginPath();
        ctx.ellipse(x + largura / 2, chaoY + dy, largura * 0.45, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    const deslocChao = desloc(VEL.chao, PERIODO);
    ctx.drawImage(chao, -deslocChao, 0);

    // Cogumelos que brilham na beira da trilha (passam junto com o chão).
    for (const cogBase of cogumelos) {
      const cog = { ...cogBase, x: cogBase.x - deslocChao };
      if (cog.x < -12 || cog.x > largura + 12) continue;
      const brilho = reduzirMovimento ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.2 + cog.fase);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + 0.25 * brilho;
      ctx.drawImage(brilhoAzul, cog.x - 10, cog.y - 12, 20, 20);
      ctx.restore();
      ctx.fillStyle = COR.nevoa;
      ctx.fillRect(cog.x, cog.y - 1, 1, 3); // pé
      ctx.fillStyle = COR.reflexo;
      ctx.fillRect(cog.x - 2, cog.y - 2, 5, 1); // chapéu
      ctx.fillStyle = COR.totem;
      ctx.fillRect(cog.x - 1, cog.y - 3, 3, 1);
      ctx.fillStyle = COR.luz;
      ctx.fillRect(cog.x, cog.y - 3, 1, 1);
    }

    // Sombra na trilha, embaixo do corpo no ar.
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = COR.noite;
    ctx.beginPath();
    ctx.ellipse(px + lado / 2, chaoY + TILE * 2 + 4, lado * 0.32, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Linhas de velocidade passando por trás.
    for (const r of rastros) {
      const a = alfaDaVida(r);
      ctx.globalAlpha = 0.55 * a;
      ctx.fillStyle = r.tamanho === 2 ? COR.luz : COR.verdeClaro;
      ctx.fillRect(Math.round(r.x), Math.round(r.y), 6 + r.tamanho * 5, 1);
    }
    ctx.globalAlpha = 1;

    // Protagonista em dash de lado, com ecos verdes que ficam para trás.
    if (quadrosDash.length > 0) {
      const iQuadro = reduzirMovimento ? 0 : Math.floor(t * 14) % quadrosDash.length;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 4; k >= 1; k--) {
        ctx.globalAlpha = 0.34 - k * 0.07;
        ctx.drawImage(ecosDash[(iQuadro + k) % ecosDash.length], px - k * 11, py, lado, lado);
      }
      ctx.restore();
      ctx.drawImage(quadrosDash[iQuadro], px, py, lado, lado);
    }

    // Folhas soltas no rastro.
    for (const f of folhas) {
      ctx.globalAlpha = alfaDaVida(f);
      ctx.fillStyle = f.tamanho === 2 ? COR.espirito : COR.verdeClaro;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 1);
    }
    ctx.globalAlpha = 1;

    // Almas subindo: brilho azul e núcleo claro.
    for (const p of almas) {
      const a = alfaDaVida(p);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * a;
      const r = p.tamanho === 2 ? 7 : 5;
      ctx.drawImage(brilhoAzul, Math.round(p.x) - r, Math.round(p.y) - r, r * 2, r * 2);
      ctx.restore();
      ctx.globalAlpha = a;
      ctx.fillStyle = COR.luz;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.tamanho, p.tamanho);
      ctx.globalAlpha = 1;
    }

    // Vagalumes: piscam em lima.
    for (const p of vagalumes) {
      const pisca = Math.max(0, Math.sin(p.fase * 3));
      const a = alfaDaVida(p) * pisca;
      if (a < 0.05) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * a;
      ctx.drawImage(brilhoLima, Math.round(p.x) - 4, Math.round(p.y) - 4, 8, 8);
      ctx.restore();
      ctx.globalAlpha = a;
      ctx.fillStyle = COR.verdeClaro;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      ctx.globalAlpha = 1;
    }

    ctx.drawImage(frente, -desloc(VEL.frente, PERIODO), 0);

    // Vinheta: as bordas escurecem, como a noite fechando.
    const v = ctx.createRadialGradient(
      largura / 2,
      altura * 0.55,
      Math.min(largura, altura) * 0.3,
      largura / 2,
      altura * 0.55,
      Math.max(largura, altura) * 0.75,
    );
    v.addColorStop(0, 'rgba(5,10,14,0)');
    v.addColorStop(1, 'rgba(5,10,14,0.7)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, largura, altura);
  };

  const desenharLogo = (canvas: HTMLCanvasElement, t: number) => {
    const ctx = ctx2d(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(voltaFixo, 0, 0);

    // Folhas do musgo balançando (alternam de lado).
    for (const [i, f] of logo.folhas.entries()) {
      const lado = reduzirMovimento ? 0 : Math.sin(t * 2 + i) > 0.3 ? 1 : 0;
      ctx.fillStyle = i % 2 === 0 ? CORES_LOGO.broto : CORES_LOGO.verdeClaro;
      ctx.fillRect(f.x + lado, f.y, 1, 1);
    }

    // Almas que descem do RE e somem no musgo do VOLTA (o espírito volta à terra).
    for (const p of almasLogo) {
      if (p.y > logo.topoVolta) continue;
      ctx.globalAlpha = alfaDaVida(p);
      ctx.fillStyle = CORES_LOGO.totem;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    ctx.globalAlpha = 1;

    // RE flutuando, com um brilho azul pulsante (desfoque no tamanho lógico, que a
    // escala em pixels deixa em blocos, no espírito da pixel art).
    const flutua = reduzirMovimento ? 0 : Math.round(Math.sin(t * 1.6) * 1);
    const pulso = reduzirMovimento ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.4);
    ctx.save();
    ctx.shadowColor = `rgba(125, 211, 252, ${0.55 + 0.35 * pulso})`;
    ctx.shadowBlur = 3 + 2 * pulso;
    for (const p of logo.re) {
      ctx.fillStyle = p.cor;
      ctx.fillRect(p.x, p.y + flutua, 1, 1);
    }
    ctx.restore();
    for (const p of logo.re) {
      ctx.fillStyle = p.cor;
      ctx.fillRect(p.x, p.y + flutua, 1, 1);
    }

    // Faíscas: uma cruzinha clara que acende acima ou ao lado do RE (nunca na linha de
    // base, para não parecer pontuação).
    if (!reduzirMovimento) {
      const c = logo.caixaRe;
      const passo = Math.floor(t * 3);
      const fase = t * 3 - passo; // 0 → 1 em cada faísca
      if (fase < 0.6) {
        const x = c.x - 1 + Math.floor(hash(passo, 11) * (c.largura + 2));
        const y = c.y - 2 + Math.floor(hash(passo, 21) * Math.ceil(c.altura / 2)) + flutua;
        ctx.fillStyle = CORES_LOGO.luz;
        ctx.fillRect(x, y, 1, 1);
        if (fase > 0.15 && fase < 0.45) {
          ctx.fillStyle = CORES_LOGO.totem;
          ctx.fillRect(x - 1, y, 1, 1);
          ctx.fillRect(x + 1, y, 1, 1);
          ctx.fillRect(x, y - 1, 1, 1);
          ctx.fillRect(x, y + 1, 1, 1);
        }
      }
    }
  };

  const iniciarLaco = () => {
    const minha = ++geracao;
    const laco = (agora: number) => {
      if (!ativo || minha !== geracao) return;
      passo(agora);
      // Com movimento reduzido, fica num quadro parado.
      if (!reduzirMovimento) requestAnimationFrame(laco);
    };
    requestAnimationFrame(laco);
  };

  const passo = (agora: number) => {
    const dt = Math.min(0.05, (agora - ultimo) / 1000);
    ultimo = agora;
    const t = (agora - inicio) / 1000;
    if (!reduzirMovimento) atualizarParticulas(dt);
    else if (quadro === 0) atualizarParticulas(0);
    desenharFundo(t);
    for (const canvas of logos) {
      if (canvas.offsetParent !== null) desenharLogo(canvas, t);
    }
    quadro++;
  };

  const aoRedimensionar = () => {
    if (recursos) montarCamadas();
    else medir();
    almas.length = 0;
    vagalumes.length = 0;
    if (ativo && reduzirMovimento) iniciarLaco();
  };
  window.addEventListener('resize', aoRedimensionar);

  medir();
  const pronto = carregar().catch((erro: unknown) => {
    // A abertura é decorativa: sem os assets, a capa continua funcionando.
    console.warn(erro);
  });

  return {
    ativar(novo: boolean) {
      if (novo === ativo) return;
      ativo = novo;
      fundo.hidden = !novo;
      if (!novo) return;
      ultimo = performance.now();
      void pronto.then(() => {
        if (!ativo) return;
        montarCamadas();
        iniciarLaco();
      });
    },
  };
}

