import telas from '../../content/telas.json';
import { preencherModelo } from '../core/progresso';

/** Textos de tela vindos de `content/telas.json`. */
export const TEXTOS = telas;

/** Busca um texto pelo caminho com pontos, ex.: `"menu.jogar"`. */
export function textoPorCaminho(caminho: string): string | null {
  let atual: unknown = TEXTOS;
  for (const parte of caminho.split('.')) {
    if (typeof atual !== 'object' || atual === null || !(parte in atual)) {
      return null;
    }
    atual = (atual as Record<string, unknown>)[parte];
  }
  return typeof atual === 'string' ? atual : null;
}

export function formatarTexto(
  modelo: string,
  valores: Readonly<Record<string, string | number>> = {},
): string {
  return preencherModelo(modelo, valores);
}

/**
 * Preenche os textos fixos do HTML a partir do arquivo de conteúdo:
 * `data-texto` → conteúdo, `data-texto-aria` → `aria-label`, `data-texto-title` → `title`.
 * Caminhos desconhecidos são avisados no console e o texto do HTML é mantido.
 */
export function aplicarTextosEstaticos(raiz: ParentNode = document): void {
  const aplicar = (atributo: string, definir: (el: HTMLElement, valor: string) => void) => {
    for (const el of raiz.querySelectorAll<HTMLElement>(`[${atributo}]`)) {
      const caminho = el.getAttribute(atributo) ?? '';
      const valor = textoPorCaminho(caminho);
      if (valor === null) {
        console.warn(`Texto de tela não encontrado em content/telas.json: "${caminho}"`);
        continue;
      }
      definir(el, valor);
    }
  };

  aplicar('data-texto', (el, valor) => {
    el.textContent = valor;
  });
  aplicar('data-texto-aria', (el, valor) => {
    el.setAttribute('aria-label', valor);
  });
  aplicar('data-texto-title', (el, valor) => {
    el.title = valor;
  });
}
