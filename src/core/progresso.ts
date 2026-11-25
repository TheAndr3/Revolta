/**
 * Regras puras do fluxo de Fases: catálogo, desbloqueio em sequência e
 * formatação do resumo de fim de Fase. Sem acesso a DOM nem a armazenamento.
 */

export interface EntradaCatalogoFase {
  /** Identificador usado no progresso salvo (Provas, Habitantes, conclusão). */
  readonly id: string;
  readonly nome: string;
  readonly subtitulo: string;
  /** Caminho do `.txt` da Fase dentro de `public/`. */
  readonly mapa: string;
  /** Pasta de conteúdo em `content/provas/<conteudo>/` e `content/habitantes/<conteudo>/`. */
  readonly conteudo: string;
}

export class ErroCatalogoFases extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroCatalogoFases';
  }
}

function exigirTexto(objeto: Record<string, unknown>, campo: string, indice: number): string {
  const valor = objeto[campo];
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErroCatalogoFases(
      `Catálogo de Fases: a Fase na posição ${indice + 1} está sem o campo "${campo}".`,
    );
  }
  return valor.trim();
}

/** Valida o JSON do catálogo (`content/fases.json`) e devolve as Fases na ordem de jogo. */
export function lerCatalogoFases(bruto: unknown): EntradaCatalogoFase[] {
  if (typeof bruto !== 'object' || bruto === null || !Array.isArray((bruto as { fases?: unknown }).fases)) {
    throw new ErroCatalogoFases('Catálogo de Fases: esperado um objeto com a lista "fases".');
  }

  const lista = (bruto as { fases: unknown[] }).fases;
  if (lista.length === 0) {
    throw new ErroCatalogoFases('Catálogo de Fases: a lista "fases" está vazia.');
  }

  const ids = new Set<string>();
  return lista.map((item, indice) => {
    if (typeof item !== 'object' || item === null) {
      throw new ErroCatalogoFases(
        `Catálogo de Fases: a Fase na posição ${indice + 1} não é um objeto.`,
      );
    }
    const objeto = item as Record<string, unknown>;
    const entrada: EntradaCatalogoFase = {
      id: exigirTexto(objeto, 'id', indice),
      nome: exigirTexto(objeto, 'nome', indice),
      subtitulo: typeof objeto.subtitulo === 'string' ? objeto.subtitulo.trim() : '',
      mapa: exigirTexto(objeto, 'mapa', indice),
      conteudo: exigirTexto(objeto, 'conteudo', indice),
    };
    if (ids.has(entrada.id)) {
      throw new ErroCatalogoFases(`Catálogo de Fases: o id "${entrada.id}" aparece mais de uma vez.`);
    }
    ids.add(entrada.id);
    return entrada;
  });
}

/** A primeira Fase está sempre liberada; as demais, quando a anterior foi concluída. */
export function faseDesbloqueada(
  catalogo: readonly EntradaCatalogoFase[],
  indice: number,
  concluidas: ReadonlySet<string>,
): boolean {
  if (indice < 0 || indice >= catalogo.length) return false;
  if (indice === 0) return true;
  return concluidas.has(catalogo[indice - 1].id);
}

/** Índice da próxima Fase, ou `null` quando a Fase atual é a última do protótipo. */
export function proximaFase(
  catalogo: readonly EntradaCatalogoFase[],
  indiceAtual: number,
): number | null {
  const proximo = indiceAtual + 1;
  return proximo < catalogo.length ? proximo : null;
}

/** As três Marcas de uma Fase (glossário): concluir, reunir todas as Almas, resgatar todos os Habitantes. */
export interface MarcasDaFase {
  readonly concluida: boolean;
  readonly todasAsAlmas: boolean;
  readonly habitantes: boolean;
}

export const TOTAL_MARCAS = 3;

export function calcularMarcas(dados: {
  readonly concluida: boolean;
  /** Melhor número de Almas já reunidas numa mesma partida da Fase. */
  readonly melhorAlmas: number;
  readonly totalAlmas: number;
  /** Habitantes da Fase já resgatados (em qualquer partida) e quantos ela tem. */
  readonly habitantesResgatados: number;
  readonly totalHabitantes: number;
}): MarcasDaFase {
  return {
    concluida: dados.concluida,
    // Uma Fase sem Almas não tem o que reunir: a Marca vem junto com a conclusão.
    todasAsAlmas:
      dados.totalAlmas === 0 ? dados.concluida : dados.melhorAlmas >= dados.totalAlmas,
    // Uma Fase sem Habitantes também dá a Marca ao ser concluída.
    habitantes:
      dados.totalHabitantes === 0
        ? dados.concluida
        : dados.habitantesResgatados >= dados.totalHabitantes,
  };
}

export function contarMarcas(marcas: MarcasDaFase): number {
  return [marcas.concluida, marcas.todasAsAlmas, marcas.habitantes].filter(Boolean).length;
}

/** Formata segundos como `m:ss` (ou `h:mm:ss` acima de uma hora). */
export function formatarTempo(segundos: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(segundos) ? segundos : 0));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const seg = total % 60;
  const ss = String(seg).padStart(2, '0');
  if (horas > 0) {
    return `${horas}:${String(minutos).padStart(2, '0')}:${ss}`;
  }
  return `${minutos}:${ss}`;
}

/** Substitui `{chave}` no modelo pelos valores informados. Chaves ausentes ficam como estão. */
export function preencherModelo(
  modelo: string,
  valores: Readonly<Record<string, string | number>>,
): string {
  return modelo.replace(/\{(\w+)\}/g, (trecho, chave: string) =>
    Object.prototype.hasOwnProperty.call(valores, chave) ? String(valores[chave]) : trecho,
  );
}
