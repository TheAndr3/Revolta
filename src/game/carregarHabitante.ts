import { parseHabitanteMarkdown, type ConteudoHabitante } from '../core/habitantes';

/** Um arquivo por Habitante: `content/habitantes/<conteudo>/<número>.md`. */
const ARQUIVOS_HABITANTE_RAW = import.meta.glob('../../content/habitantes/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * Conteúdo dos Habitantes da Fase, em ordem de número (1, 2, 3). O número é a ordem de
 * leitura do `H` no grid; um Habitante sem arquivo fica sem fala nem ficha.
 */
export function carregarConteudoHabitantesDaFase(faseId: string): ConteudoHabitante[] {
  const prefixo = `/content/habitantes/${faseId}/`;
  return Object.entries(ARQUIVOS_HABITANTE_RAW)
    .flatMap(([caminho, markdown]) => {
      const i = caminho.indexOf(prefixo);
      if (i < 0) return [];
      const numero = Number(caminho.slice(i + prefixo.length).replace(/\.md$/, ''));
      if (!Number.isInteger(numero) || numero < 1) return [];
      return [parseHabitanteMarkdown(markdown, faseId, numero)];
    })
    .sort((a, b) => a.numero - b.numero);
}
