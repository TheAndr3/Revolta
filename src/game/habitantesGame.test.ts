import { describe, expect, it } from 'vitest';
import type { StorageBasico } from './armazenamentoProvas';
import {
  listarHabitantesResgatados,
  salvarHabitanteResgatado,
} from './armazenamentoHabitantes';
import { carregarConteudoHabitanteDaFase } from './carregarHabitante';

function criarStorageMemoria(): StorageBasico {
  const dados = new Map<string, string>();
  return {
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => {
      dados.set(chave, valor);
    },
  };
}

describe('armazenamento e carregamento de Habitantes', () => {
  it('salva resgates sem duplicar e lista em ordem estável', () => {
    const storage = criarStorageMemoria();

    salvarHabitanteResgatado('fase-02', storage);
    salvarHabitanteResgatado('fase-00', storage);
    salvarHabitanteResgatado('fase-02', storage);

    expect(listarHabitantesResgatados(storage)).toEqual(['fase-00', 'fase-02']);
  });

  it('carrega a fala do Habitante da fase-00 a partir do arquivo de conteúdo', () => {
    const habitante = carregarConteudoHabitanteDaFase('fase-00');

    expect(habitante).not.toBeNull();
    expect(habitante?.fala.length).toBeGreaterThan(10);
    expect(habitante?.nome.length).toBeGreaterThan(0);
  });
});
