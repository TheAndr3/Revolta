import { describe, expect, it } from 'vitest';
import {
  listarProvasSalvas,
  salvarProvaColetada,
  type StorageBasico,
} from './armazenamentoProvas';
import { carregarConteudoProvasDaFase } from './carregarProvas';

function criarStorageMemoria(): StorageBasico {
  const dados = new Map<string, string>();
  return {
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => {
      dados.set(chave, valor);
    },
  };
}

describe('armazenamento e carregamento de Provas', () => {
  it('salva Provas coletadas sem duplicar e lista em ordem estável', () => {
    const storage = criarStorageMemoria();

    salvarProvaColetada('fase-00', 2, storage);
    salvarProvaColetada('fase-00', 1, storage);
    salvarProvaColetada('fase-00', 2, storage);

    expect(listarProvasSalvas(storage)).toEqual(['fase-00:1', 'fase-00:2']);
  });

  it('carrega os 3 arquivos de conteúdo da fase-00 via arquivos Markdown', () => {
    const provas = carregarConteudoProvasDaFase('fase-00');

    expect(provas[1].rotuloTipo).toBe('O Passado');
    expect(provas[2].rotuloTipo).toBe('A Transformação');
    expect(provas[3].rotuloTipo).toBe('Os Responsáveis');
    expect(provas[1].texto.length).toBeGreaterThan(20);
  });
});
