import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StorageBasico } from './armazenamentoProvas';
import { criarClienteRanking } from './ranking';

function storageEmMemoria(): StorageBasico & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
  };
}

const URL_TESTE = 'https://exemplo.test/exec';

function respostaJson(corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cliente do Ranking', () => {
  it('sem rede, o tempo fica na caixa de saída e já aparece no Ranking conhecido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const storage = storageEmMemoria();
    const cliente = criarClienteRanking(URL_TESTE, storage);

    const resultado = await cliente.gravar('fase-01', 'and', 32_000);

    expect(resultado.confirmado).toBe(false);
    expect(resultado.top.map((e) => [e.letras, e.tempoMs])).toEqual([['AND', 32_000]]);
    expect(cliente.ultimasLetras()).toBe('AND');
    // Um cliente novo (jogo reaberto) ainda vê o pendente.
    expect(criarClienteRanking(URL_TESTE, storage).topConhecido('fase-01')).toHaveLength(1);
  });

  it('reenvia a caixa de saída com o mesmo id e a esvazia quando o servidor confirma', async () => {
    const storage = storageEmMemoria();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await criarClienteRanking(URL_TESTE, storage).gravar('fase-01', 'AND', 32_000);

    const corpos: { id: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        corpos.push(JSON.parse(String(init?.body)));
        return respostaJson({
          ok: true,
          top: [{ letras: 'AND', tempoMs: 32_000, gravadoEm: '2026-11-25T10:00:00.000Z' }],
        });
      }),
    );
    const cliente = criarClienteRanking(URL_TESTE, storage);
    await cliente.esvaziarCaixaDeSaida();
    await cliente.esvaziarCaixaDeSaida();

    expect(corpos).toHaveLength(1);
    // Confirmado, o tempo vem do cache do servidor e não aparece duplicado.
    expect(cliente.topConhecido('fase-01')).toHaveLength(1);
  });

  it('carrega o top 10 e guarda em cache para abrir sem rede', async () => {
    const storage = storageEmMemoria();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respostaJson({ ok: true, top: [{ letras: 'ZZZ', tempoMs: 40_000, gravadoEm: 'x' }] }),
      ),
    );
    const top = await criarClienteRanking(URL_TESTE, storage).carregarTop('fase-01');
    expect(top?.map((e) => e.letras)).toEqual(['ZZZ']);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const offline = criarClienteRanking(URL_TESTE, storage);
    expect(await offline.carregarTop('fase-01')).toBeNull();
    expect(offline.topConhecido('fase-01').map((e) => e.letras)).toEqual(['ZZZ']);
  });

  it('sem URL configurada, não toca a rede', async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);
    const cliente = criarClienteRanking('', storageEmMemoria());
    expect(cliente.disponivel).toBe(false);
    expect(await cliente.carregarTop('fase-01')).toBeNull();
    expect((await cliente.gravar('fase-01', 'AND', 32_000)).confirmado).toBe(false);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
