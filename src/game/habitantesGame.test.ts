import { describe, expect, it } from 'vitest';
import type { StorageBasico } from './armazenamentoProvas';
import {
  listarHabitantesResgatados,
  numerosResgatados,
  salvarHabitanteResgatado,
} from './armazenamentoHabitantes';
import { carregarConteudoHabitantesDaFase } from './carregarHabitante';
import { linhaDoHabitante } from './habitantesSprites';

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
  it('salva cada Habitante da Fase sem duplicar e lista em ordem estável', () => {
    const storage = criarStorageMemoria();

    salvarHabitanteResgatado('fase-02', 1, storage);
    salvarHabitanteResgatado('fase-01', 2, storage);
    salvarHabitanteResgatado('fase-02', 1, storage);

    expect(listarHabitantesResgatados(storage)).toEqual(['fase-01#2', 'fase-02#1']);
  });

  it('lê os números resgatados de uma Fase, contando save antigo (só o id) como o Habitante 1', () => {
    const chaves = ['fase-01', 'fase-01#3', 'fase-02#2', 'fase-01#x'];
    expect([...numerosResgatados(chaves, 'fase-01')].sort()).toEqual([1, 3]);
    expect([...numerosResgatados(chaves, 'fase-02')]).toEqual([2]);
    expect(numerosResgatados(chaves, 'fase-03').size).toBe(0);
  });

  it('carrega os Habitantes da Fase única em ordem de número, um arquivo por H', () => {
    const habitantes = carregarConteudoHabitantesDaFase('fase-01');

    expect(habitantes.map((h) => h.numero)).toEqual([1, 2, 3]);
    for (const habitante of habitantes) {
      expect(habitante.fala.length).toBeGreaterThan(10);
      expect(habitante.nome.length).toBeGreaterThan(0);
    }
    // Aparências diferentes: dois Habitantes da mesma Fase não ficam iguais no mapa.
    const linhas = habitantes.map((h) => linhaDoHabitante(h.aparencia, h.numero));
    expect(new Set(linhas).size).toBe(habitantes.length);
  });

  it('escolhe a linha da spritesheet pela aparência ou, sem ela, pelo número', () => {
    expect(linhaDoHabitante('avo', 1)).toBe(1);
    expect(linhaDoHabitante('', 1)).toBe(0);
    expect(linhaDoHabitante('desconhecida', 3)).toBe(2);
    expect(linhaDoHabitante(undefined, 4)).toBe(0);
  });
});
