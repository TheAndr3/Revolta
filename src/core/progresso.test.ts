import { describe, expect, it } from 'vitest';
import {
  ErroCatalogoFases,
  faseDesbloqueada,
  formatarTempo,
  lerCatalogoFases,
  preencherModelo,
  proximaFase,
} from './progresso';

const CATALOGO = lerCatalogoFases({
  fases: [
    { id: 'fase-01', nome: 'Fase 1', mapa: 'fases/a.txt', conteudo: 'fase-00' },
    { id: 'fase-02', nome: 'Fase 2', mapa: 'fases/b.txt', conteudo: 'fase-00' },
    { id: 'fase-03', nome: 'Fase 3', mapa: 'fases/c.txt', conteudo: 'fase-00' },
  ],
});

describe('catálogo de Fases', () => {
  it('lê as Fases na ordem e completa o subtítulo vazio', () => {
    expect(CATALOGO.map((f) => f.id)).toEqual(['fase-01', 'fase-02', 'fase-03']);
    expect(CATALOGO[0].subtitulo).toBe('');
  });

  it('rejeita campo ausente, id repetido e lista vazia', () => {
    expect(() => lerCatalogoFases({ fases: [{ id: 'x', nome: 'X', mapa: 'm' }] })).toThrow(
      /campo "conteudo"/,
    );
    expect(() =>
      lerCatalogoFases({
        fases: [
          { id: 'x', nome: 'X', mapa: 'm', conteudo: 'c' },
          { id: 'x', nome: 'Y', mapa: 'm', conteudo: 'c' },
        ],
      }),
    ).toThrow(/mais de uma vez/);
    expect(() => lerCatalogoFases({ fases: [] })).toThrow(ErroCatalogoFases);
    expect(() => lerCatalogoFases(null)).toThrow(ErroCatalogoFases);
  });
});

describe('desbloqueio de Fases', () => {
  it('libera todas as Fases do catálogo desde o início', () => {
    const nenhuma = new Set<string>();
    expect([0, 1, 2].map((i) => faseDesbloqueada(CATALOGO, i, nenhuma))).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('trata índices fora do catálogo como bloqueados', () => {
    expect(faseDesbloqueada(CATALOGO, -1, new Set())).toBe(false);
    expect(faseDesbloqueada(CATALOGO, 3, new Set(['fase-03']))).toBe(false);
  });

  it('indica a próxima Fase e o fim do protótipo', () => {
    expect(proximaFase(CATALOGO, 0)).toBe(1);
    expect(proximaFase(CATALOGO, 2)).toBeNull();
  });
});

describe('formatação', () => {
  it('formata o tempo em m:ss e h:mm:ss', () => {
    expect(formatarTempo(0)).toBe('0:00');
    expect(formatarTempo(65.9)).toBe('1:05');
    expect(formatarTempo(3725)).toBe('1:02:05');
    expect(formatarTempo(Number.NaN)).toBe('0:00');
  });

  it('preenche modelos de texto e mantém chaves desconhecidas', () => {
    expect(preencherModelo('Provas {coletadas}/{total}', { coletadas: 2, total: 3 })).toBe(
      'Provas 2/3',
    );
    expect(preencherModelo('Olá {nome}', {})).toBe('Olá {nome}');
  });
});
