/**
 * Markdown mínimo para textos de tela (Sobre o projeto): cabeçalho `---` opcional,
 * títulos `## `, parágrafos, listas `- ` e links `[texto](https://...)`.
 * Gera blocos estruturados; quem desenha monta o DOM com textContent (nunca innerHTML).
 */

export interface Trecho {
  readonly texto: string;
  /** Presente só em links; apenas http(s) é aceito. */
  readonly href?: string;
}

export type BlocoMarkdown =
  | { readonly tipo: 'titulo'; readonly texto: string }
  | { readonly tipo: 'paragrafo'; readonly trechos: readonly Trecho[] }
  | { readonly tipo: 'lista'; readonly itens: readonly (readonly Trecho[])[] };

export interface DocumentoMarkdown {
  readonly cabecalho: ReadonlyMap<string, string>;
  readonly blocos: readonly BlocoMarkdown[];
}

const REGEX_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Quebra uma linha em trechos de texto e links. Links que não são http(s) viram texto. */
export function interpretarTrechos(linha: string): Trecho[] {
  const trechos: Trecho[] = [];
  let ultimo = 0;
  for (const match of linha.matchAll(REGEX_LINK)) {
    const inicio = match.index ?? 0;
    if (inicio > ultimo) trechos.push({ texto: linha.slice(ultimo, inicio) });
    const [, texto, href] = match;
    trechos.push(/^https?:\/\//i.test(href) ? { texto, href } : { texto });
    ultimo = inicio + match[0].length;
  }
  if (ultimo < linha.length) trechos.push({ texto: linha.slice(ultimo) });
  return trechos;
}

export function lerMarkdownSimples(conteudo: string): DocumentoMarkdown {
  let texto = conteudo.replace(/\r\n/g, '\n');
  const cabecalho = new Map<string, string>();

  const matchCabecalho = /^---\n([\s\S]*?)\n---\n?/.exec(texto);
  if (matchCabecalho) {
    for (const linha of matchCabecalho[1].split('\n')) {
      const idx = linha.indexOf(':');
      if (idx > 0) cabecalho.set(linha.slice(0, idx).trim(), linha.slice(idx + 1).trim());
    }
    texto = texto.slice(matchCabecalho[0].length);
  }

  const blocos: BlocoMarkdown[] = [];
  let paragrafo: string[] = [];
  let lista: Trecho[][] | null = null;

  const fecharParagrafo = () => {
    if (paragrafo.length > 0) {
      blocos.push({ tipo: 'paragrafo', trechos: interpretarTrechos(paragrafo.join(' ')) });
      paragrafo = [];
    }
  };
  const fecharLista = () => {
    if (lista) {
      blocos.push({ tipo: 'lista', itens: lista });
      lista = null;
    }
  };

  for (const linhaBruta of texto.split('\n')) {
    const linha = linhaBruta.trim();
    if (linha === '') {
      fecharParagrafo();
      fecharLista();
    } else if (linha.startsWith('#')) {
      fecharParagrafo();
      fecharLista();
      blocos.push({ tipo: 'titulo', texto: linha.replace(/^#+\s*/, '') });
    } else if (linha.startsWith('- ')) {
      fecharParagrafo();
      lista ??= [];
      lista.push(interpretarTrechos(linha.slice(2).trim()));
    } else {
      fecharLista();
      paragrafo.push(linha);
    }
  }
  fecharParagrafo();
  fecharLista();

  return { cabecalho, blocos };
}
