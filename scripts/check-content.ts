/**
 * check-content: valida os arquivos de conteúdo antes do deploy.
 *
 *   npm run check-content
 *
 * Para cada Fase do catálogo (`content/fases.json`) confere:
 * - as 3 Provas existem em `content/provas/<conteudo>/<N>-<tipo>.md`, com cabeçalho
 *   completo e texto de até LIMITE_PALAVRAS_PROVA palavras;
 * - cada Habitante (`H` no mapa) tem `content/habitantes/<conteudo>/<N>.md` com nome,
 *   retrato, papel e fala (N = 1, 2, 3 na ordem de leitura do grid);
 * - a introdução (`content/intro.json`) tem 7 quadros com imagem, descrição e texto;
 * - o Sobre (`content/sobre.md`) tem título e a lista de fontes;
 * - as ilustrações, retratos e quadros citados existem em `public/`.
 * Sai com código 1 se encontrar algum problema.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFase } from '../src/core/parser';
import { lerCatalogoFases } from '../src/core/progresso';
import { lerMarkdownSimples } from '../src/core/markdownSimples';
import {
  LIMITE_PALAVRAS_PROVA,
  lerQuadrosIntro,
  nomeArquivoProva,
  validarHabitante,
  validarProva,
} from '../src/core/conteudo';

const RAIZ = process.cwd();
const erros: string[] = [];
const assets = new Map<string, string>(); // asset → quem referencia

function ler(caminhoRelativo: string): string | null {
  const absoluto = resolve(RAIZ, caminhoRelativo);
  if (!existsSync(absoluto)) {
    erros.push(`${caminhoRelativo}: arquivo não encontrado.`);
    return null;
  }
  return readFileSync(absoluto, 'utf-8');
}

const catalogo = lerCatalogoFases(JSON.parse(readFileSync(resolve(RAIZ, 'content/fases.json'), 'utf-8')));
const conteudosVistos = new Set<string>();
let arquivosVerificados = 0;

for (const entrada of catalogo) {
  // Várias Fases podem apontar para o mesmo conteúdo (placeholders): valida uma vez só.
  if (conteudosVistos.has(entrada.conteudo)) continue;
  conteudosVistos.add(entrada.conteudo);

  for (const numero of [1, 2, 3] as const) {
    const caminho = `content/provas/${entrada.conteudo}/${nomeArquivoProva(numero)}`;
    const markdown = ler(caminho);
    if (markdown === null) continue;
    arquivosVerificados += 1;
    const resultado = validarProva(markdown, numero, caminho);
    erros.push(...resultado.erros);
    resultado.assets.forEach((asset) => assets.set(asset, caminho));
  }

  // Um arquivo por `H` do mapa da Fase.
  const mapa = ler(`public/${entrada.mapa}`);
  const totalHabitantes = mapa === null ? 0 : parseFase(mapa).habitantes.length;
  for (let numero = 1; numero <= totalHabitantes; numero++) {
    const caminhoHabitante = `content/habitantes/${entrada.conteudo}/${numero}.md`;
    const markdownHabitante = ler(caminhoHabitante);
    if (markdownHabitante === null) continue;
    arquivosVerificados += 1;
    const resultado = validarHabitante(markdownHabitante, entrada.conteudo, caminhoHabitante);
    erros.push(...resultado.erros);
    resultado.assets.forEach((asset) => assets.set(asset, caminhoHabitante));
  }
}

const introBruta = ler('content/intro.json');
if (introBruta !== null) {
  arquivosVerificados += 1;
  try {
    for (const quadro of lerQuadrosIntro(JSON.parse(introBruta))) {
      assets.set(quadro.imagem, 'content/intro.json');
    }
  } catch (erro) {
    erros.push((erro as Error).message);
  }
}

const sobre = ler('content/sobre.md');
if (sobre !== null) {
  arquivosVerificados += 1;
  const documento = lerMarkdownSimples(sobre);
  if (!documento.cabecalho.get('titulo')) {
    erros.push('content/sobre.md: campo "titulo" ausente no cabeçalho.');
  }
  if (!documento.blocos.some((bloco) => bloco.tipo === 'lista')) {
    erros.push('content/sobre.md: falta a lista de fontes (linhas "- [Nome](https://...)").');
  }
}

for (const [asset, origem] of assets) {
  if (/^https?:/.test(asset)) continue;
  if (!existsSync(resolve(RAIZ, 'public', asset))) {
    erros.push(`${origem}: o asset "${asset}" não existe em public/.`);
  }
}

if (erros.length > 0) {
  console.log(`check-content: ${erros.length} problema(s) encontrado(s):\n`);
  for (const erro of erros) console.log(`  ✘ ${erro}`);
  process.exit(1);
}

console.log(
  `check-content: ${arquivosVerificados} arquivo(s) de conteúdo ok (Provas com até ${LIMITE_PALAVRAS_PROVA} palavras, ${assets.size} asset(s) encontrados).`,
);
