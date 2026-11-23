/**
 * check-content: valida os arquivos de conteúdo antes do deploy.
 *
 *   npm run check-content
 *
 * Para cada Fase do catálogo (`content/fases.json`) confere:
 * - as 3 Provas existem em `content/provas/<conteudo>/<N>-<tipo>.md`, com cabeçalho
 *   completo e texto de até LIMITE_PALAVRAS_PROVA palavras;
 * - o Habitante em `content/habitantes/<conteudo>.md` tem nome, retrato, papel e fala;
 * - as ilustrações e retratos citados existem em `public/`.
 * Sai com código 1 se encontrar algum problema.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerCatalogoFases } from '../src/core/progresso';
import {
  LIMITE_PALAVRAS_PROVA,
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

  const caminhoHabitante = `content/habitantes/${entrada.conteudo}.md`;
  const markdownHabitante = ler(caminhoHabitante);
  if (markdownHabitante !== null) {
    arquivosVerificados += 1;
    const resultado = validarHabitante(markdownHabitante, entrada.conteudo, caminhoHabitante);
    erros.push(...resultado.erros);
    resultado.assets.forEach((asset) => assets.set(asset, caminhoHabitante));
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
