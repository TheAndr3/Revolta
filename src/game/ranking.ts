/**
 * Cliente do Ranking (ADR 0008): conversa com o Apps Script e esconde a latência dele.
 *
 * - O top 10 é pré-carregado ao entrar na Fase e fica em cache no navegador.
 * - Gravar põe o tempo numa caixa de saída antes de enviar; se a rede falhar, ele é
 *   reenviado na próxima abertura do jogo. O servidor ignora um id já gravado.
 * - Em localhost tudo vai para a aba "Testes" da planilha, nunca para o Ranking real.
 */
import { CONFIG } from '../core/config';
import {
  lerEntradasRanking,
  lerEnviosRanking,
  mesclarPendentes,
  normalizarLetras,
  type EntradaRanking,
  type EnvioRanking,
} from '../core/ranking';
import type { StorageBasico } from './armazenamentoProvas';

const CHAVE_CACHE = 'revolta:ranking-cache:v1';
const CHAVE_SAIDA = 'revolta:ranking-saida:v1';
const CHAVE_LETRAS = 'revolta:ranking-letras:v1';

type Aba = 'Tempos' | 'Testes';

interface PendenteLocal extends EnvioRanking {
  readonly aba: Aba;
}

export interface ResultadoGravacao {
  /** Ranking para mostrar já com o tempo novo (confirmado ou ainda pendente). */
  readonly top: EntradaRanking[];
  /** O servidor confirmou a gravação. */
  readonly confirmado: boolean;
}

export interface ClienteRanking {
  /** Há servidor configurado. Sem ele, os tempos esperam na caixa de saída. */
  readonly disponivel: boolean;
  /** Último Ranking conhecido da Fase, com os envios ainda pendentes. Não usa a rede. */
  topConhecido(faseId: string): EntradaRanking[];
  /** Busca o Ranking no servidor e atualiza o cache. `null` se não conseguiu. */
  carregarTop(faseId: string): Promise<EntradaRanking[] | null>;
  gravar(faseId: string, letras: string, tempoMs: number): Promise<ResultadoGravacao>;
  /** Reenvia o que ficou na caixa de saída. */
  esvaziarCaixaDeSaida(): Promise<void>;
  ultimasLetras(): string;
}

function obterStoragePadrao(): StorageBasico | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function abaDoAmbiente(): Aba {
  const host = typeof location !== 'undefined' ? location.hostname : '';
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost')
    ? 'Testes'
    : 'Tempos';
}

function novoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function lerJson(storage: StorageBasico | null, chave: string): unknown {
  if (!storage) return null;
  try {
    const bruto = storage.getItem(chave);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function gravarJson(storage: StorageBasico | null, chave: string, valor: unknown): void {
  if (!storage) return;
  try {
    storage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Armazenamento cheio ou bloqueado: o jogo segue, só sem cache.
  }
}

interface RespostaServidor {
  readonly ok?: boolean;
  readonly top?: unknown;
}

export function criarClienteRanking(
  url: string = CONFIG.ranking.url,
  storage: StorageBasico | null = obterStoragePadrao(),
): ClienteRanking {
  const aba = abaDoAmbiente();
  const chaveCache = (faseId: string) => `${aba}|${faseId}`;

  const lerCache = (): Record<string, unknown> => {
    const valor = lerJson(storage, CHAVE_CACHE);
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : {};
  };

  const salvarNoCache = (faseId: string, top: EntradaRanking[]) => {
    gravarJson(storage, CHAVE_CACHE, { ...lerCache(), [chaveCache(faseId)]: top });
  };

  const lerPendentes = (): PendenteLocal[] =>
    lerEnviosRanking(lerJson(storage, CHAVE_SAIDA)).filter(
      (p): p is PendenteLocal => (p as Partial<PendenteLocal>).aba === 'Tempos' || (p as Partial<PendenteLocal>).aba === 'Testes',
    );

  const salvarPendentes = (pendentes: PendenteLocal[]) => gravarJson(storage, CHAVE_SAIDA, pendentes);

  const pendentesDaAba = () => lerPendentes().filter((p) => p.aba === aba);

  const topConhecido = (faseId: string) =>
    mesclarPendentes(lerEntradasRanking(lerCache()[chaveCache(faseId)]), pendentesDaAba(), faseId);

  const pedir = async (init?: RequestInit, parametros = ''): Promise<RespostaServidor | null> => {
    if (!url) return null;
    const controle = new AbortController();
    const temporizador = setTimeout(() => controle.abort(), CONFIG.ranking.limiteEsperaMs);
    try {
      const resposta = await fetch(`${url}${parametros}`, { ...init, signal: controle.signal });
      if (!resposta.ok) return null;
      return (await resposta.json()) as RespostaServidor;
    } catch {
      return null;
    } finally {
      clearTimeout(temporizador);
    }
  };

  const enviar = async (pendente: PendenteLocal): Promise<EntradaRanking[] | null> => {
    // text/plain evita o preflight de CORS, que o Apps Script não responde.
    const resposta = await pedir({
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        id: pendente.id,
        faseId: pendente.faseId,
        letras: pendente.letras,
        tempoMs: pendente.tempoMs,
        aba: pendente.aba,
      }),
    });
    if (resposta === null) return null;
    // Recusado pelo servidor (fora das regras): não adianta reenviar.
    removerPendente(pendente.id);
    if (!resposta.ok) return [];
    const top = lerEntradasRanking(resposta.top);
    if (pendente.aba === aba) salvarNoCache(pendente.faseId, top);
    return top;
  };

  const removerPendente = (id: string) => salvarPendentes(lerPendentes().filter((p) => p.id !== id));

  let esvaziando: Promise<void> | null = null;

  return {
    disponivel: url !== '',
    topConhecido,

    async carregarTop(faseId) {
      const parametros = `?acao=top&fase=${encodeURIComponent(faseId)}&aba=${aba}`;
      const resposta = await pedir(undefined, parametros);
      if (!resposta?.ok) return null;
      salvarNoCache(faseId, lerEntradasRanking(resposta.top));
      return topConhecido(faseId);
    },

    async gravar(faseId, letras, tempoMs) {
      const letrasLimpas = normalizarLetras(letras);
      gravarJson(storage, CHAVE_LETRAS, letrasLimpas);
      const pendente: PendenteLocal = {
        id: novoId(),
        faseId,
        letras: letrasLimpas,
        tempoMs,
        criadoEm: new Date().toISOString(),
        aba,
      };
      // Primeiro guarda, depois envia: se a aba fechar no meio, o tempo não se perde.
      salvarPendentes([...lerPendentes(), pendente]);
      const top = await enviar(pendente);
      return top === null
        ? { top: topConhecido(faseId), confirmado: false }
        : { top: topConhecido(faseId), confirmado: true };
    },

    esvaziarCaixaDeSaida() {
      esvaziando ??= (async () => {
        try {
          for (const pendente of lerPendentes()) {
            if ((await enviar(pendente)) === null) break; // sem rede: tenta na próxima vez
          }
        } finally {
          esvaziando = null;
        }
      })();
      return esvaziando;
    },

    ultimasLetras() {
      const valor = lerJson(storage, CHAVE_LETRAS);
      return typeof valor === 'string' ? normalizarLetras(valor) : '';
    },
  };
}
