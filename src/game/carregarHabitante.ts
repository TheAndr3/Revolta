import { parseHabitanteMarkdown, type ConteudoHabitante } from '../core/habitantes';

const ARQUIVOS_HABITANTE_RAW = import.meta.glob('../../content/habitantes/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function carregarConteudoHabitanteDaFase(
  faseId: string,
): ConteudoHabitante | null {
  const sufixoEsperado = `/content/habitantes/${faseId}.md`;
  const entrada = Object.entries(ARQUIVOS_HABITANTE_RAW).find(([caminho]) =>
    caminho.endsWith(sufixoEsperado),
  );

  if (!entrada) {
    return null;
  }

  return parseHabitanteMarkdown(entrada[1], faseId);
}
