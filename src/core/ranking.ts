/**
 * Ranking de cada Fase (ADR 0008): os dez menores tempos de conclusão, com 3 letras.
 * Regras puras, sem rede nem navegador: ordenar, decidir se um tempo entra, formatar
 * e validar letras. A planilha guarda tudo; o top 10 é calculado na leitura.
 */

export const TAMANHO_RANKING = 10;
export const TAMANHO_LETRAS = 3;

export interface EntradaRanking {
  readonly letras: string;
  /** Tempo da Tentativa em milissegundos inteiros. */
  readonly tempoMs: number;
  /** Quando foi gravada (ISO 8601). Desempata: quem gravou antes fica na frente. */
  readonly gravadoEm: string;
}

/** Um tempo esperando para ser gravado no servidor (caixa de saída). */
export interface EnvioRanking {
  /** Identificador único: o servidor ignora um envio repetido com o mesmo id. */
  readonly id: string;
  readonly faseId: string;
  readonly letras: string;
  readonly tempoMs: number;
  readonly criadoEm: string;
}

/** O que uma Tentativa concluída reuniu (as 3 Provas são obrigatórias para concluir). */
export interface ColetaDaTentativa {
  readonly almasColetadas: number;
  readonly almasTotal: number;
  readonly habitantesResgatados: number;
  readonly habitantesTotal: number;
}

/** Quantas Almas e Habitantes faltaram na Tentativa para ela ser perfeita. */
export function faltasDaTentativa(coleta: ColetaDaTentativa): { almas: number; habitantes: number } {
  return {
    almas: Math.max(0, coleta.almasTotal - coleta.almasColetadas),
    habitantes: Math.max(0, coleta.habitantesTotal - coleta.habitantesResgatados),
  };
}

/**
 * Só a Tentativa perfeita concorre ao Ranking: concluída com todas as Almas e todos
 * os Habitantes reunidos nela mesma (o que foi pego em outra Tentativa não conta).
 */
export function tentativaPerfeita(coleta: ColetaDaTentativa): boolean {
  const faltas = faltasDaTentativa(coleta);
  return faltas.almas === 0 && faltas.habitantes === 0;
}

export function segundosParaMs(segundos: number): number {
  return Number.isFinite(segundos) ? Math.max(0, Math.round(segundos * 1000)) : 0;
}

/** `m:ss.cc` (ou `h:mm:ss.cc` acima de uma hora), com centésimos truncados. */
export function formatarTempoRanking(ms: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(ms) ? ms : 0));
  const centesimos = Math.floor((total % 1000) / 10);
  const segundosTotais = Math.floor(total / 1000);
  const horas = Math.floor(segundosTotais / 3600);
  const minutos = Math.floor((segundosTotais % 3600) / 60);
  const seg = segundosTotais % 60;
  const cauda = `${String(seg).padStart(2, '0')}.${String(centesimos).padStart(2, '0')}`;
  return horas > 0 ? `${horas}:${String(minutos).padStart(2, '0')}:${cauda}` : `${minutos}:${cauda}`;
}

/** Diferença de tempo curta, como `4.12 s` ou `1:03.50`. */
export function formatarDiferenca(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  if (total < 60_000) {
    const seg = Math.floor(total / 1000);
    const cent = Math.floor((total % 1000) / 10);
    return `${seg}.${String(cent).padStart(2, '0')} s`;
  }
  return formatarTempoRanking(total);
}

/** Deixa só A–Z, em maiúsculas, no máximo 3 (o que o campo de letras aceita). */
export function normalizarLetras(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, TAMANHO_LETRAS);
}

export function letrasValidas(letras: string): boolean {
  return /^[A-Z]{3}$/.test(letras);
}

function compararEntradas(a: EntradaRanking, b: EntradaRanking): number {
  if (a.tempoMs !== b.tempoMs) return a.tempoMs - b.tempoMs;
  return a.gravadoEm < b.gravadoEm ? -1 : a.gravadoEm > b.gravadoEm ? 1 : 0;
}

/** Ordena (menor tempo; empate, quem gravou antes) e corta no top 10. */
export function ordenarRanking(entradas: readonly EntradaRanking[]): EntradaRanking[] {
  return [...entradas].sort(compararEntradas).slice(0, TAMANHO_RANKING);
}

/**
 * Posição (1 a 10) que o tempo ocupa se for gravado agora, ou `null` se não entra.
 * Empatar com alguém já no Ranking põe o tempo novo depois dele (quem gravou antes).
 */
export function posicaoNoRanking(top: readonly EntradaRanking[], tempoMs: number): number | null {
  const ordenado = ordenarRanking(top);
  const posicao = ordenado.filter((e) => e.tempoMs <= tempoMs).length + 1;
  return posicao <= TAMANHO_RANKING ? posicao : null;
}

/** Quanto faltou para entrar no Ranking (diferença para o 10º), ou `null` se entra. */
export function faltaParaEntrar(top: readonly EntradaRanking[], tempoMs: number): number | null {
  const ordenado = ordenarRanking(top);
  if (ordenado.length < TAMANHO_RANKING) return null;
  const decimo = ordenado[TAMANHO_RANKING - 1];
  return tempoMs < decimo.tempoMs ? null : tempoMs - decimo.tempoMs + 1;
}

/** Ranking com uma entrada a mais, para mostrar o tempo do jogador antes do servidor confirmar. */
export function inserirNoRanking(
  top: readonly EntradaRanking[],
  entrada: EntradaRanking,
): EntradaRanking[] {
  return ordenarRanking([...top, entrada]);
}

/** Junta ao Ranking os envios ainda pendentes daquela Fase (sem repetir os já gravados). */
export function mesclarPendentes(
  top: readonly EntradaRanking[],
  pendentes: readonly EnvioRanking[],
  faseId: string,
): EntradaRanking[] {
  const daFase = pendentes
    .filter((p) => p.faseId === faseId)
    .map((p) => ({ letras: p.letras, tempoMs: p.tempoMs, gravadoEm: p.criadoEm }));
  return ordenarRanking([...top, ...daFase]);
}

/** Lê um top 10 vindo do servidor ou do cache, descartando o que não tem o formato. */
export function lerEntradasRanking(valor: unknown): EntradaRanking[] {
  if (!Array.isArray(valor)) return [];
  const entradas = valor.flatMap((item): EntradaRanking[] => {
    const e = item as Partial<EntradaRanking> | null;
    if (
      typeof e?.letras !== 'string' ||
      !letrasValidas(e.letras) ||
      typeof e.tempoMs !== 'number' ||
      !Number.isInteger(e.tempoMs) ||
      e.tempoMs < 0 ||
      typeof e.gravadoEm !== 'string'
    ) {
      return [];
    }
    return [{ letras: e.letras, tempoMs: e.tempoMs, gravadoEm: e.gravadoEm }];
  });
  return ordenarRanking(entradas);
}

export function lerEnviosRanking(valor: unknown): EnvioRanking[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is EnvioRanking => {
    const e = item as Partial<EnvioRanking> | null;
    return (
      typeof e?.id === 'string' &&
      typeof e.faseId === 'string' &&
      typeof e.letras === 'string' &&
      letrasValidas(e.letras) &&
      typeof e.tempoMs === 'number' &&
      Number.isInteger(e.tempoMs) &&
      typeof e.criadoEm === 'string'
    );
  });
}
