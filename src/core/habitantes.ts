export interface ConteudoHabitante {
  readonly faseId: string;
  /** Número do Habitante na Fase (1, 2, 3), na ordem de leitura do grid. */
  readonly numero: number;
  readonly nome: string;
  readonly retrato: string;
  readonly papel: string;
  readonly fala: string;
  /**
   * Qual sprite de Habitante usar no mapa (ex.: `agente`, `avo`, `menino`; ver
   * src/game/habitantesSprites.ts). Vazio: escolhido pelo número.
   */
  readonly aparencia: string;
}

export class ErroParseHabitante extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroParseHabitante';
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

export function parseHabitanteMarkdown(
  conteudo: string,
  faseId: string,
  numero = 1,
): ConteudoHabitante {
  const normalizado = conteudo.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalizado);
  if (!match) {
    throw new ErroParseHabitante(
      `Habitante (${faseId}): cabeçalho YAML delimitado por "---" não encontrado.`,
    );
  }

  const blocoCabecalho = match[1];
  const corpoBruto = match[2];
  const campos = new Map<string, string>();

  for (const linhaBruta of blocoCabecalho.split('\n')) {
    const linha = linhaBruta.trim();
    if (linha === '' || linha.startsWith('#')) {
      continue;
    }

    const idxDoisPontos = linhaBruta.indexOf(':');
    if (idxDoisPontos === -1) {
      throw new ErroParseHabitante(
        `Habitante (${faseId}): linha inválida no cabeçalho ("${linha}").`,
      );
    }

    const chave = normalizarChave(linhaBruta.slice(0, idxDoisPontos));
    const valor = removerAspas(linhaBruta.slice(idxDoisPontos + 1));
    campos.set(chave, valor);
  }

  const exigirCampo = (nome: string): string => {
    const valor = campos.get(nome);
    if (!valor) {
      throw new ErroParseHabitante(
        `Habitante (${faseId}): campo obrigatório "${nome}" ausente no cabeçalho.`,
      );
    }
    return valor;
  };

  const nome = exigirCampo('nome');
  const retrato = exigirCampo('retrato');
  const papel = campos.get('papel') ?? '';
  const fala = corpoBruto.trim().replace(/\s+/g, ' ');

  if (fala.length === 0) {
    throw new ErroParseHabitante(
      `Habitante (${faseId}): fala de resgate vazia no corpo do arquivo.`,
    );
  }

  return {
    faseId,
    numero,
    nome,
    retrato,
    papel,
    fala,
    aparencia: campos.get('aparencia') ?? '',
  };
}
