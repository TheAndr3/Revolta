/**
 * Gera os ícones do site a partir da logo em pixel art (`src/game/logoRevolta.ts`): o
 * "RE" azul, com um brilho de 1 px em volta, sobre o fundo escuro da capa, em escala
 * inteira (pixels nítidos em qualquer tamanho).
 *
 * Saída em public/: favicon-32.png (aba), apple-touch-icon.png (180) e icon-512.png.
 * Uso: npm run gerar-favicon
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { montarLogo } from '../src/game/logoRevolta';
import { criarImagem, escreverPng } from './png';
import { RAIZ } from './pixelArte';

const FUNDO = [0x0d, 0x15, 0x12] as const; // noite
const BRILHO = [0x7d, 0xd3, 0xfc] as const; // Totem (azul do RE)

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const logo = montarLogo();
const pixels = logo.re;
const minX = Math.min(...pixels.map((p) => p.x));
const minY = Math.min(...pixels.map((p) => p.y));
const larguraRe = Math.max(...pixels.map((p) => p.x)) - minX + 1;
const alturaRe = Math.max(...pixels.map((p) => p.y)) - minY + 1;

function icone(tamanho: number, margemFracao: number): Buffer {
  const img = criarImagem(tamanho, tamanho);
  // Fundo escuro com cantos arredondados (o raio some nos tamanhos pequenos).
  const raio = Math.round(tamanho * 0.18);
  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const dx = Math.max(raio - x, 0, x - (tamanho - 1 - raio));
      const dy = Math.max(raio - y, 0, y - (tamanho - 1 - raio));
      if (dx * dx + dy * dy > raio * raio) continue;
      img.dados.set([...FUNDO, 255], (y * tamanho + x) * 4);
    }
  }
  // Escala inteira que cabe com margem, centralizada (+2 px para o brilho).
  const util = tamanho * (1 - margemFracao * 2);
  const escala = Math.max(1, Math.floor(util / (Math.max(larguraRe, alturaRe) + 2)));
  const ox = Math.floor((tamanho - larguraRe * escala) / 2);
  const oy = Math.floor((tamanho - alturaRe * escala) / 2);
  const pintar = (px: number, py: number, cor: readonly number[], alfa: number) => {
    for (let y = 0; y < escala; y++) {
      for (let x = 0; x < escala; x++) {
        const X = ox + px * escala + x;
        const Y = oy + py * escala + y;
        if (X < 0 || Y < 0 || X >= tamanho || Y >= tamanho) continue;
        const i = (Y * tamanho + X) * 4;
        for (let c = 0; c < 3; c++) img.dados[i + c] = Math.round(img.dados[i + c] * (1 - alfa) + cor[c] * alfa);
        img.dados[i + 3] = 255;
      }
    }
  };
  // Brilho: 1 pixel da logo em volta de cada letra, em azul fraco.
  const ocupado = new Set(pixels.map((p) => `${p.x - minX},${p.y - minY}`));
  const halo = new Set<string>();
  for (const p of pixels) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${p.x - minX + dx},${p.y - minY + dy}`;
      if (!ocupado.has(k)) halo.add(k);
    }
  }
  for (const k of halo) {
    const [x, y] = k.split(',').map(Number);
    pintar(x, y, BRILHO, 0.3);
  }
  for (const p of pixels) pintar(p.x - minX, p.y - minY, rgb(p.cor), 1);
  return escreverPng(img);
}

for (const [arquivo, tamanho, margem] of [
  ['favicon-32.png', 32, 0.06],
  ['apple-touch-icon.png', 180, 0.14],
  ['icon-512.png', 512, 0.16],
] as const) {
  writeFileSync(resolve(RAIZ, 'public', arquivo), icone(tamanho, margem));
  console.log(`gerar-favicon: ${arquivo} (${tamanho}×${tamanho})`);
}
