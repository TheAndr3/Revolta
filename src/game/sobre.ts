/**
 * Tela "Sobre o projeto" (#19): contexto educativo e fontes reais, lidos de
 * `content/sobre.md`. O DOM é montado com textContent; links abrem em nova aba.
 */
import sobreMarkdown from '../../content/sobre.md?raw';
import { lerMarkdownSimples, type Trecho } from '../core/markdownSimples';

function montarTrechos(destino: HTMLElement, trechos: readonly Trecho[]): void {
  for (const trecho of trechos) {
    if (trecho.href) {
      const link = document.createElement('a');
      link.href = trecho.href;
      link.textContent = trecho.texto;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      destino.append(link);
    } else {
      destino.append(document.createTextNode(trecho.texto));
    }
  }
}

/** Preenche o título e o corpo da tela Sobre a partir do arquivo de conteúdo. */
export function montarSobre(titulo: HTMLElement, corpo: HTMLElement): void {
  const documento = lerMarkdownSimples(sobreMarkdown);
  const tituloConteudo = documento.cabecalho.get('titulo');
  if (tituloConteudo) titulo.textContent = tituloConteudo;

  const nos = documento.blocos.map((bloco) => {
    switch (bloco.tipo) {
      case 'titulo': {
        const h2 = document.createElement('h2');
        h2.textContent = bloco.texto;
        return h2;
      }
      case 'paragrafo': {
        const p = document.createElement('p');
        montarTrechos(p, bloco.trechos);
        return p;
      }
      case 'lista': {
        const ul = document.createElement('ul');
        for (const item of bloco.itens) {
          const li = document.createElement('li');
          montarTrechos(li, item);
          ul.append(li);
        }
        return ul;
      }
    }
  });
  corpo.replaceChildren(...nos);
}
