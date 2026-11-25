/**
 * Gera as spritesheets do Drone Desmatador e do Guarda Florestal a partir de desenhos em
 * texto (cada letra é uma cor de `art/paleta.hex`; ver scripts/pixelArte.ts).
 *
 * - Drone: visto de cima, frente (serra) para cima; 4 quadros com as hélices girando.
 * - Guarda: 3/4, frente/costas/lado; andar ×4 e parado ×2 em cada um.
 *
 * Uso: npm run gerar-ameacas [-- --previa <arquivo.png>]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SPRITES_DRONE, SPRITES_GUARDA, COLUNAS_GUARDA } from '../src/game/ameacasSprites';
import { criarImagem, copiar, escreverPng } from './png';
import {
  Q,
  RAIZ,
  argumentoPrevia,
  carregarCores,
  clonar,
  grade,
  montarFolha,
  pintar,
  previa,
  type Grade,
  type Ponto,
} from './pixelArte';

if (SPRITES_DRONE.quadroPx !== Q || SPRITES_GUARDA.quadroPx !== Q) {
  throw new Error('Tamanho do quadro diferente de pixelArte.Q.');
}

/** Letra do desenho → nome da cor em art/paleta.hex. */
const CORES: Record<string, string> = {
  k: 'noite',
  h: 'pedra',
  n: 'névoa',
  W: 'luz',
  M: 'metal',
  U: 'azul uniforme',
  R: 'vermelho máquina',
  O: 'laranja alerta',
  Y: 'amarelo sinal',
  u: 'óleo',
  L: 'pele clara',
  S: 'pele média',
};

// ---------------------------------------------------------------------------------
// Drone Desmatador. Corpo vermelho de máquina, braços de metal em X, 4 motores, serra
// circular na frente e um sensor amarelo que é o "olho". As hélices são desenhadas por
// quadro, girando 45° (a pá tem duas pontas, então 4 quadros fecham a volta).

const DRONE = grade([
  '........................',
  '........................',
  '..........kkkk..........',
  '.........kMMMMk.........',
  '...kkk...kMhhMk...kkk...',
  '...khk...kMhhMk...khk...',
  '...kkMk...kkkk...kMkk...',
  '.....kMk...hh...kMk.....',
  '......kMkkkkkkkkMk......',
  '.......kkOORRRRkk.......',
  '.......kORRYYRRuk.......',
  '.......kRRkYYkRuk.......',
  '.......kRRRRRRRuk.......',
  '.......kRRRRRRuuk.......',
  '.......kkuuuuuukk.......',
  '......kMkkkkkkkkMk......',
  '.....kMk........kMk.....',
  '...kkMk..........kMkk...',
  '...khk............khk...',
  '...kkk............kkk...',
  '........................',
  '........................',
  '........................',
  '........................',
]);

const MOTORES: ReadonlyArray<readonly [number, number]> = [
  [4, 5],
  [19, 5],
  [4, 18],
  [19, 18],
];

/** Brilho da serra dando a volta no disco, um ponto por quadro. */
const BRILHO_SERRA: ReadonlyArray<readonly [number, number]> = [
  [10, 3],
  [13, 3],
  [13, 5],
  [10, 5],
];

/** Pontos do disco de cada hélice (raio 3 em volta do motor), com o ângulo de cada um. */
const DISCO: ReadonlyArray<readonly [number, number, number]> = (() => {
  const pontos = new Map<string, readonly [number, number, number]>();
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const dx = Math.round(Math.cos(a) * 3);
    const dy = Math.round(Math.sin(a) * 3);
    pontos.set(`${dx},${dy}`, [dx, dy, a]);
  }
  return [...pontos.values()];
})();

/**
 * Quadro `quadro` das hélices: o disco inteiro aparece escuro (borrão da hélice) e a pá,
 * de duas pontas, clareia o trecho do disco no ângulo do quadro (45° por quadro).
 */
function quadroDrone(quadro: number): Grade {
  const g = clonar(DRONE);
  const anguloPa = (quadro * Math.PI) / 4;
  for (const [cx, cy] of MOTORES) {
    for (const [dx, dy, a] of DISCO) {
      const x = cx + dx;
      const y = cy + dy;
      if (g[y]?.[x] !== '.') continue; // não pinta por cima do corpo nem dos braços
      const diferenca = Math.abs(Math.atan2(Math.sin(a - anguloPa), Math.cos(a - anguloPa)));
      const naPa = diferenca < 0.45 || Math.PI - diferenca < 0.45;
      g[y][x] = naPa ? 'W' : 'h';
    }
    // haste da pá, do motor até o disco
    for (const sinal of [1, -1]) {
      const x = cx + Math.round(Math.cos(anguloPa) * 2 * sinal);
      const y = cy + Math.round(Math.sin(anguloPa) * 2 * sinal);
      if (g[y]?.[x] === '.') g[y][x] = 'n';
    }
  }
  const [bx, by] = BRILHO_SERRA[quadro % BRILHO_SERRA.length];
  g[by][bx] = 'W';
  return g;
}

// ---------------------------------------------------------------------------------
// Guarda Florestal. Agente da empresa reconhecido pelo que veste e faz: capacete de
// metal, uniforme azul com faixa refletiva amarela, lanterna na mão. Ombros largos e
// cabeça sem cabelo comprido, para a silhueta ser diferente da do Protagonista.

const GUARDA_FRENTE = grade([
  '........................',
  '........................',
  '........................',
  '..........kkkk..........',
  '........kkMWMMkk........',
  '.......kMWMMMMMMk.......',
  '.......kMMMMMMMhk.......',
  '......kkkkkkkkkkkk......',
  '.......kLLLLLLSSk.......',
  '.......kLkLLLLkSk.......',
  '.......kLLLLLSSSk.......',
  '........kLLSSSSk........',
  '.......kkkSSSSkkk.......',
  '.....kkMUUUUUUUUMkk.....',
  '.....kMUUUUUUUUUUhk.....',
  '.....kUYYYYYYYYYYUk.....',
  '.....kLUUUUUUUUUUSk.....',
  '.....kLkUUUUUUUUkMk.....',
  '......kkhhhhhhhhkYk.....',
  '.......khhhkkhhhk.......',
  '.......khhk..khhk.......',
  '.......kkkk..kkkk.......',
  '........................',
  '........................',
]);

const GUARDA_COSTAS = grade([
  '........................',
  '........................',
  '........................',
  '..........kkkk..........',
  '........kkMWMMkk........',
  '.......kMWMMMMMMk.......',
  '.......kMMMMMMMhk.......',
  '......kkkkkkkkkkkk......',
  '.......kMMMMMMMhk.......',
  '.......khMMMMMhhk.......',
  '.......kkSSSSSSkk.......',
  '........kSSSSSSk........',
  '.......kkkkkkkkkk.......',
  '.....kkMUUUUUUUUMkk.....',
  '.....kMUUUUUUUUUUhk.....',
  '.....kUYYYYYYYYYYUk.....',
  '.....kSUUUUUUUUUUSk.....',
  '.....kMkUUUUUUUUkSk.....',
  '.....kYkhhhhhhhhkk......',
  '.......khhhkkhhhk.......',
  '.......khhk..khhk.......',
  '.......kkkk..kkkk.......',
  '........................',
  '........................',
]);

const GUARDA_LADO = grade([
  '........................',
  '........................',
  '........................',
  '..........kkkk..........',
  '........kkMWMMkk........',
  '.......kMWMMMMMMk.......',
  '.......kMMMMMMMhkk......',
  '.......kkkkkkkkkkkk.....',
  '........khLLLLLk........',
  '........khLLLkLk........',
  '........kLLLLLLLk.......',
  '.........kLLLSSk........',
  '.........kkSSkk.........',
  '........kkMUUUMkk.......',
  '........kMUUUUUhk.......',
  '........kUYYYYYUk.......',
  '........kUUUUUUUk.......',
  '........kUUkLMMMYk......',
  '........kkhhhhhhk.......',
  '.........khhhhhk........',
  '.........khk.khk........',
  '.........kkk.kkkk.......',
  '........................',
  '........................',
]);

/**
 * Passada (frente e costas): o corpo sobe 1 px e uma perna sai do chão; a outra fica
 * plantada. `perna` são as colunas da perna que fica no chão.
 */
function passada(base: Grade, pernaNoChao: readonly [number, number]): Grade {
  const r: Grade = base.map(() => Array<string>(Q).fill('.'));
  for (let y = 1; y < Q; y++) for (let x = 0; x < Q; x++) r[y - 1][x] = base[y][x];
  // a perna plantada continua tocando o chão (linhas 19–21 como no desenho base)
  for (let y = 19; y <= 21; y++) {
    for (let x = pernaNoChao[0]; x <= pernaNoChao[1]; x++) r[y][x] = base[y][x];
  }
  return r;
}

/** Braços balançando: a mão de um lado sobe 1 px (vira manga) e a do outro desce. */
function balancarBracos(g: Grade, maoQueSobe: 'esquerda' | 'direita'): Grade {
  const [xSobe, xDesce] = maoQueSobe === 'esquerda' ? [6, 17] : [17, 6];
  const r = clonar(g);
  // sobe: a mão (linha 16–17) vira manga na 17 e a mão vai para a 16
  r[17][xSobe] = 'U';
  r[16][xSobe] = g[16][xSobe] === 'U' ? 'L' : g[16][xSobe];
  // desce: a mão aparece 1 px mais baixa
  if (g[18][xDesce] !== 'Y') r[18][xDesce] = g[17][xDesce] === 'k' ? 'L' : g[17][xDesce];
  return r;
}

function andarFrenteCostas(base: Grade): Grade[] {
  return [
    base,
    balancarBracos(passada(base, [13, 16]), 'esquerda'),
    base,
    balancarBracos(passada(base, [7, 10]), 'direita'),
  ];
}

/** Passada de lado: as pernas se juntam embaixo do corpo e o corpo sobe 1 px. */
function passadaLado(base: Grade, alt: boolean): Grade {
  const r: Grade = base.map(() => Array<string>(Q).fill('.'));
  for (let y = 1; y < 19; y++) for (let x = 0; x < Q; x++) r[y - 1][x] = base[y][x];
  const pernas: Ponto[] = [
    [10, 18, 'k'], [11, 18, 'h'], [12, 18, 'h'], [13, 18, 'h'], [14, 18, 'k'],
    [10, 19, 'k'], [11, 19, alt ? 'k' : 'h'], [12, 19, 'h'], [13, 19, alt ? 'h' : 'k'], [14, 19, 'k'],
    [10, 20, 'k'], [11, 20, 'h'], [12, 20, alt ? 'k' : 'h'], [13, 20, 'h'], [14, 20, 'k'],
    [10, 21, 'k'], [11, 21, 'k'], [12, 21, 'k'], [13, 21, 'k'], [14, 21, 'k'], [15, 21, 'k'],
  ];
  return pintar(r, pernas);
}

function andarLado(base: Grade): Grade[] {
  // contato com as pernas trocadas: a da frente vira a de trás
  const trocada = pintar(base, [
    [9, 20, '.'], [10, 20, 'k'], [11, 20, 'h'], [12, 20, 'k'],
    [9, 21, '.'], [10, 21, 'k'], [11, 21, 'k'], [12, 21, 'k'], [13, 21, 'k'],
    [13, 20, 'k'], [14, 20, 'h'], [15, 20, 'k'], [16, 21, '.'],
  ]);
  return [base, passadaLado(base, false), trocada, passadaLado(base, true)];
}

/** Parado na ponta do trilho: a lanterna pisca e o olhar vai para o lado. */
function paradoFrente(base: Grade): Grade[] {
  return [base, pintar(base, [[9, 9, 'L'], [10, 9, 'k'], [14, 9, 'L'], [15, 9, 'k'], [17, 18, 'W']])];
}
function paradoCostas(base: Grade): Grade[] {
  return [base, pintar(base, [[6, 18, 'W'], [11, 4, 'M'], [12, 4, 'W']])];
}
function paradoLado(base: Grade): Grade[] {
  return [base, pintar(base, [[16, 17, 'W'], [13, 9, 'L'], [12, 9, 'k']])];
}

// ---------------------------------------------------------------------------------

const cores = carregarCores(CORES);

const drone = montarFolha(
  [Array.from({ length: SPRITES_DRONE.quadrosHelice }, (_, i) => quadroDrone(i))],
  SPRITES_DRONE.colunas,
  cores,
);

const linhasGuarda: Grade[][] = [
  [...andarFrenteCostas(GUARDA_FRENTE), ...paradoFrente(GUARDA_FRENTE)],
  [...andarFrenteCostas(GUARDA_COSTAS), ...paradoCostas(GUARDA_COSTAS)],
  [...andarLado(GUARDA_LADO), ...paradoLado(GUARDA_LADO)],
];
const quadrosPorLinha = COLUNAS_GUARDA.andar.length + COLUNAS_GUARDA.parado.length;
for (const linha of linhasGuarda) {
  if (linha.length !== quadrosPorLinha) throw new Error(`Guarda: ${linha.length} quadros; esperado ${quadrosPorLinha}.`);
}
const guarda = montarFolha(linhasGuarda, SPRITES_GUARDA.colunas, cores);

for (const [nome, folha, arquivo] of [
  ['drone', drone, SPRITES_DRONE.arquivo],
  ['guarda', guarda, SPRITES_GUARDA.arquivo],
] as const) {
  const destino = resolve(RAIZ, 'public', arquivo);
  writeFileSync(destino, escreverPng(folha));
  console.log(`gerar-ameacas: ${nome} ${folha.largura}×${folha.altura} → ${destino}`);
}

const arquivoPrevia = argumentoPrevia();
if (arquivoPrevia) {
  // drone em cima, guarda embaixo, numa folha só
  const junta = criarImagem(Math.max(drone.largura, guarda.largura), drone.altura + guarda.altura);
  copiar(drone, 0, 0, drone.largura, drone.altura, junta, 0, 0);
  copiar(guarda, 0, 0, guarda.largura, guarda.altura, junta, 0, drone.altura);
  writeFileSync(arquivoPrevia, escreverPng(previa(junta, 8)));
  console.log(`prévia 8× → ${arquivoPrevia}`);
}
