import { CONFIG } from './config';
import {
  MAXIMO_HABITANTES_FASE,
  TIPO_PROVA_POR_NUMERO,
  type AmeacaNaFase,
  type Coordenada,
  type Fase,
  type NumeroProva,
  type PausaAmeaca,
  type ProvaNaFase,
  type TipoAmeaca,
  type TipoCelula,
  type TipoCicloAmeaca,
} from './fase';

const TIPO_AMEACA_POR_LETRA: Record<string, TipoAmeaca> = {
  G: 'gosma',
  D: 'drone',
  R: 'guarda',
};

const NOME_TIPO_AMEACA: Record<TipoAmeaca, string> = {
  gosma: 'Gosma Tóxica (G)',
  drone: 'Drone Desmatador (D)',
  guarda: 'Guarda Florestal (R)',
};

const REGEX_ID_AMEACA = /^([GDR])([1-9][0-9]*)$/;
const REGEX_INTEIRO_NAO_NEGATIVO = /^\d+$/;
const REGEX_DECIMAL_POSITIVO = /^\d+(?:\.\d+)?$/;
const REGEX_COORDENADA = /^(\d+),(\d+)$/;
const REGEX_PAUSA = /^(\d+),(\d+)=(\d+(?:\.\d+)?)$/;

interface CampoComPosicao {
  readonly texto: string;
  readonly coluna: number;
}

interface AmeacaNoGrid {
  readonly id: string;
  readonly tipo: TipoAmeaca;
  readonly posicao: Coordenada;
  readonly linhaArquivo: number;
  readonly linhaGrid: number;
  readonly colunaGrid: number;
}

export class ErroParseFase extends Error {
  readonly linha: number;
  readonly coluna: number;

  constructor(mensagem: string, linha: number, coluna: number) {
    super(mensagem);
    this.name = 'ErroParseFase';
    this.linha = linha;
    this.coluna = coluna;
  }
}

function chaveCoord(coord: Coordenada): string {
  return `${coord.col},${coord.lin}`;
}

function primeiraColunaNaoEspaco(linhaBruta: string): number {
  const recuo = linhaBruta.length - linhaBruta.trimStart().length;
  return recuo + 1;
}

function dividirCamposComPosicao(linhaBruta: string): CampoComPosicao[] {
  const campos: CampoComPosicao[] = [];
  let inicio = 0;

  while (inicio <= linhaBruta.length) {
    const idxPipe = linhaBruta.indexOf('|', inicio);
    const fim = idxPipe === -1 ? linhaBruta.length : idxPipe;
    const trecho = linhaBruta.slice(inicio, fim);
    const recuo = trecho.length - trecho.trimStart().length;
    const texto = trecho.trim();
    const coluna = inicio + (texto.length > 0 ? recuo : 0) + 1;
    campos.push({ texto, coluna });

    if (idxPipe === -1) break;
    inicio = idxPipe + 1;
  }

  return campos;
}

function extrairTokensComPosicao(campo: CampoComPosicao): CampoComPosicao[] {
  const tokens: CampoComPosicao[] = [];
  for (const match of campo.texto.matchAll(/\S+/g)) {
    tokens.push({
      texto: match[0],
      coluna: campo.coluna + (match.index ?? 0),
    });
  }
  return tokens;
}

function parseInteiroPositivoCabecalho(
  nomeCampo: 'LARGURA' | 'ALTURA',
  linhaBruta: string,
  linhaArquivo: number,
): number {
  const indiceChave = linhaBruta.indexOf(nomeCampo);
  const trechoValor = linhaBruta.slice(indiceChave + nomeCampo.length);
  const valorTrim = trechoValor.trim();
  const colunaValor =
    indiceChave +
    nomeCampo.length +
    (trechoValor.length - trechoValor.trimStart().length) +
    1;

  if (!REGEX_INTEIRO_NAO_NEGATIVO.test(valorTrim)) {
    throw new ErroParseFase(
      `Valor inválido para ${nomeCampo} na linha ${linhaArquivo}, coluna ${colunaValor}: "${valorTrim}".`,
      linhaArquivo,
      colunaValor,
    );
  }

  const numero = Number(valorTrim);
  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new ErroParseFase(
      `${nomeCampo} deve ser um inteiro positivo na linha ${linhaArquivo}, coluna ${colunaValor}.`,
      linhaArquivo,
      colunaValor,
    );
  }

  return numero;
}

function expandirTrilho(
  id: string,
  ciclo: TipoCicloAmeaca,
  vertices: readonly Coordenada[],
  colunasVertices: readonly number[],
  linhaArquivo: number,
): Coordenada[] {
  const trilho: Coordenada[] = [vertices[0]];
  const visitadas = new Set<string>([chaveCoord(vertices[0])]);

  const pares: Array<{
    origem: Coordenada;
    destino: Coordenada;
    colunaErro: number;
    fechamentoLoop: boolean;
  }> = [];

  for (let i = 0; i < vertices.length - 1; i++) {
    pares.push({
      origem: vertices[i],
      destino: vertices[i + 1],
      colunaErro: colunasVertices[i + 1],
      fechamentoLoop: false,
    });
  }

  if (ciclo === 'loop') {
    pares.push({
      origem: vertices[vertices.length - 1],
      destino: vertices[0],
      colunaErro: colunasVertices[vertices.length - 1],
      fechamentoLoop: true,
    });
  }

  for (const { origem, destino, colunaErro, fechamentoLoop } of pares) {
    const dc = destino.col - origem.col;
    const dl = destino.lin - origem.lin;

    if ((dc !== 0 && dl !== 0) || (dc === 0 && dl === 0)) {
      throw new ErroParseFase(
        `Segmento inválido na rota de "${id}" (${origem.col},${origem.lin} -> ${destino.col},${destino.lin}) na linha ${linhaArquivo}, coluna ${colunaErro}: segmentos devem ser horizontais ou verticais com comprimento >= 1.`,
        linhaArquivo,
        colunaErro,
      );
    }

    const passos = Math.abs(dc) + Math.abs(dl);
    const stepC = Math.sign(dc);
    const stepL = Math.sign(dl);

    for (let passo = 1; passo <= passos; passo++) {
      // No fechamento do loop, a última célula volta para v1 (já no início do trilho).
      if (fechamentoLoop && passo === passos) {
        break;
      }

      const celula: Coordenada = {
        col: origem.col + stepC * passo,
        lin: origem.lin + stepL * passo,
      };
      const chave = chaveCoord(celula);
      if (visitadas.has(chave)) {
        throw new ErroParseFase(
          `Trilho da Ameaça "${id}" passa mais de uma vez pela célula (${celula.col},${celula.lin}) na linha ${linhaArquivo}, coluna ${colunaErro}.`,
          linhaArquivo,
          colunaErro,
        );
      }
      visitadas.add(chave);
      trilho.push(celula);
    }
  }

  return trilho;
}

function parseLinhaAmeaca(
  linhaBruta: string,
  linhaArquivo: number,
  largura: number,
  altura: number,
  ameacasDoGrid: ReadonlyMap<string, AmeacaNoGrid>,
  idsDeclarados: Set<string>,
): AmeacaNaFase {
  const campos = dividirCamposComPosicao(linhaBruta);
  if (campos.length !== 5) {
    const colunaErro =
      campos.length > 5 ? campos[5].coluna : linhaBruta.length + 1;
    throw new ErroParseFase(
      `Linha de Ameaça malformada na linha ${linhaArquivo}, coluna ${colunaErro}: esperados 5 campos separados por "|", encontrados ${campos.length}.`,
      linhaArquivo,
      colunaErro,
    );
  }

  const [campoId, campoCiclo, campoVel, campoRota, campoPausas] = campos;

  // 1. ID
  const matchId = REGEX_ID_AMEACA.exec(campoId.texto);
  if (!matchId) {
    throw new ErroParseFase(
      `ID de Ameaça inválido "${campoId.texto}" na linha ${linhaArquivo}, coluna ${campoId.coluna}. Esperado formato G1, D1, R1...`,
      linhaArquivo,
      campoId.coluna,
    );
  }
  const id = campoId.texto;
  const tipo = TIPO_AMEACA_POR_LETRA[matchId[1]];

  if (idsDeclarados.has(id)) {
    throw new ErroParseFase(
      `Ameaça "${id}" declarada mais de uma vez na linha ${linhaArquivo}, coluna ${campoId.coluna}.`,
      linhaArquivo,
      campoId.coluna,
    );
  }

  const ameacaGrid = ameacasDoGrid.get(id);
  if (!ameacaGrid) {
    throw new ErroParseFase(
      `Ameaça "${id}" declarada na linha ${linhaArquivo}, coluna ${campoId.coluna}, mas não existe símbolo correspondente no [GRID].`,
      linhaArquivo,
      campoId.coluna,
    );
  }

  // 2. Ciclo
  if (campoCiclo.texto !== 'loop' && campoCiclo.texto !== 'vai-e-volta') {
    throw new ErroParseFase(
      `Ciclo inválido "${campoCiclo.texto}" para Ameaça "${id}" na linha ${linhaArquivo}, coluna ${campoCiclo.coluna}. Use "loop" ou "vai-e-volta".`,
      linhaArquivo,
      campoCiclo.coluna,
    );
  }
  const ciclo: TipoCicloAmeaca = campoCiclo.texto;

  if (tipo === 'gosma' && ciclo !== 'loop') {
    throw new ErroParseFase(
      `${NOME_TIPO_AMEACA[tipo]} "${id}" aceita somente ciclo "loop" (linha ${linhaArquivo}, coluna ${campoCiclo.coluna}).`,
      linhaArquivo,
      campoCiclo.coluna,
    );
  }
  if (tipo === 'drone' && ciclo !== 'vai-e-volta') {
    throw new ErroParseFase(
      `${NOME_TIPO_AMEACA[tipo]} "${id}" aceita somente ciclo "vai-e-volta" (linha ${linhaArquivo}, coluna ${campoCiclo.coluna}).`,
      linhaArquivo,
      campoCiclo.coluna,
    );
  }

  // 3. Velocidade ("-" usa a velocidade de referência do tipo, definida na config)
  let velocidade: number;
  if (campoVel.texto === '-') {
    velocidade = CONFIG.velocidadeReferenciaAmeacaTilesPorSegundo[tipo];
  } else {
    if (!REGEX_DECIMAL_POSITIVO.test(campoVel.texto)) {
      throw new ErroParseFase(
        `Velocidade inválida "${campoVel.texto}" para Ameaça "${id}" na linha ${linhaArquivo}, coluna ${campoVel.coluna}. Use um número positivo com ponto decimal, ou "-" para a velocidade de referência.`,
        linhaArquivo,
        campoVel.coluna,
      );
    }
    velocidade = Number(campoVel.texto);
    if (!Number.isFinite(velocidade) || velocidade <= 0) {
      throw new ErroParseFase(
        `Velocidade da Ameaça "${id}" deve ser maior que zero na linha ${linhaArquivo}, coluna ${campoVel.coluna}.`,
        linhaArquivo,
        campoVel.coluna,
      );
    }
  }

  // 4. Rota (vértices)
  const tokensRota = extrairTokensComPosicao(campoRota);
  if (tokensRota.length < 2) {
    throw new ErroParseFase(
      `Rota da Ameaça "${id}" precisa de pelo menos 2 vértices na linha ${linhaArquivo}, coluna ${campoRota.coluna}.`,
      linhaArquivo,
      campoRota.coluna,
    );
  }

  if (tipo === 'gosma' && tokensRota.length < 4) {
    throw new ErroParseFase(
      `${NOME_TIPO_AMEACA[tipo]} "${id}" precisa de pelo menos 4 vértices na rota (linha ${linhaArquivo}, coluna ${campoRota.coluna}).`,
      linhaArquivo,
      campoRota.coluna,
    );
  }
  if (tipo === 'drone' && tokensRota.length !== 2) {
    throw new ErroParseFase(
      `${NOME_TIPO_AMEACA[tipo]} "${id}" precisa de exatamente 2 vértices na rota (linha ${linhaArquivo}, coluna ${campoRota.coluna}).`,
      linhaArquivo,
      campoRota.coluna,
    );
  }
  if (ciclo === 'loop' && tokensRota.length < 4) {
    throw new ErroParseFase(
      `Rota em "loop" da Ameaça "${id}" precisa de pelo menos 4 vértices (linha ${linhaArquivo}, coluna ${campoRota.coluna}).`,
      linhaArquivo,
      campoRota.coluna,
    );
  }

  const vertices: Coordenada[] = [];
  const colunasVertices: number[] = [];
  const chavesVertices = new Set<string>();

  for (const token of tokensRota) {
    const matchCoord = REGEX_COORDENADA.exec(token.texto);
    if (!matchCoord) {
      throw new ErroParseFase(
        `Coordenada inválida "${token.texto}" na rota de "${id}" na linha ${linhaArquivo}, coluna ${token.coluna}. Esperado formato "c,r".`,
        linhaArquivo,
        token.coluna,
      );
    }

    const col = Number(matchCoord[1]);
    const lin = Number(matchCoord[2]);
    if (col < 0 || col >= largura || lin < 0 || lin >= altura) {
      throw new ErroParseFase(
        `Vértice (${col},${lin}) da Ameaça "${id}" fora dos limites do grid (${largura}x${altura}) na linha ${linhaArquivo}, coluna ${token.coluna}.`,
        linhaArquivo,
        token.coluna,
      );
    }

    const coord: Coordenada = { col, lin };
    const chave = chaveCoord(coord);
    if (chavesVertices.has(chave)) {
      throw new ErroParseFase(
        `Vértice duplicado (${col},${lin}) na rota da Ameaça "${id}" na linha ${linhaArquivo}, coluna ${token.coluna}.`,
        linhaArquivo,
        token.coluna,
      );
    }

    chavesVertices.add(chave);
    vertices.push(coord);
    colunasVertices.push(token.coluna);
  }

  if (
    vertices[0].col !== ameacaGrid.posicao.col ||
    vertices[0].lin !== ameacaGrid.posicao.lin
  ) {
    throw new ErroParseFase(
      `Primeiro vértice (v1) da Ameaça "${id}" em (${vertices[0].col},${vertices[0].lin}) não coincide com o símbolo no grid em (${ameacaGrid.posicao.col},${ameacaGrid.posicao.lin}), na linha ${linhaArquivo}, coluna ${colunasVertices[0]}.`,
      linhaArquivo,
      colunasVertices[0],
    );
  }

  const trilho = expandirTrilho(id, ciclo, vertices, colunasVertices, linhaArquivo);

  // 5. Pausas
  if (campoPausas.texto === '') {
    throw new ErroParseFase(
      `Campo de pausas vazio para Ameaça "${id}" na linha ${linhaArquivo}, coluna ${campoPausas.coluna}. Use "-" quando não houver pausas.`,
      linhaArquivo,
      campoPausas.coluna,
    );
  }

  const pausas: PausaAmeaca[] = [];
  if (campoPausas.texto !== '-') {
    if (tipo === 'gosma' || tipo === 'drone') {
      throw new ErroParseFase(
        `${NOME_TIPO_AMEACA[tipo]} "${id}" não pode ter pausas (use "-") na linha ${linhaArquivo}, coluna ${campoPausas.coluna}.`,
        linhaArquivo,
        campoPausas.coluna,
      );
    }

    const tokensPausa = extrairTokensComPosicao(campoPausas);
    const verticesComPausa = new Set<string>();

    for (const token of tokensPausa) {
      const matchPausa = REGEX_PAUSA.exec(token.texto);
      if (!matchPausa) {
        throw new ErroParseFase(
          `Pausa inválida "${token.texto}" para Ameaça "${id}" na linha ${linhaArquivo}, coluna ${token.coluna}. Esperado formato "c,r=seg".`,
          linhaArquivo,
          token.coluna,
        );
      }

      const col = Number(matchPausa[1]);
      const lin = Number(matchPausa[2]);
      const duracaoSegundos = Number(matchPausa[3]);

      if (!Number.isFinite(duracaoSegundos) || duracaoSegundos <= 0) {
        throw new ErroParseFase(
          `Duração de pausa deve ser maior que zero em "${token.texto}" para Ameaça "${id}" na linha ${linhaArquivo}, coluna ${token.coluna}.`,
          linhaArquivo,
          token.coluna,
        );
      }

      const chave = `${col},${lin}`;
      if (!chavesVertices.has(chave)) {
        throw new ErroParseFase(
          `Pausa em (${col},${lin}) da Ameaça "${id}" não corresponde a nenhum vértice da rota na linha ${linhaArquivo}, coluna ${token.coluna}.`,
          linhaArquivo,
          token.coluna,
        );
      }

      if (verticesComPausa.has(chave)) {
        throw new ErroParseFase(
          `Pausa duplicada no vértice (${col},${lin}) da Ameaça "${id}" na linha ${linhaArquivo}, coluna ${token.coluna}.`,
          linhaArquivo,
          token.coluna,
        );
      }

      verticesComPausa.add(chave);
      pausas.push({
        vertice: { col, lin },
        duracaoSegundos,
      });
    }
  }

  idsDeclarados.add(id);

  return {
    id,
    tipo,
    ciclo,
    velocidadeTilesPorSegundo: velocidade,
    posicaoInicial: vertices[0],
    vertices,
    trilho,
    pausas,
  };
}

export function parseFase(texto: string): Fase {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');

  let versaoEncontrada = false;
  let larguraDeclarada: number | null = null;
  let alturaDeclarada: number | null = null;
  let indiceGrid = -1;

  for (let i = 0; i < linhas.length; i++) {
    const linhaBruta = linhas[i];
    const linha = linhaBruta.trim();
    const linhaArquivo = i + 1;
    const coluna = primeiraColunaNaoEspaco(linhaBruta);

    if (linha === '' || linha.startsWith(';')) {
      continue;
    }
    if (linha === '[GRID]') {
      indiceGrid = i + 1;
      break;
    }
    if (linha === 'REVOLTA-FASE v1') {
      if (versaoEncontrada) {
        throw new ErroParseFase(
          `Cabeçalho "REVOLTA-FASE v1" duplicado na linha ${linhaArquivo}, coluna ${coluna}.`,
          linhaArquivo,
          coluna,
        );
      }
      versaoEncontrada = true;
      continue;
    }
    if (linha.startsWith('LARGURA ') || linha === 'LARGURA') {
      if (larguraDeclarada !== null) {
        throw new ErroParseFase(
          `Cabeçalho LARGURA duplicado na linha ${linhaArquivo}, coluna ${coluna}.`,
          linhaArquivo,
          coluna,
        );
      }
      larguraDeclarada = parseInteiroPositivoCabecalho('LARGURA', linhaBruta, linhaArquivo);
      continue;
    }
    if (linha.startsWith('ALTURA ') || linha === 'ALTURA') {
      if (alturaDeclarada !== null) {
        throw new ErroParseFase(
          `Cabeçalho ALTURA duplicado na linha ${linhaArquivo}, coluna ${coluna}.`,
          linhaArquivo,
          coluna,
        );
      }
      alturaDeclarada = parseInteiroPositivoCabecalho('ALTURA', linhaBruta, linhaArquivo);
      continue;
    }

    throw new ErroParseFase(
      `Cabeçalho inválido na linha ${linhaArquivo}, coluna ${coluna}: "${linha}".`,
      linhaArquivo,
      coluna,
    );
  }

  if (indiceGrid === -1) {
    throw new ErroParseFase(
      `Seção [GRID] não encontrada no arquivo da Fase (linha ${linhas.length}, coluna 1).`,
      linhas.length,
      1,
    );
  }
  if (!versaoEncontrada) {
    throw new ErroParseFase(
      'Cabeçalho "REVOLTA-FASE v1" ausente (linha 1, coluna 1).',
      1,
      1,
    );
  }
  if (larguraDeclarada === null) {
    throw new ErroParseFase(
      `Cabeçalho LARGURA ausente antes de [GRID] (linha ${indiceGrid}, coluna 1).`,
      indiceGrid,
      1,
    );
  }
  if (alturaDeclarada === null) {
    throw new ErroParseFase(
      `Cabeçalho ALTURA ausente antes de [GRID] (linha ${indiceGrid}, coluna 1).`,
      indiceGrid,
      1,
    );
  }

  const grade: TipoCelula[][] = [];
  let inicio: Coordenada | null = null;
  let saida: Coordenada | null = null;
  const totens: Coordenada[] = [];
  const provasPorNumero = new Map<NumeroProva, ProvaNaFase>();
  const habitantes: Coordenada[] = [];
  const espinhos: Coordenada[] = [];
  const almas: Coordenada[] = [];
  const ameacasDoGrid = new Map<string, AmeacaNoGrid>();
  const contadorAmeaca: Record<string, number> = { G: 0, D: 0, R: 0 };

  for (let r = 0; r < alturaDeclarada; r++) {
    const indiceLinhaArquivo = indiceGrid + r;
    const linhaArquivo = indiceLinhaArquivo + 1;
    const linhaBruta = linhas[indiceLinhaArquivo];

    if (linhaBruta === undefined) {
      throw new ErroParseFase(
        `Grid incompleto na linha ${linhaArquivo}, coluna 1: esperadas ${alturaDeclarada} linhas, encontradas ${r}.`,
        linhaArquivo,
        1,
      );
    }
    if (linhaBruta.length !== larguraDeclarada) {
      const colunaErro = Math.min(linhaBruta.length, larguraDeclarada) + 1;
      throw new ErroParseFase(
        `Linha ${r + 1} do grid (linha ${linhaArquivo}, coluna ${colunaErro}) tem ${linhaBruta.length} colunas (esperadas ${larguraDeclarada}).`,
        linhaArquivo,
        colunaErro,
      );
    }

    const linhaCelulas: TipoCelula[] = [];
    for (let c = 0; c < larguraDeclarada; c++) {
      const caractere = linhaBruta[c];
      const colunaGrid = c + 1;
      const linhaGrid = r + 1;

      switch (caractere) {
        case '#':
          linhaCelulas.push('parede');
          break;
        case '.':
          linhaCelulas.push('chao');
          break;
        case '@':
          if (inicio !== null) {
            throw new ErroParseFase(
              `Mais de um início (@) encontrado na linha ${linhaGrid}, coluna ${colunaGrid} do grid (linha ${linhaArquivo} do arquivo).`,
              linhaArquivo,
              colunaGrid,
            );
          }
          inicio = { col: c, lin: r };
          linhaCelulas.push('inicio');
          break;
        case 'X':
          if (saida !== null) {
            throw new ErroParseFase(
              `Mais de uma saída (X) encontrada na linha ${linhaGrid}, coluna ${colunaGrid} do grid (linha ${linhaArquivo} do arquivo).`,
              linhaArquivo,
              colunaGrid,
            );
          }
          saida = { col: c, lin: r };
          linhaCelulas.push('saida');
          break;
        case 'T':
          totens.push({ col: c, lin: r });
          linhaCelulas.push('chao');
          break;
        case '1':
        case '2':
        case '3': {
          const numero = Number(caractere) as NumeroProva;
          if (provasPorNumero.has(numero)) {
            throw new ErroParseFase(
              `Prova ${numero} duplicada na linha ${linhaGrid}, coluna ${colunaGrid} do grid (linha ${linhaArquivo} do arquivo).`,
              linhaArquivo,
              colunaGrid,
            );
          }
          provasPorNumero.set(numero, {
            numero,
            tipo: TIPO_PROVA_POR_NUMERO[numero],
            posicao: { col: c, lin: r },
          });
          linhaCelulas.push('chao');
          break;
        }
        case 'H':
          if (habitantes.length >= MAXIMO_HABITANTES_FASE) {
            throw new ErroParseFase(
              `Mais de ${MAXIMO_HABITANTES_FASE} Habitantes (H): o excedente está na linha ${linhaGrid}, coluna ${colunaGrid} do grid (linha ${linhaArquivo} do arquivo).`,
              linhaArquivo,
              colunaGrid,
            );
          }
          habitantes.push({ col: c, lin: r });
          linhaCelulas.push('chao');
          break;
        case '^':
          espinhos.push({ col: c, lin: r });
          linhaCelulas.push('chao');
          break;
        case 'o':
          almas.push({ col: c, lin: r });
          linhaCelulas.push('chao');
          break;
        case 'G':
        case 'D':
        case 'R': {
          contadorAmeaca[caractere] += 1;
          const id = `${caractere}${contadorAmeaca[caractere]}`;
          ameacasDoGrid.set(id, {
            id,
            tipo: TIPO_AMEACA_POR_LETRA[caractere],
            posicao: { col: c, lin: r },
            linhaArquivo,
            linhaGrid,
            colunaGrid,
          });
          linhaCelulas.push('chao');
          break;
        }
        default:
          throw new ErroParseFase(
            `Caractere inválido "${caractere}" na linha ${linhaGrid}, coluna ${colunaGrid} do grid (linha ${linhaArquivo} do arquivo).`,
            linhaArquivo,
            colunaGrid,
          );
      }
    }
    grade.push(linhaCelulas);
  }

  const linhaFimGrid = indiceGrid + alturaDeclarada;
  if (inicio === null) {
    throw new ErroParseFase(
      `A Fase precisa conter exatamente um início (@) (verificado ao fim do [GRID], linha ${linhaFimGrid}, coluna 1).`,
      linhaFimGrid,
      1,
    );
  }
  if (saida === null) {
    throw new ErroParseFase(
      `A Fase precisa conter exatamente uma saída (X) (verificado ao fim do [GRID], linha ${linhaFimGrid}, coluna 1).`,
      linhaFimGrid,
      1,
    );
  }

  const ameacas: AmeacaNaFase[] = [];
  const idsDeclarados = new Set<string>();
  let estadoSecao: 'pos_grid' | 'ameacas' | 'fim' = 'pos_grid';
  let secaoAmeacasVista = false;

  for (let i = indiceGrid + alturaDeclarada; i < linhas.length; i++) {
    const linhaBruta = linhas[i];
    const linha = linhaBruta.trim();
    const linhaArquivo = i + 1;
    const coluna = primeiraColunaNaoEspaco(linhaBruta);

    if (linha === '' || linha.startsWith(';')) {
      continue;
    }

    if (estadoSecao === 'fim') {
      throw new ErroParseFase(
        `Conteúdo inesperado após [FIM] na linha ${linhaArquivo}, coluna ${coluna}: "${linha}".`,
        linhaArquivo,
        coluna,
      );
    }

    if (linha === '[FIM]') {
      estadoSecao = 'fim';
      continue;
    }

    if (linha === '[AMEACAS]') {
      if (secaoAmeacasVista) {
        throw new ErroParseFase(
          `Seção [AMEACAS] duplicada na linha ${linhaArquivo}, coluna ${coluna}.`,
          linhaArquivo,
          coluna,
        );
      }
      secaoAmeacasVista = true;
      estadoSecao = 'ameacas';
      continue;
    }

    if (estadoSecao === 'pos_grid') {
      throw new ErroParseFase(
        `Esperada seção [AMEACAS] ou [FIM] na linha ${linhaArquivo}, coluna ${coluna}, encontrado "${linha}".`,
        linhaArquivo,
        coluna,
      );
    }

    const ameaca = parseLinhaAmeaca(
      linhaBruta,
      linhaArquivo,
      larguraDeclarada,
      alturaDeclarada,
      ameacasDoGrid,
      idsDeclarados,
    );
    ameacas.push(ameaca);
  }

  if (estadoSecao !== 'fim') {
    throw new ErroParseFase(
      `Seção [FIM] ausente no arquivo da Fase (linha ${linhas.length}, coluna 1).`,
      linhas.length,
      1,
    );
  }

  for (const [id, ameacaGrid] of ameacasDoGrid) {
    if (!idsDeclarados.has(id)) {
      throw new ErroParseFase(
        `Ameaça "${id}" presente no [GRID] (linha ${ameacaGrid.linhaGrid}, coluna ${ameacaGrid.colunaGrid} do grid, linha ${ameacaGrid.linhaArquivo} do arquivo) não possui rota definida em [AMEACAS].`,
        ameacaGrid.linhaArquivo,
        ameacaGrid.colunaGrid,
      );
    }
  }

  const provas: ProvaNaFase[] = ([1, 2, 3] as const)
    .map((n) => provasPorNumero.get(n))
    .filter((p): p is ProvaNaFase => p !== undefined);

  return {
    largura: larguraDeclarada,
    altura: alturaDeclarada,
    grade,
    inicio,
    saida,
    totens,
    provas,
    habitantes,
    espinhos,
    almas,
    ameacas,
  };
}
