/**
 * Leitura e escrita mínimas de PNG RGBA (8 bits, sem entrelaçamento), só com o zlib do Node.
 * Usado pelos scripts de assets (recorte de tiles e remapeamento para a paleta).
 */
import { deflateSync, inflateSync } from 'node:zlib';

export interface ImagemRgba {
  readonly largura: number;
  readonly altura: number;
  /** RGBA, 4 bytes por pixel, linha a linha. */
  readonly dados: Uint8Array;
}

const ASSINATURA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function lerPng(arquivo: Buffer): ImagemRgba {
  if (!arquivo.subarray(0, 8).equals(ASSINATURA)) throw new Error('Não é um PNG.');
  let pos = 8;
  let largura = 0;
  let altura = 0;
  let tipoCor = 0;
  let profundidade = 0;
  let paleta: Buffer | null = null;
  let transparencia: Buffer | null = null;
  const blocosIdat: Buffer[] = [];

  while (pos < arquivo.length) {
    const tamanho = arquivo.readUInt32BE(pos);
    const tipo = arquivo.toString('ascii', pos + 4, pos + 8);
    const dados = arquivo.subarray(pos + 8, pos + 8 + tamanho);
    if (tipo === 'IHDR') {
      largura = dados.readUInt32BE(0);
      altura = dados.readUInt32BE(4);
      profundidade = dados[8];
      tipoCor = dados[9];
      if (dados[12] !== 0) throw new Error('PNG entrelaçado não suportado.');
    } else if (tipo === 'PLTE') paleta = dados;
    else if (tipo === 'tRNS') transparencia = dados;
    else if (tipo === 'IDAT') blocosIdat.push(dados);
    pos += 12 + tamanho;
  }
  if (profundidade !== 8) throw new Error(`Profundidade ${profundidade} não suportada.`);

  const canais = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[tipoCor];
  if (!canais) throw new Error(`Tipo de cor ${tipoCor} não suportado.`);
  const bruto = inflateSync(Buffer.concat(blocosIdat));
  const passo = largura * canais;
  const linhas = new Uint8Array(altura * passo);

  for (let y = 0; y < altura; y++) {
    const filtro = bruto[y * (passo + 1)];
    for (let x = 0; x < passo; x++) {
      const valor = bruto[y * (passo + 1) + 1 + x];
      const a = x >= canais ? linhas[y * passo + x - canais] : 0;
      const b = y > 0 ? linhas[(y - 1) * passo + x] : 0;
      const c = x >= canais && y > 0 ? linhas[(y - 1) * passo + x - canais] : 0;
      let previsto = 0;
      if (filtro === 1) previsto = a;
      else if (filtro === 2) previsto = b;
      else if (filtro === 3) previsto = (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        previsto = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      linhas[y * passo + x] = (valor + previsto) & 0xff;
    }
  }

  const dados = new Uint8Array(largura * altura * 4);
  for (let i = 0; i < largura * altura; i++) {
    const o = i * canais;
    let r = 0, g = 0, b = 0, a = 255;
    if (tipoCor === 6) [r, g, b, a] = [linhas[o], linhas[o + 1], linhas[o + 2], linhas[o + 3]];
    else if (tipoCor === 2) [r, g, b] = [linhas[o], linhas[o + 1], linhas[o + 2]];
    else if (tipoCor === 0) r = g = b = linhas[o];
    else if (tipoCor === 4) { r = g = b = linhas[o]; a = linhas[o + 1]; }
    else if (tipoCor === 3 && paleta) {
      const indice = linhas[o];
      [r, g, b] = [paleta[indice * 3], paleta[indice * 3 + 1], paleta[indice * 3 + 2]];
      a = transparencia && indice < transparencia.length ? transparencia[indice] : 255;
    }
    dados.set([r, g, b, a], i * 4);
  }
  return { largura, altura, dados };
}

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
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

export function escreverPng(imagem: ImagemRgba): Buffer {
  const { largura, altura, dados } = imagem;
  const bruto = Buffer.alloc(altura * (1 + largura * 4));
  for (let y = 0; y < altura; y++) {
    bruto[y * (1 + largura * 4)] = 0;
    Buffer.from(dados.buffer, dados.byteOffset + y * largura * 4, largura * 4).copy(
      bruto,
      y * (1 + largura * 4) + 1,
    );
  }
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho[8] = 8;
  cabecalho[9] = 6; // RGBA
  return Buffer.concat([
    ASSINATURA,
    bloco('IHDR', cabecalho),
    bloco('IDAT', deflateSync(bruto)),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

export function criarImagem(largura: number, altura: number): ImagemRgba {
  return { largura, altura, dados: new Uint8Array(largura * altura * 4) };
}

/** Copia um retângulo de `origem` para `destino`. */
export function copiar(
  origem: ImagemRgba,
  ox: number,
  oy: number,
  largura: number,
  altura: number,
  destino: ImagemRgba,
  dx: number,
  dy: number,
): void {
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const de = ((oy + y) * origem.largura + ox + x) * 4;
      const para = ((dy + y) * destino.largura + dx + x) * 4;
      destino.dados.set(origem.dados.subarray(de, de + 4), para);
    }
  }
}
