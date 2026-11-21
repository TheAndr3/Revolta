import { TIPO_PROVA_POR_NUMERO, type NumeroProva, type TipoProva } from './fase';

export const ROTULO_TIPO_PROVA: Record<TipoProva, string> = {
  passado: 'O Passado',
  transformacao: 'A Transformação',
  responsaveis: 'Os Responsáveis',
};

export interface ConteudoProva {
  readonly numero: NumeroProva;
  readonly tipo: TipoProva;
  readonly rotuloTipo: string;
  readonly formato: string;
  readonly titulo: string;
  readonly ilustracao: string;
  readonly tema: string;
  readonly fontes: readonly string[];
  readonly texto: string;
  readonly paragrafos: readonly string[];
}

export class ErroParseProva extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroParseProva';
  }
}

function normalizarChave(chave: string): string {
  return chave
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function removerAspas(valor: string): string {
  const limpo = valor.trim();
  if (
    (limpo.startsWith('"') && limpo.endsWith('"')) ||
    (limpo.startsWith("'") && limpo.endsWith("'"))
  ) {
    return limpo.slice(1, -1).trim();
  }
  return limpo;
}

function interpretarTipoProva(valorBruto: string): TipoProva | null {
  const normalizado = normalizarChave(valorBruto);
  switch (normalizado) {
    case 'passado':
    case 'o passado':
      return 'passado';
    case 'transformacao':
    case 'a transformacao':
      return 'transformacao';
    case 'responsaveis':
    case 'os responsaveis':
      return 'responsaveis';
    default:
      return null;
  }
}

export function parseProvaMarkdown(
  conteudo: string,
  numero: NumeroProva,
): ConteudoProva {
  const normalizado = conteudo.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalizado);
  if (!match) {
    throw new ErroParseProva(
      `Prova ${numero}: cabeçalho YAML delimitado por "---" não encontrado.`,
    );
  }

  const blocoCabecalho = match[1];
  const corpoBruto = match[2];

  const campos = new Map<string, string>();
  const fontes: string[] = [];
  let chaveAtualLista: string | null = null;

  for (const linhaBruta of blocoCabecalho.split('\n')) {
    const linha = linhaBruta.trim();
    if (linha === '' || linha.startsWith('#')) {
      continue;
    }

    if (linha.startsWith('- ')) {
      if (chaveAtualLista === 'fontes') {
        const item = removerAspas(linha.slice(2));
        if (item.length > 0) {
          fontes.push(item);
        }
        continue;
      }
      throw new ErroParseProva(
        `Prova ${numero}: item de lista inesperado no cabeçalho ("${linha}").`,
      );
    }

    const idxDoisPontos = linhaBruta.indexOf(':');
    if (idxDoisPontos === -1) {
      throw new ErroParseProva(
        `Prova ${numero}: linha inválida no cabeçalho ("${linha}").`,
      );
    }

    const chave = normalizarChave(linhaBruta.slice(0, idxDoisPontos));
    const valor = removerAspas(linhaBruta.slice(idxDoisPontos + 1));

    if (chave === 'fontes') {
      chaveAtualLista = 'fontes';
      if (valor.length > 0) {
        fontes.push(valor);
      }
      continue;
    }

    chaveAtualLista = null;
    campos.set(chave, valor);
  }

  const exigirCampo = (nome: string): string => {
    const valor = campos.get(nome);
    if (!valor) {
      throw new ErroParseProva(
        `Prova ${numero}: campo obrigatório "${nome}" ausente no cabeçalho.`,
      );
    }
    return valor;
  };

  const tipoBruto = exigirCampo('tipo');
  const tipo = interpretarTipoProva(tipoBruto);
  if (!tipo) {
    throw new ErroParseProva(
      `Prova ${numero}: tipo inválido "${tipoBruto}" no cabeçalho.`,
    );
  }

  const tipoEsperado = TIPO_PROVA_POR_NUMERO[numero];
  if (tipo !== tipoEsperado) {
    throw new ErroParseProva(
      `Prova ${numero}: tipo "${tipo}" não corresponde ao esperado "${tipoEsperado}".`,
    );
  }

  const formato = exigirCampo('formato');
  const titulo = exigirCampo('titulo');
  const ilustracao = exigirCampo('ilustracao');
  const tema = exigirCampo('tema');

  if (fontes.length === 0) {
    throw new ErroParseProva(
      `Prova ${numero}: campo obrigatório "fontes" ausente no cabeçalho.`,
    );
  }

  const paragrafos = corpoBruto
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, ' ').trim())
    .filter((p) => p.length > 0);

  if (paragrafos.length === 0) {
    throw new ErroParseProva(`Prova ${numero}: corpo de texto vazio.`);
  }

  return {
    numero,
    tipo,
    rotuloTipo: ROTULO_TIPO_PROVA[tipo],
    formato,
    titulo,
    ilustracao,
    tema,
    fontes,
    texto: paragrafos.join('\n\n'),
    paragrafos,
  };
}
