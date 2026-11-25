/** Desenha uma lista do Ranking (top 10) no DOM: `posição · letras · tempo`. */
import { formatarTempoRanking, type EntradaRanking } from '../core/ranking';
import { formatarTexto, TEXTOS } from './textos';

/**
 * @param destaque posição (1 a 10) a destacar, a do tempo que o jogador acabou de gravar.
 */
export function renderizarListaRanking(
  lista: HTMLOListElement,
  top: readonly EntradaRanking[],
  destaque: number | null = null,
): void {
  const itens = top.map((entrada, i) => {
    const posicao = i + 1;
    const tempo = formatarTempoRanking(entrada.tempoMs);
    const li = document.createElement('li');
    li.className = 'linha-ranking';
    if (posicao === destaque) li.dataset.destaque = 'true';
    li.setAttribute(
      'aria-label',
      formatarTexto(TEXTOS.ranking.linhaAria, { posicao, letras: entrada.letras, tempo }),
    );

    const celPosicao = document.createElement('span');
    celPosicao.className = 'ranking-posicao';
    celPosicao.textContent = `${posicao}º`;
    const celLetras = document.createElement('span');
    celLetras.className = 'ranking-letras';
    celLetras.textContent = entrada.letras;
    const celTempo = document.createElement('span');
    celTempo.className = 'ranking-tempo';
    celTempo.textContent = tempo;

    li.append(celPosicao, celLetras, celTempo);
    return li;
  });
  lista.replaceChildren(...itens);
  lista.hidden = itens.length === 0;
}
