/**
 * Importa assets CC0 de terceiros para o jogo, recortados em 16×16 e adaptados à paleta.
 *
 *   npm run importar-assets-cc0 -- <pasta-com-os-downloads>
 *
 * A pasta precisa ter o arquivo original (ver public/assets/cc0/CREDITOS.md):
 *   16x16babies.png  (16x16 Animated Critters, HelplessIsland, CC0)
 *
 * Saída em public/assets/cc0/:
 *   gosma.png  4 quadros 16×16 do slime, recolorido para a rampa "floresta contaminada"
 *
 * O cenário da floresta não usa mais tiles importados: é desenhado por código no
 * estilo limpo (src/game/cenarioFloresta.ts).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hexParaRgb, lerPaletaHex } from '../src/core/paleta';
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
  'Assets CC0 importados em public/assets/cc0/: gosma.png',
);
