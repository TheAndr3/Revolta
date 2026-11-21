import type { Coordenada, Fase, TipoCelula } from './fase';

const SIMBOLOS_VALIDOS: Record<string, TipoCelula> = {
  '#': 'parede',
  '.': 'chao',
  '@': 'inicio',
  X: 'saida',
};

export class ErroParseFase extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroParseFase';
  }
}

export function parseFase(texto: string): Fase {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');

  let larguraDeclarada: number | null = null;
  let alturaDeclarada: number | null = null;
  let indiceGrid = -1;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (linha === '' || linha.startsWith(';')) {
      continue;
    }
    if (linha === '[GRID]') {
      indiceGrid = i + 1;
      break;
    }
    if (linha.startsWith('LARGURA ')) {
      larguraDeclarada = Number.parseInt(linha.slice('LARGURA '.length).trim(), 10);
      continue;
    }
    if (linha.startsWith('ALTURA ')) {
      alturaDeclarada = Number.parseInt(linha.slice('ALTURA '.length).trim(), 10);
      continue;
    }
    if (linha === 'REVOLTA-FASE v1') {
      continue;
    }
    throw new ErroParseFase(`Cabeçalho inválido na linha ${i + 1}: "${linha}".`);
  }

  if (indiceGrid === -1) {
    throw new ErroParseFase('Seção [GRID] não encontrada no arquivo da Fase.');
  }
  if (larguraDeclarada === null || !Number.isInteger(larguraDeclarada) || larguraDeclarada <= 0) {
    throw new ErroParseFase('Cabeçalho LARGURA ausente ou inválido.');
  }
  if (alturaDeclarada === null || !Number.isInteger(alturaDeclarada) || alturaDeclarada <= 0) {
    throw new ErroParseFase('Cabeçalho ALTURA ausente ou inválido.');
  }

  const grade: TipoCelula[][] = [];
  let inicio: Coordenada | null = null;
  let saida: Coordenada | null = null;

  for (let r = 0; r < alturaDeclarada; r++) {
    const indiceLinhaArquivo = indiceGrid + r;
    const linhaBruta = linhas[indiceLinhaArquivo];
    if (linhaBruta === undefined) {
      throw new ErroParseFase(
        `Grid incompleto: esperadas ${alturaDeclarada} linhas, encontradas ${r}.`,
      );
    }
    if (linhaBruta.length !== larguraDeclarada) {
      throw new ErroParseFase(
        `Linha ${r + 1} do grid tem ${linhaBruta.length} colunas (esperadas ${larguraDeclarada}).`,
      );
    }

    const linhaCelulas: TipoCelula[] = [];
    for (let c = 0; c < larguraDeclarada; c++) {
      const caractere = linhaBruta[c];
      const tipo = SIMBOLOS_VALIDOS[caractere];
      if (!tipo) {
        throw new ErroParseFase(
          `Caractere inválido "${caractere}" na linha ${r + 1}, coluna ${c + 1} do grid.`,
        );
      }

      if (tipo === 'inicio') {
        if (inicio !== null) {
          throw new ErroParseFase(
            `Mais de um início (@) encontrado (duplicado na linha ${r + 1}, coluna ${c + 1}).`,
          );
        }
        inicio = { col: c, lin: r };
      }

      if (tipo === 'saida') {
        if (saida !== null) {
          throw new ErroParseFase(
            `Mais de uma saída (X) encontrada (duplicada na linha ${r + 1}, coluna ${c + 1}).`,
          );
        }
        saida = { col: c, lin: r };
      }

      linhaCelulas.push(tipo);
    }
    grade.push(linhaCelulas);
  }

  if (inicio === null) {
    throw new ErroParseFase('A Fase precisa conter exatamente um início (@).');
  }
  if (saida === null) {
    throw new ErroParseFase('A Fase precisa conter exatamente uma saída (X).');
  }

  return {
    largura: larguraDeclarada,
    altura: alturaDeclarada,
    grade,
    inicio,
    saida,
  };
}
