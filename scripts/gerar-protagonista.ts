/**
 * Gera a spritesheet do Protagonista (`public/assets/protagonista-sprites.png`) a partir
 * de desenhos em texto: cada letra é uma cor de `art/paleta.hex`. Os quadros de pose
 * (parado, deslize, batida) partem de três desenhos-base (frente, costas, lado) e a
 * morte "se desfaz em folhas" é calculada a partir da frente.
 *
 * Uso: npm run gerar-protagonista [-- --previa <arquivo.png>]
 * Com --previa, grava também uma cópia ampliada 8× sobre fundo de trilha, para conferir.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COLUNAS_ACAO,
  LINHA_OLHAR,
  QUADROS_MORTE,
  SPRITES_PROTAGONISTA,
  type Olhar,
} from '../src/game/protagonistaSprites';
import { criarImagem, escreverPng, type ImagemRgba } from './png';
import {
  Q,
  RAIZ,
  argumentoPrevia,
  carregarCores,
  grade,
  hash,
  montarFolha,
  moverFaixa,
  pintar,
  previa,
  tirarColunas,
  tirarLinhas,
  vazia,
  type Grade,
} from './pixelArte';

if (SPRITES_PROTAGONISTA.quadroPx !== Q) throw new Error('Tamanho do quadro diferente de pixelArte.Q.');

/** Letra do desenho → nome da cor em art/paleta.hex. */
const CORES: Record<string, string> = {
  k: 'noite',
  H: 'sombra da mata',
  h: 'pedra',
  S: 'pele média',
  s: 'pele escura',
  L: 'pele clara',
  T: 'água limpa',
  t: 'verde profundo',
  r: 'reflexo',
  B: 'areia',
  b: 'barro',
  P: 'madeira',
  p: 'terra escura',
  G: 'espírito',
  g: 'broto',
  v: 'verde folha',
  c: 'verde claro',
  W: 'luz',
};

// ---------------------------------------------------------------------------------
// Desenhos-base. Luz de cima e da esquerda; contorno em `noite`.
// O broto na cabeça (espírito/broto/verde folha) é o espírito da mata que ele carrega.
// Roupa do dia a dia: camiseta (água limpa), bermuda (madeira), chinelo, bolsa de palha
// a tiracolo (areia). Sem cocar, pintura ou penas (art/representacao.md).

const FRENTE = grade([
  '........................',
  '..........G..g..........',
  '..........GGvgg.........',
  '............v...........',
  '........kkkkvkkk........',
  '.......kHHhhHHHHk.......',
  '......kHhhHHHHHHHk......',
  '......kHhHHHHHHHHk......',
  '......kHHHLHHSHHHk......',
  '......kHLLLLLSSSHk......',
  '......kHLLkSSkSSHk......',
  '......kHLSSSSSssHk......',
  '......kHHsSSSSsHHk......',
  '......kHHksSSskHHk......',
  '......kTrrTTTTBTTk......',
  '.....kSTrTTTTBTTtSk.....',
  '.....kSTTTTTBTTTtSk.....',
  '.....kLTTTTBTTTTtsk.....',
  '......kBBbPPPPPPpk......',
  '......kbbPPPpPPPpk......',
  '.......kLSk..kSsk.......',
  '.......kkkk..kkkk.......',
  '........................',
  '........................',
]);

const COSTAS = grade([
  '........................',
  '..........G..g..........',
  '..........GGvgg.........',
  '............v...........',
  '........kkkkvkkk........',
  '.......kHHhhHHHHk.......',
  '......kHhhHHHHHHHk......',
  '......kHhHHHHHHHHk......',
  '......kHhHHHHHHHHk......',
  '......kHHhHHHHHHHk......',
  '......kHHHHHHHHHHk......',
  '......kHHhHHHHHHHk......',
  '......kHHHHHHHHHHk......',
  '......kkHHHHHHHHkk......',
  '......kTrHHHHHHTTk......',
  '.....kSTrkHHHHkTtSk.....',
  '.....kSTTTkHHkBTtSk.....',
  '.....kLTTTTkkTTBtsk.....',
  '......kPPPPPPpBBbk......',
  '......kPPPpPPPpbbk......',
  '.......kLSk..kSsk.......',
  '.......kkkk..kkkk.......',
  '........................',
  '........................',
]);

const LADO = grade([
  '........................',
  '...........G..g.........',
  '...........GGvgg........',
  '.............v..........',
  '.........kkkkvkk........',
  '........kHHhhHHHk.......',
  '.......kHhhHHHHHHk......',
  '.......kHhHHHHHLLk......',
  '.......kHHHHHHLLLk......',
  '.......kHHHHHLLkLk......',
  '.......kHHHHHSLLLLk.....',
  '.......kHHHHHSSSSk......',
  '.......kHHHHHkssk.......',
  '.......kHHHHHkSk........',
  '........kHHkTTTTk.......',
  '........kHHkrTTBk.......',
  '.........kkTLSBTk.......',
  '.........ktTLSTtk.......',
  '.........kPPLsPpk.......',
  '.........kPPPPPpk.......',
  '..........kSk.kSk.......',
  '..........kkk.kkkk......',
  '........................',
  '........................',
]);

// ---------------------------------------------------------------------------------
// Quadros derivados.

/** Respiração: cabeça e broto descem 1 px. */
const respirar = (g: Grade) => moverFaixa(g, 0, 13, 1);

/** O broto balança: as pontas das folhas trocam de lugar. */
function balancarBroto(g: Grade, x0: number): Grade {
  return pintar(g, [
    [x0, 1, '.'],
    [x0 + 3, 1, '.'],
    [x0 - 1, 2, 'G'],
    [x0 + 4, 1, 'g'],
  ]);
}

/** Piscar: os olhos (noite sobre a pele, linhas 9–10) viram pele escura. */
function piscar(g: Grade): Grade {
  return g.map((l, y) =>
    l.map((c, x) => (y >= 9 && y <= 10 && c === 'k' && 'LSs'.includes(l[x - 1] ?? '') && 'LSs'.includes(l[x + 1] ?? '') ? 's' : c)),
  );
}

function parado(base: Grade, x0Broto: number, pisca: boolean): Grade[] {
  return [base, respirar(base), balancarBroto(respirar(base), x0Broto), pisca ? piscar(base) : balancarBroto(base, x0Broto)];
}

/** Broto deitado para trás pelo vento (ao deslizar para baixo, as folhas sobem e abrem). */
function brotoAoVento(g: Grade, x0: number, para: 'cima' | 'baixo'): Grade {
  let r = pintar(g, [
    [x0, 1, '.'],
    [x0 + 3, 1, '.'],
    [x0, 2, '.'],
    [x0 + 1, 2, '.'],
    [x0 + 3, 2, '.'],
    [x0 + 4, 2, '.'],
  ]);
  if (para === 'cima') {
    r = pintar(r, [
      [x0 + 1, 2, 'G'],
      [x0, 1, 'G'],
      [x0 - 1, 0, 'G'],
      [x0 + 3, 2, 'g'],
      [x0 + 4, 1, 'g'],
      [x0 + 5, 0, 'g'],
    ]);
  } else {
    r = pintar(r, [
      [x0 + 1, 3, 'G'],
      [x0, 3, 'G'],
      [x0 - 1, 3, 'G'],
      [x0 + 3, 3, 'g'],
      [x0 + 4, 3, 'g'],
      [x0 + 5, 3, 'g'],
      [x0 + 2, 2, 'v'],
    ]);
  }
  return r;
}

/** Deslizando para baixo: braços abertos como quem voa, cabelo e broto abertos pelo vento. */
function deslizeFrente(alt: boolean): Grade {
  let g = brotoAoVento(FRENTE, 10, 'cima');
  // tira os braços caídos (vira contorno do tronco)
  g = pintar(g, [
    [5, 15, '.'], [6, 15, 'k'], [5, 16, '.'], [6, 16, 'k'], [5, 17, '.'], [6, 17, 'k'],
    [18, 15, '.'], [17, 15, 'k'], [18, 16, '.'], [17, 16, 'k'], [18, 17, '.'], [17, 17, 'k'],
  ]);
  // braços abertos na altura dos ombros
  const y = alt ? 13 : 14;
  g = pintar(g, [
    [2, y, 'k'], [3, y, 'k'], [4, y, 'k'], [5, y, 'k'],
    [2, y + 1, 'k'], [3, y + 1, 'L'], [4, y + 1, 'S'], [5, y + 1, 'T'], [6, y + 1, 'T'],
    [2, y + 2, 'k'], [3, y + 2, 'k'], [4, y + 2, 'k'], [5, y + 2, 'k'],
    [18, y, 'k'], [19, y, 'k'], [20, y, 'k'], [21, y, 'k'],
    [17, y + 1, 'T'], [18, y + 1, 't'], [19, y + 1, 'S'], [20, y + 1, 's'], [21, y + 1, 'k'],
    [18, y + 2, 'k'], [19, y + 2, 'k'], [20, y + 2, 'k'], [21, y + 2, 'k'],
  ]);
  // pontas do cabelo abertas
  g = pintar(g, alt ? [[6, 6, '.'], [5, 7, 'k'], [17, 6, '.'], [18, 7, 'k']] : [[5, 6, 'k'], [18, 6, 'k']]);
  return g;
}

/** Deslizando para cima: cabelo escorre para baixo, broto deitado. */
function deslizeCostas(alt: boolean): Grade {
  let g = brotoAoVento(COSTAS, 10, 'baixo');
  g = pintar(g, [
    [9, 16, 'k'], [10, 16, 'H'], [11, 16, 'H'], [12, 16, 'H'], [13, 16, 'H'], [14, 16, 'k'],
    [10, 17, 'k'], [11, 17, 'H'], [12, 17, 'H'], [13, 17, 'k'],
    [11, 18, alt ? 'k' : 'H'], [12, 18, 'k'],
  ]);
  // braços colados ao corpo, para trás
  g = pintar(g, [[5, 15, '.'], [5, 16, '.'], [5, 17, '.'], [18, 15, '.'], [18, 16, '.'], [18, 17, '.'],
    [6, 15, 'k'], [6, 16, 'k'], [6, 17, 'k'], [17, 15, 'k'], [17, 16, 'k'], [17, 17, 'k']]);
  return g;
}

/**
 * Deslizando para a direita: voa deitado, cabeça erguida olhando para a frente, cabelo
 * e broto para trás, braço esticado à frente e linhas de velocidade atrás.
 */
const DESLIZE_LADO = grade([
  '........................',
  '........................',
  '........................',
  '........................',
  '..............GGG.......',
  '................Gvgg....',
  '..................v.....',
  '..............kkkkkkk...',
  '.........kkkkkHHhhHHHk..',
  '......kkkHHHHHhhHHHHHHk.',
  '....kkHHHHHHHHhHHHHHLLk.',
  '......kkHHHHHHHHHHHLLLk.',
  '........kkkHHHHHHHLLkLk.',
  '...........kkHHHHHSLLLLk',
  '............kHHHHHSSSSk.',
  '.........kkkkHHHHHkssk..',
  '.....kkkkrrTTBTTTTkSk...',
  '.kkkkPPPkTTTBTTTLSSSk...',
  'kLSSkPPPptTBbTTttkk.....',
  'kkkk.kkkkkkkkkkkkk......',
  '........................',
  '........................',
  '........................',
  '........................',
]);

function deslizeLado(alt: boolean): Grade {
  const linhas: Array<readonly [number, number, string]> = alt
    ? [[0, 11, 'c'], [1, 11, 'W'], [2, 11, 'c'], [0, 14, 'c'], [1, 14, 'c'], [2, 16, 'c'], [3, 16, 'c'],
      [4, 10, '.'], [5, 10, '.'], [6, 10, 'k'], [14, 4, '.'], [13, 5, 'G']]
    : [[0, 10, 'c'], [1, 10, 'c'], [0, 13, 'W'], [1, 13, 'c'], [2, 13, 'c'], [1, 15, 'c'], [2, 15, 'c']];
  return pintar(DESLIZE_LADO, linhas);
}

/** Batida: achata contra a parede e aperta os olhos. */
function batidaFrente(): Grade {
  let g = tirarLinhas(FRENTE, [12, 16]);
  // olhos apertados: as linhas 12 e 16 saem e tudo acima delas desce 2 px (olhos: 10 → 12)
  return pintar(g, [[9, 12, 'k'], [10, 12, 'k'], [13, 12, 'k'], [14, 12, 'k']]);
}

function batidaCostas(): Grade {
  return tirarLinhas(COSTAS, [10, 16]);
}

function batidaLado(): Grade {
  // tira duas colunas do meio da cabeça e do corpo: o rosto fica colado na parede
  const g = tirarColunas(LADO, [10, 12]);
  // olho apertado
  return pintar(g, [[15, 9, 'k'], [14, 9, 'k']]);
}

// ---------------------------------------------------------------------------------
// Morte: o corpo vira luz, depois folhas e faíscas que se espalham e somem.

function morte(): Grade[] {
  const opacos: Array<[number, number]> = [];
  for (let y = 0; y < Q; y++) for (let x = 0; x < Q; x++) if (FRENTE[y][x] !== '.') opacos.push([x, y]);

  const silhueta = (cor: (x: number, y: number) => string) => {
    const g = vazia();
    for (const [x, y] of opacos) g[y][x] = cor(x, y);
    return g;
  };

  const quadros: Grade[] = [];
  // 0: clarão
  quadros.push(silhueta(() => 'W'));
  // 1: o corpo vira espírito (contorno some, miolo verde)
  quadros.push(silhueta((x, y) => (FRENTE[y][x] === 'k' ? 'g' : hash(x, y, 1) < 0.25 ? 'c' : 'G')));
  // 2–5: espalha
  const etapas = [
    { fica: 0.62, alcance: 2, sobe: 1 },
    { fica: 0.36, alcance: 4, sobe: 2 },
    { fica: 0.18, alcance: 6, sobe: 4 },
    { fica: 0.06, alcance: 8, sobe: 6 },
  ];
  etapas.forEach(({ fica, alcance, sobe }, i) => {
    const g = vazia();
    for (const [x, y] of opacos) {
      if (hash(x, y, 7) > fica) continue;
      const dx = Math.round((hash(x, y, 11 + i) * 2 - 1) * alcance);
      const dy = Math.round((hash(x, y, 23 + i) * 2 - 1) * alcance * 0.6) - sobe;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= Q || ny < 0 || ny >= Q) continue;
      const sorte = hash(x, y, 31 + i);
      g[ny][nx] = sorte < 0.35 ? 'G' : sorte < 0.6 ? 'c' : sorte < 0.85 ? 'g' : 'W';
    }
    quadros.push(g);
  });
  // 6: vazio
  quadros.push(vazia());
  if (quadros.length !== QUADROS_MORTE) throw new Error('Número de quadros da morte mudou.');
  return quadros;
}

// ---------------------------------------------------------------------------------
// Montagem da folha.

const linhasPorOlhar: Record<Olhar, Grade[]> = {
  frente: [...parado(FRENTE, 10, true), deslizeFrente(false), deslizeFrente(true), batidaFrente()],
  costas: [...parado(COSTAS, 10, false), deslizeCostas(false), deslizeCostas(true), batidaCostas()],
  lado: [...parado(LADO, 11, true), deslizeLado(false), deslizeLado(true), batidaLado()],
};

function montar(): ImagemRgba {
  const linhas: Grade[][] = [];
  for (const [olhar, quadros] of Object.entries(linhasPorOlhar) as Array<[Olhar, Grade[]]>) {
    const esperado = COLUNAS_ACAO.parado.length + COLUNAS_ACAO.deslize.length + COLUNAS_ACAO.batida.length;
    if (quadros.length !== esperado) throw new Error(`${olhar}: ${quadros.length} quadros; esperado ${esperado}.`);
    linhas[LINHA_OLHAR[olhar]] = quadros;
  }
  linhas.push(morte());
  if (linhas.length !== SPRITES_PROTAGONISTA.linhas) throw new Error('Número de linhas da folha mudou.');
  return montarFolha(linhas, SPRITES_PROTAGONISTA.colunas, carregarCores(CORES));
}

/** Um quadro da folha ampliado `zoom`× (pixel inteiro), para a capa. */
function quadroAmpliado(folha: ImagemRgba, indice: number, zoom: number): ImagemRgba {
  const out = criarImagem(Q * zoom, Q * zoom);
  const qx = (indice % SPRITES_PROTAGONISTA.colunas) * Q;
  const qy = Math.floor(indice / SPRITES_PROTAGONISTA.colunas) * Q;
  for (let y = 0; y < out.altura; y++) {
    for (let x = 0; x < out.largura; x++) {
      const i = ((qy + Math.floor(y / zoom)) * folha.largura + qx + Math.floor(x / zoom)) * 4;
      out.dados.set(folha.dados.subarray(i, i + 4), (y * out.largura + x) * 4);
    }
  }
  return out;
}

const folha = montar();
const destino = resolve(RAIZ, 'public', SPRITES_PROTAGONISTA.arquivo);
writeFileSync(destino, escreverPng(folha));
console.log(`gerar-protagonista: ${folha.largura}×${folha.altura} → ${destino}`);

// A capa (src/game/capaAnimada.ts) desenha o Protagonista parado de frente em 48×48.
const destinoCapa = resolve(RAIZ, 'public/assets/protagonista.png');
writeFileSync(destinoCapa, escreverPng(quadroAmpliado(folha, 0, 2)));
console.log(`capa: 48×48 → ${destinoCapa}`);

const arquivoPrevia = argumentoPrevia();
if (arquivoPrevia) {
  writeFileSync(arquivoPrevia, escreverPng(previa(folha, 8)));
  console.log(`prévia 8× → ${arquivoPrevia}`);
}
