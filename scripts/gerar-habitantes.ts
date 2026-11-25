/**
 * Gera a spritesheet dos Habitantes (`public/assets/habitantes-sprites.png`) a partir de
 * desenhos em texto (cada letra é uma cor de `art/paleta.hex`; ver scripts/pixelArte.ts).
 *
 * Mesmas proporções e contorno do Protagonista: são gente da mesma aldeia. Cada um tem
 * silhueta própria (boné, coque e cesto, criança) e veste roupa do dia a dia, sem cocar,
 * pintura ou penas (art/representacao.md). Quadros: medo ×4 (tremendo e com os olhos
 * procurando) e alívio ×2 (um pulinho, olhos fechados de alívio, faíscas do espírito).
 *
 * Uso: npm run gerar-habitantes [-- --previa <arquivo.png>]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  APARENCIAS_HABITANTE,
  COLUNAS_HABITANTE,
  SPRITES_HABITANTES,
  type AparenciaHabitante,
} from '../src/game/habitantesSprites';
import { escreverPng } from './png';
import {
  Q,
  RAIZ,
  argumentoPrevia,
  carregarCores,
  grade,
  montarFolha,
  pintar,
  previa,
  type Grade,
} from './pixelArte';

if (SPRITES_HABITANTES.quadroPx !== Q) throw new Error('Tamanho do quadro diferente de pixelArte.Q.');

const CORES: Record<string, string> = {
  k: 'noite',
  H: 'sombra da mata',
  h: 'pedra',
  n: 'névoa',
  W: 'luz',
  S: 'pele média',
  s: 'pele escura',
  L: 'pele clara',
  p: 'terra escura',
  P: 'madeira',
  b: 'barro',
  B: 'areia',
  T: 'água limpa',
  t: 'verde profundo',
  r: 'reflexo',
  g: 'broto',
  v: 'verde folha',
  G: 'espírito',
};

interface Desenho {
  readonly base: Grade;
  /** Linha dos olhos (pares "Wk": branco do olho e pupila). */
  readonly linhaOlhos: number;
  /** Cor da pele no rosto, para fechar os olhos no alívio. */
  readonly pele: string;
}

// Agente de saúde: boné, camisa branca, mãos juntas no peito.
const AGENTE: Desenho = {
  linhaOlhos: 9,
  pele: 'L',
  base: grade([
    '........................',
    '........................',
    '........................',
    '........................',
    '........kkkkkkkk........',
    '.......kTrrTTTTTk.......',
    '......kTrTTTTTTTTk......',
    '......kttttttttttk......',
    '......kHLLLLLLLLHk......',
    '......kHLWkLLWkLHk......',
    '......kHLLLLLLSSHk......',
    '......kHLSSkkSSsHk......',
    '......kHHsSSSSsHHk......',
    '......kHHksSSskHHk......',
    '......kWWWWWWWWnnk......',
    '.....kWWWWkLLkWWnnk.....',
    '.....kWWWkLLSSkWnnk.....',
    '.....kWWWWWWWWWWnnk.....',
    '......kPPPPPPPPPpk......',
    '......kPPPpkkPPPpk......',
    '.......kLSk..kSsk.......',
    '.......kkkk..kkkk.......',
    '........................',
    '........................',
  ]),
};

// Avó que cuida da roça: coque grisalho, vestido verde de bolinhas, cesto de sementes.
const AVO: Desenho = {
  linhaOlhos: 9,
  pele: 's',
  base: grade([
    '........................',
    '........................',
    '..........kkkk..........',
    '.........knWnhk.........',
    '........kkknhkkk........',
    '.......knWnnhnnnk.......',
    '......knWnnnhnnnnk......',
    '......knnsssssssnk......',
    '......knssssssssnk......',
    '......knsWkssWkpnk......',
    '......knssssssppnk......',
    '......knspskkpppnk......',
    '......kkkpsssspkkk......',
    '........kkpsspkk........',
    '......kvvvvvvvvvtk......',
    '.....kvgvvkssskvttk.....',
    '.....kvvvkBbBbBkvtk.....',
    '.....kvgvkbBbBbkttk.....',
    '......kvvkkkkkkkvtk.....',
    '......kvgvvvvvgvttk.....',
    '......kkvvvvvvvvtkk.....',
    '.......kkk....kkk.......',
    '........................',
    '........................',
  ]),
};

// Menino do igarapé: criança (menor), camiseta verde, braços cruzados de medo.
const MENINO: Desenho = {
  linhaOlhos: 11,
  pele: 'S',
  base: grade([
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '.........kkkkkk.........',
    '........kHHhHHHk........',
    '.......kHhHHHHHHk.......',
    '.......kHLLLSSSHk.......',
    '.......kLWkSSWkSk.......',
    '.......kSSSkkSSsk.......',
    '........kSSSSSsk........',
    '.........kksskk.........',
    '........kgggggvk........',
    '.......kSgLLLLgvSk......',
    '.......kSggggggvsk......',
    '........kTTTTTTtk.......',
    '........kTTtkTTtk.......',
    '.........kSk.kSk........',
    '.........kkk.kkk........',
    '........................',
    '........................',
  ]),
};

// Pescador do igarapé de cima: chapéu de palha (areia/barro), camisa azul-água, pele média.
// Mesmo corpo da agente de saúde, com outras cores e chapéu: é outro morador da aldeia.
const TROCA_PESCADOR: Record<string, string> = { T: 'B', r: 'B', t: 'b', W: 'r', n: 'T', L: 'S', S: 's', s: 'p' };
const PESCADOR: Desenho = {
  linhaOlhos: AGENTE.linhaOlhos,
  pele: 'S',
  base: AGENTE.base.map((l, y) =>
    // os olhos (branco "W" + pupila) ficam como estão
    l.map((c) => (y === AGENTE.linhaOlhos && c === 'W' ? c : (TROCA_PESCADOR[c] ?? c))),
  ),
};

const DESENHOS: Record<AparenciaHabitante, Desenho> = { agente: AGENTE, avo: AVO, menino: MENINO, pescador: PESCADOR };

/** Desloca o quadro inteiro (o que sair da borda some). */
function deslocar(g: Grade, dx: number, dy: number): Grade {
  const r: Grade = g.map((l) => l.map(() => '.'));
  for (let y = 0; y < Q; y++) {
    for (let x = 0; x < Q; x++) {
      const nx = x + dx;
      const ny = y + dy;
      if (g[y][x] !== '.' && nx >= 0 && nx < Q && ny >= 0 && ny < Q) r[ny][nx] = g[y][x];
    }
  }
  return r;
}

/** Olhos para o outro lado: cada "Wk" (branco e pupila) vira "kW". */
function olharParaOOutroLado(g: Grade, linha: number): Grade {
  const r = g.map((l) => [...l]);
  for (let x = 0; x < Q - 1; x++) {
    if (g[linha][x] === 'W' && g[linha][x + 1] === 'k') {
      r[linha][x] = 'k';
      r[linha][x + 1] = 'W';
    }
  }
  return r;
}

/** Olhos fechados de alívio: o branco vira pele e a pupila vira um traço. */
function olhosFechados(g: Grade, linha: number, pele: string): Grade {
  const r = g.map((l) => [...l]);
  for (let x = 0; x < Q - 1; x++) {
    if (g[linha][x] === 'W' && g[linha][x + 1] === 'k') {
      r[linha][x] = 'k';
      r[linha][x + 1] = pele;
      r[linha - 1][x] = g[linha - 1][x] === '.' ? '.' : pele;
    }
  }
  return r;
}

function quadros({ base, linhaOlhos, pele }: Desenho): Grade[] {
  const olhandoOutroLado = olharParaOOutroLado(base, linhaOlhos);
  // Gota de suor (reflexo) ao lado da cabeça nos quadros em que treme para o lado.
  const suor = (g: Grade, x: number) => pintar(g, [[x, linhaOlhos - 2, 'r'], [x, linhaOlhos - 1, 'r']]);
  const medo = [
    base,
    suor(deslocar(olhandoOutroLado, 1, 0), 19),
    olhandoOutroLado,
    suor(deslocar(base, -1, 0), 4),
  ];
  const aliviado = olhosFechados(base, linhaOlhos, pele);
  const alivio = [
    pintar(deslocar(aliviado, 0, -2), [[4, 6, 'G'], [19, 5, 'G'], [3, 12, 'g'], [20, 11, 'G']]),
    pintar(deslocar(aliviado, 0, -1), [[5, 4, 'g'], [18, 3, 'G'], [4, 10, 'G'], [19, 9, 'g']]),
  ];
  const todos = [...medo, ...alivio];
  const esperado = COLUNAS_HABITANTE.medo.length + COLUNAS_HABITANTE.alivio.length;
  if (todos.length !== esperado) throw new Error(`Habitante: ${todos.length} quadros; esperado ${esperado}.`);
  return todos;
}

const folha = montarFolha(
  APARENCIAS_HABITANTE.map((aparencia) => quadros(DESENHOS[aparencia])),
  SPRITES_HABITANTES.colunas,
  carregarCores(CORES),
);
if (folha.altura !== SPRITES_HABITANTES.linhas * Q) throw new Error('Número de linhas da folha mudou.');

const destino = resolve(RAIZ, 'public', SPRITES_HABITANTES.arquivo);
writeFileSync(destino, escreverPng(folha));
console.log(`gerar-habitantes: ${folha.largura}×${folha.altura} → ${destino}`);

const arquivoPrevia = argumentoPrevia();
if (arquivoPrevia) {
  writeFileSync(arquivoPrevia, escreverPng(previa(folha, 8)));
  console.log(`prévia 8× → ${arquivoPrevia}`);
}
