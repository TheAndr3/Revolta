/**
 * Importa assets CC0 de terceiros para o jogo, recortados em 16×16 e adaptados à paleta.
 *
 *   npm run importar-assets-cc0 -- <pasta-com-os-downloads>
 *
 * A pasta precisa ter os arquivos originais (ver public/assets/cc0/CREDITOS.md):
 *   tileset_floor.png, tileset_village_abandoned.png  (Ninja Adventure, pixel-boy, CC0)
 *   16x16babies.png                                     (16x16 Animated Critters, HelplessIsland, CC0)
 *
 * Saída em public/assets/cc0/:
 *   trilha.png          16 quadros 16×16: trilha de terra por máscara de vizinhos (cenarioFloresta.ts)
 *   grama.png           4 quadros 16×16: grama sob a floresta
 *   cenario-pequeno.png quadros 16×16: arbustos, tocos e pedras
 *   cenario/<chave>.png objetos grandes: árvores, ruínas e casas da aldeia abandonada
 *   gosma.png           4 quadros 16×16 do slime, recolorido para a rampa "floresta contaminada"
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hexParaRgb, lerPaletaHex } from '../src/core/paleta';
import {
  GRAMA,
  OBJETOS_GRANDES,
  OBJETOS_PEQUENOS,
  TRILHA_POR_MASCARA,
} from '../src/game/cenarioFloresta';
import { copiar, criarImagem, escreverPng, lerPng, type ImagemRgba } from './png';

const TILE = 16;
const [pastaDownloads] = process.argv.slice(2);
if (!pastaDownloads) {
  console.error('Uso: npm run importar-assets-cc0 -- <pasta-com-os-downloads>');
  process.exit(1);
}

const RAIZ = process.cwd();
const SAIDA = resolve(RAIZ, 'public/assets/cc0');
mkdirSync(SAIDA, { recursive: true });

const paleta = lerPaletaHex(readFileSync(resolve(RAIZ, 'art/paleta.hex'), 'utf-8'));
const coresPaleta = paleta.map((c) => ({ ...c, rgb: hexParaRgb(c.hex) }));
const rgbPorNome = (nome: string) => {
  const cor = coresPaleta.find((c) => c.nome === nome);
  if (!cor) throw new Error(`Cor "${nome}" não está em art/paleta.hex.`);
  return cor.rgb;
};

const abrir = (nome: string) => lerPng(readFileSync(resolve(pastaDownloads, nome)));


/** Recolore pela luminância numa rampa de cores da paleta (escuro → claro). */
function recolorirPorRampa(img: ImagemRgba, rampa: readonly string[]): void {
  const cores = rampa.map(rgbPorNome);
  const luminancia = (i: number) =>
    0.299 * img.dados[i] + 0.587 * img.dados[i + 1] + 0.114 * img.dados[i + 2];
  // A rampa inteira é usada entre o pixel mais escuro e o mais claro da imagem.
  let min = 255;
  let max = 0;
  for (let i = 0; i < img.dados.length; i += 4) {
    if (img.dados[i + 3] === 0) continue;
    min = Math.min(min, luminancia(i));
    max = Math.max(max, luminancia(i));
  }
  for (let i = 0; i < img.dados.length; i += 4) {
    if (img.dados[i + 3] === 0) continue;
    const t = max > min ? (luminancia(i) - min) / (max - min) : 1;
    const indice = Math.min(cores.length - 1, Math.floor(t * cores.length));
    img.dados.set([...cores[indice], 255], i);
  }
}

/** Torna transparente a cor de fundo (a do canto superior esquerdo de cada recorte). */
function removerFundo(img: ImagemRgba): void {
  const fundo = img.dados.slice(0, 3);
  for (let i = 0; i < img.dados.length; i += 4) {
    if (img.dados[i] === fundo[0] && img.dados[i + 1] === fundo[1] && img.dados[i + 2] === fundo[2]) {
      img.dados[i + 3] = 0;
    }
  }
}

function recortar(origem: ImagemRgba, col: number, lin: number): ImagemRgba {
  const tile = criarImagem(TILE, TILE);
  copiar(origem, col * TILE, lin * TILE, TILE, TILE, tile, 0, 0);
  return tile;
}

function montarFolha(quadros: readonly ImagemRgba[]): ImagemRgba {
  const folha = criarImagem(quadros.length * TILE, TILE);
  quadros.forEach((q, i) => copiar(q, 0, 0, TILE, TILE, folha, i * TILE, 0));
  return folha;
}

// --- Cenário da floresta: trilha, grama e objetos -------------------------------
const chao = abrir('tileset_floor.png');
const vila = abrir('tileset_village_abandoned.png');

/*
 * Floresta à noite (referências: noite azul com bioluminescência + selva escura
 * com sombras roxas e contorno verde-lima). Cada camada tem uma rampa por família
 * de cor do original:
 *   verde  → folhagem: quase preta, com contorno lima/teal só no topo
 *   quente → madeira, troncos, terra: sombras arroxeadas (óleo, fumaça)
 *   frio   → pedra: cinza-azulado de luz de lua
 * Hierarquia: a mata recua (escura); a trilha é o valor médio, legível;
 * Almas, cogumelos e vagalumes brilham por cima (desenhados no jogo).
 */
interface RampasCamada {
  readonly verde: readonly string[];
  readonly quente: readonly string[];
  readonly frio: readonly string[];
}
const CAMADAS: Record<'grama' | 'trilha' | 'arvore' | 'arbusto' | 'construcao', RampasCamada> = {
  grama: {
    verde: ['noite', 'noite', 'sombra da mata'],
    quente: ['noite', 'terra escura'],
    frio: ['noite', 'sombra da mata'],
  },
  trilha: {
    verde: ['sombra da mata', 'verde copa', 'broto'],
    quente: ['óleo', 'fumaça', 'fumaça'],
    frio: ['pedra', 'névoa'],
  },
  arvore: {
    verde: ['noite', 'sombra da mata', 'verde profundo', 'verde copa'],
    quente: ['noite', 'terra escura', 'óleo', 'fumaça'],
    frio: ['noite', 'pedra'],
  },
  arbusto: {
    verde: ['noite', 'sombra da mata', 'verde profundo', 'verde copa'],
    quente: ['noite', 'terra escura', 'óleo'],
    frio: ['noite', 'sombra da mata'],
  },
  construcao: {
    verde: ['sombra da mata', 'verde profundo', 'verde copa'],
    quente: ['noite', 'terra escura', 'óleo', 'fumaça'],
    frio: ['noite', 'sombra da mata', 'pedra', 'água limpa'],
  },
};

type Familia = keyof RampasCamada;
const luminancia = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
function familiaDaCor(r: number, g: number, b: number): Familia {
  if (g > r * 1.05 && g > b * 1.15) return 'verde';
  return r > b + 8 ? 'quente' : 'frio';
}

/** Distribuição de luminância de cada família de cor nos dois tilesets (para os cortes). */
function distribuicoes(imagens: readonly ImagemRgba[]): Record<Familia, number[]> {
  const dist: Record<Familia, number[]> = { verde: [], quente: [], frio: [] };
  for (const img of imagens) {
    for (let i = 0; i < img.dados.length; i += 4) {
      const [r, g, b, a] = [img.dados[i], img.dados[i + 1], img.dados[i + 2], img.dados[i + 3]];
      if (a > 0) dist[familiaDaCor(r, g, b)].push(luminancia(r, g, b));
    }
  }
  for (const lista of Object.values(dist)) lista.sort((x, y) => x - y);
  return dist;
}
const DISTRIBUICOES = distribuicoes([chao, vila]);
function percentil(familia: Familia, lum: number): number {
  const lista = DISTRIBUICOES[familia];
  let lo = 0;
  let hi = lista.length;
  while (lo < hi) {
    const meio = (lo + hi) >> 1;
    if (lista[meio] < lum) lo = meio + 1;
    else hi = meio;
  }
  return lo / Math.max(1, lista.length);
}

/** Devolve a máscara de pixels de folhagem (família verde), para a luz de contorno. */
function remapearNoturno(img: ImagemRgba, camada: RampasCamada): boolean[] {
  const folhagem: boolean[] = new Array(img.largura * img.altura).fill(false);
  const rampas = {
    verde: camada.verde.map(rgbPorNome),
    quente: camada.quente.map(rgbPorNome),
    frio: camada.frio.map(rgbPorNome),
  };
  for (let i = 0; i < img.dados.length; i += 4) {
    if (img.dados[i + 3] === 0) continue;
    const [r, g, b] = [img.dados[i], img.dados[i + 1], img.dados[i + 2]];
    const familia = familiaDaCor(r, g, b);
    folhagem[i / 4] = familia === 'verde';
    const rampa = rampas[familia];
    const indice = Math.min(rampa.length - 1, Math.floor(percentil(familia, luminancia(r, g, b)) * rampa.length));
    img.dados.set([...rampa[indice], 255], i);
  }
  return folhagem;
}

/**
 * Luz de contorno no topo da folhagem (como luar batendo nas copas): o primeiro
 * pixel de folha logo abaixo de um vazio ou de um contorno escuro vira lima, e o
 * seguinte, verde médio.
 */
function aplicarLuzDeContorno(img: ImagemRgba, folhagem: readonly boolean[]): void {
  const noite = rgbPorNome('noite');
  const [lima, medio] = [rgbPorNome('broto'), rgbPorNome('verde folha')];
  const ehEscuroOuVazio = (x: number, y: number) => {
    if (y < 0) return true;
    const i = (y * img.largura + x) * 4;
    return (
      img.dados[i + 3] === 0 ||
      (img.dados[i] === noite[0] && img.dados[i + 1] === noite[1] && img.dados[i + 2] === noite[2])
    );
  };
  const alvos: [number, readonly number[]][] = [];
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      const p = y * img.largura + x;
      if (!folhagem[p] || ehEscuroOuVazio(x, y)) continue;
      if (ehEscuroOuVazio(x, y - 1)) {
        alvos.push([p, lima]);
        if (y + 1 < img.altura && folhagem[p + img.largura]) alvos.push([p + img.largura, medio]);
      }
    }
  }
  for (const [p, cor] of alvos) img.dados.set([...cor, 255], p * 4);
}

const recortarArea = (
  origem: ImagemRgba,
  col: number,
  lin: number,
  w: number,
  h: number,
  camada: RampasCamada,
  luzDeContorno = false,
) => {
  const img = criarImagem(w * TILE, h * TILE);
  copiar(origem, col * TILE, lin * TILE, w * TILE, h * TILE, img, 0, 0);
  const folhagem = remapearNoturno(img, camada);
  if (luzDeContorno) aplicarLuzDeContorno(img, folhagem);
  return img;
};

const trilha = TRILHA_POR_MASCARA.map(([c, l]) => recortarArea(chao, c, l, 1, 1, CAMADAS.trilha));
writeFileSync(resolve(SAIDA, 'trilha.png'), escreverPng(montarFolha(trilha)));

const grama = GRAMA.map(([c, l]) => recortarArea(chao, c, l, 1, 1, CAMADAS.grama));
writeFileSync(resolve(SAIDA, 'grama.png'), escreverPng(montarFolha(grama)));

// Os dois primeiros pequenos são arbustos; o resto (tocos, pedras) leva musgo.
const pequenos = OBJETOS_PEQUENOS.map(({ origem: [c, l] }, i) =>
  i < 2
    ? recortarArea(vila, c, l, 1, 1, CAMADAS.arbusto, true)
    : recortarArea(vila, c, l, 1, 1, CAMADAS.construcao),
);
writeFileSync(resolve(SAIDA, 'cenario-pequeno.png'), escreverPng(montarFolha(pequenos)));

mkdirSync(resolve(SAIDA, 'cenario'), { recursive: true });
for (const obj of OBJETOS_GRANDES) {
  const [c, l] = obj.origem;
  const ehArvore = obj.chave.startsWith('arvore');
  const camada = ehArvore ? CAMADAS.arvore : CAMADAS.construcao;
  const img = recortarArea(vila, c, l, obj.largura, obj.altura, camada, ehArvore);
  writeFileSync(resolve(SAIDA, 'cenario', `${obj.chave}.png`), escreverPng(img));
}

// --- Gosma Tóxica: slime de frente, 4 quadros, recolorido ----------------------
const criaturas = abrir('16x16babies.png');
const gosma = [0, 1, 2, 3].map((i) => {
  const quadro = recortar(criaturas, 12 + i, 0);
  removerFundo(quadro);
  recolorirPorRampa(quadro, ['noite', 'lodo', 'verde doente', 'gosma', 'gosma acesa']);
  return quadro;
});
writeFileSync(resolve(SAIDA, 'gosma.png'), escreverPng(montarFolha(gosma)));


console.log(
  'Assets CC0 importados em public/assets/cc0/: trilha.png, grama.png, cenario-pequeno.png, cenario/*.png, gosma.png',
);
