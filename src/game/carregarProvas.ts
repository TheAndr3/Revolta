import { TIPO_PROVA_POR_NUMERO, type NumeroProva } from '../core/fase';
import { parseProvaMarkdown, type ConteudoProva } from '../core/provas';

const ARQUIVOS_PROVA_RAW = import.meta.glob('../../content/provas/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export type MapaConteudoProvas = Record<NumeroProva, ConteudoProva>;

export function carregarConteudoProvasDaFase(faseId: string): MapaConteudoProvas {
  const resultado = {} as Record<NumeroProva, ConteudoProva>;

  for (const numero of [1, 2, 3] as const) {
    const tipo = TIPO_PROVA_POR_NUMERO[numero];
    const sufixoEsperado = `/content/provas/${faseId}/${numero}-${tipo}.md`;
    const entrada = Object.entries(ARQUIVOS_PROVA_RAW).find(([caminho]) =>
      caminho.endsWith(sufixoEsperado),
    );

    if (!entrada) {
      throw new Error(
        `Arquivo de conteúdo da Prova ${numero} não encontrado: content/provas/${faseId}/${numero}-${tipo}.md`,
      );
    }

    resultado[numero] = parseProvaMarkdown(entrada[1], numero);
  }

  return resultado;
}
