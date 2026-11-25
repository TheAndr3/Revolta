import { describe, expect, it } from 'vitest';
import type { StorageBasico } from './armazenamentoProvas';
import { criarRepositorioProgresso } from './armazenamentoProgresso';

function criarStorageMemoria(): StorageBasico & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => {
      dados.set(chave, valor);
    },
  };
}

function criarStorageQuebrado(): StorageBasico {
  return {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
}

describe('repositório de progresso', () => {
  it('sobrevive a "recarregar a página" (novo repositório sobre o mesmo storage)', () => {
    const storage = criarStorageMemoria();
    const primeiro = criarRepositorioProgresso(storage);
    primeiro.registrarConclusao('fase-01');
    primeiro.registrarProva('fase-01', 2);
    primeiro.registrarHabitante('fase-01', 1);
    primeiro.registrarHabitante('fase-01', 3);

    const depoisDeRecarregar = criarRepositorioProgresso(storage);
    expect(depoisDeRecarregar.faseConcluida('fase-01')).toBe(true);
    expect(depoisDeRecarregar.faseConcluida('fase-02')).toBe(false);
    expect(depoisDeRecarregar.provaColetada('fase-01', 2)).toBe(true);
    expect(depoisDeRecarregar.provaColetada('fase-01', 1)).toBe(false);
    expect([...depoisDeRecarregar.habitantesResgatados('fase-01')].sort()).toEqual([1, 3]);
    expect(depoisDeRecarregar.habitantesResgatados('fase-02').size).toBe(0);
  });

  it('continua funcionando em memória quando o armazenamento falha', () => {
    const repositorio = criarRepositorioProgresso(criarStorageQuebrado());

    expect(() => repositorio.registrarConclusao('fase-01')).not.toThrow();
    expect(() => repositorio.registrarProva('fase-01', 1)).not.toThrow();
    expect(() => repositorio.registrarHabitante('fase-01', 2)).not.toThrow();

    expect(repositorio.faseConcluida('fase-01')).toBe(true);
    expect(repositorio.provaColetada('fase-01', 1)).toBe(true);
    expect(repositorio.habitantesResgatados('fase-01').has(2)).toBe(true);
  });

  it('funciona sem armazenamento algum e ignora dados corrompidos', () => {
    const semStorage = criarRepositorioProgresso(null);
    semStorage.registrarConclusao('fase-01');
    expect(semStorage.fasesConcluidas().has('fase-01')).toBe(true);

    const corrompido = criarStorageMemoria();
    corrompido.dados.set('revolta:fases-concluidas:v1', '{nao-e-json');
    expect(criarRepositorioProgresso(corrompido).fasesConcluidas().size).toBe(0);
  });

  it('lembra que a introdução já foi vista, mesmo com o armazenamento quebrado na sessão', () => {
    const storage = criarStorageMemoria();
    const primeiro = criarRepositorioProgresso(storage);
    expect(primeiro.introVista()).toBe(false);
    primeiro.registrarIntroVista();
    expect(primeiro.introVista()).toBe(true);
    expect(criarRepositorioProgresso(storage).introVista()).toBe(true);

    const quebrado = criarRepositorioProgresso(criarStorageQuebrado());
    expect(quebrado.introVista()).toBe(false);
    expect(() => quebrado.registrarIntroVista()).not.toThrow();
    expect(quebrado.introVista()).toBe(true);
  });

  it('guarda só o melhor número de Almas de cada Fase, com o total', () => {
    const storage = criarStorageMemoria();
    const repositorio = criarRepositorioProgresso(storage);
    expect(repositorio.recordeAlmas('fase-01')).toBeNull();
    repositorio.registrarAlmas('fase-01', 30, 50);
    repositorio.registrarAlmas('fase-01', 12, 50);
    expect(repositorio.recordeAlmas('fase-01')).toEqual({ melhor: 30, total: 50 });
    expect(criarRepositorioProgresso(storage).recordeAlmas('fase-01')).toEqual({
      melhor: 30,
      total: 50,
    });

    const quebrado = criarRepositorioProgresso(criarStorageQuebrado());
    expect(() => quebrado.registrarAlmas('fase-01', 5, 20)).not.toThrow();
    expect(quebrado.recordeAlmas('fase-01')).toEqual({ melhor: 5, total: 20 });
  });
});
