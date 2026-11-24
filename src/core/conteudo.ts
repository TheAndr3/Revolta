/**
 * Regras do `check-content`: validação pura dos arquivos de conteúdo (Provas e Habitantes).
 * Sem acesso a disco; quem lê os arquivos é o script `scripts/check-content.ts`.
 */
import { TIPO_PROVA_POR_NUMERO, type NumeroProva } from './fase';
import { parseHabitanteMarkdown } from './habitantes';
import { parseProvaMarkdown, type ConteudoProva } from './provas';

/** Limite de palavras do texto de uma Prova ("até ~100 palavras", decisões de design). */
export const LIMITE_PALAVRAS_PROVA = 100;

export function contarPalavras(texto: string): number {
  const palavras = texto.trim().split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p));
  return palavras.length;
}

export interface ResultadoValidacaoConteudo {
  readonly erros: readonly string[];
  /** Caminhos de assets (relativos a `public/`) que o conteúdo referencia. */
  readonly assets: readonly string[];
}

/** Nome esperado do arquivo de uma Prova: `content/provas/<fase>/<N>-<tipo>.md`. */
export function nomeArquivoProva(numero: NumeroProva): string {
  return `${numero}-${TIPO_PROVA_POR_NUMERO[numero]}.md`;
}

export function validarProva(
  markdown: string,
  numero: NumeroProva,
  rotulo: string,
): ResultadoValidacaoConteudo {
  let prova: ConteudoProva;
  try {
    prova = parseProvaMarkdown(markdown, numero);
  } catch (erro) {
    return { erros: [`${rotulo}: ${(erro as Error).message}`], assets: [] };
  }

  const erros: string[] = [];
  const palavras = contarPalavras(prova.texto);
  if (palavras > LIMITE_PALAVRAS_PROVA) {
    erros.push(
      `${rotulo}: o texto tem ${palavras} palavras; o limite é ${LIMITE_PALAVRAS_PROVA}.`,
    );
  }
  return { erros, assets: [prova.ilustracao] };
}

export function validarHabitante(
  markdown: string,
  faseId: string,
  rotulo: string,
): ResultadoValidacaoConteudo {
  try {
    const habitante = parseHabitanteMarkdown(markdown, faseId);
    const erros: string[] = [];
    // A ficha do Arquivo (aba Povo) mostra nome, retrato e uma frase: o campo `papel`.
    if (habitante.papel.trim() === '') {
      erros.push(
        `${rotulo}: campo "papel" ausente no cabeçalho (é a frase da ficha no Arquivo da Resistência).`,
      );
    }
    return { erros, assets: [habitante.retrato] };
  } catch (erro) {
    return { erros: [`${rotulo}: ${(erro as Error).message}`], assets: [] };
  }
}

// ------------------------------------------------------------------ Intro e Sobre

/** Número de quadros da introdução. */
export const TOTAL_QUADROS_INTRO = 7;

export interface QuadroIntro {
  /** Caminho da imagem dentro de `public/`. */
  readonly imagem: string;
  /** Descrição da imagem (texto alternativo e pedido para a issue de arte). */
  readonly descricao: string;
  readonly texto: string;
}

/** Valida e lê `content/intro.json`. Lança erro com mensagem clara se algo faltar. */
export function lerQuadrosIntro(bruto: unknown): QuadroIntro[] {
  const lista = (bruto as { quadros?: unknown } | null)?.quadros;
  if (!Array.isArray(lista)) {
    throw new Error('content/intro.json: esperado um objeto com a lista "quadros".');
  }
  if (lista.length !== TOTAL_QUADROS_INTRO) {
    throw new Error(
      `content/intro.json: a introdução tem ${lista.length} quadro(s); devem ser ${TOTAL_QUADROS_INTRO}.`,
    );
  }
  return lista.map((item, i) => {
    const quadro = (item ?? {}) as Record<string, unknown>;
    const campo = (nome: string): string => {
      const valor = quadro[nome];
      if (typeof valor !== 'string' || valor.trim() === '') {
        throw new Error(`content/intro.json: o quadro ${i + 1} está sem o campo "${nome}".`);
      }
      return valor.trim();
    };
    return { imagem: campo('imagem'), descricao: campo('descricao'), texto: campo('texto') };
  });
}
