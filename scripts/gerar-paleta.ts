/**
 * Gera `art/paleta.png` (amostras) e `art/paleta.gpl` (para Aseprite, GIMP, Krita,
 * Pixelorama) a partir de `art/paleta.hex`, a fonte única da paleta.
 *
 *   npm run gerar-paleta
 *
 * O PNG é escrito à mão (zlib do Node), sem dependências de imagem.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { hexParaRgb, lerPaletaHex } from '../src/core/paleta';

const PASTA = resolve(process.cwd(), 'art');
const COLUNAS = 8;
const LADO_AMOSTRA = 32;

const cores = lerPaletaHex(readFileSync(resolve(PASTA, 'paleta.hex'), 'utf-8'));

// --- PNG ------------------------------------------------------------------

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(dados: Buffer): number {
  let c = 0xffffffff;
  for (const byte of dados) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo: string, dados: Buffer): Buffer {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const tipoEDados = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tipoEDados));
  return Buffer.concat([tamanho, tipoEDados, crc]);
}

const linhas = Math.ceil(cores.length / COLUNAS);
const largura = COLUNAS * LADO_AMOSTRA;
const altura = linhas * LADO_AMOSTRA;
const fundo = hexParaRgb(cores[0].hex);

const bruto = Buffer.alloc(altura * (1 + largura * 3));
for (let y = 0; y < altura; y++) {
  const inicioLinha = y * (1 + largura * 3);
  bruto[inicioLinha] = 0; // filtro "nenhum"
  for (let x = 0; x < largura; x++) {
    const indice = Math.floor(y / LADO_AMOSTRA) * COLUNAS + Math.floor(x / LADO_AMOSTRA);
    const [r, g, b] = indice < cores.length ? hexParaRgb(cores[indice].hex) : fundo;
    const p = inicioLinha + 1 + x * 3;
    bruto[p] = r;
    bruto[p + 1] = g;
    bruto[p + 2] = b;
  }
}

const cabecalho = Buffer.alloc(13);
cabecalho.writeUInt32BE(largura, 0);
cabecalho.writeUInt32BE(altura, 4);
cabecalho[8] = 8; // bits por canal
cabecalho[9] = 2; // RGB
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  bloco('IHDR', cabecalho),
  bloco('IDAT', deflateSync(bruto)),
  bloco('IEND', Buffer.alloc(0)),
]);
writeFileSync(resolve(PASTA, 'paleta.png'), png);

// --- GPL (GIMP Palette, lido por Aseprite, GIMP, Krita e Pixelorama) -------

const gpl = [
  'GIMP Palette',
  'Name: Re(volta)',
  `Columns: ${COLUNAS}`,
  '#',
  ...cores.map((cor) => {
    const [r, g, b] = hexParaRgb(cor.hex);
    const pad = (n: number) => String(n).padStart(3, ' ');
    return `${pad(r)} ${pad(g)} ${pad(b)}\t${cor.nome || cor.hex}`;
  }),
  '',
].join('\n');
writeFileSync(resolve(PASTA, 'paleta.gpl'), gpl);

console.log(
  `Paleta com ${cores.length} cores: art/paleta.png (${largura}×${altura}) e art/paleta.gpl gerados.`,
);
