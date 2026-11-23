import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFase } from '../core/parser';
import {
  DISTANCIA_MESMA_FAMILIA,
  decorarParedes,
  familia,
  mascaraTrilha,
  OBJETOS_GRANDES,
  TRILHA_POR_MASCARA,
  variacaoGrama,
} from './cenarioFloresta';

const FASE = parseFase(readFileSync(resolve(process.cwd(), 'public/fases/fase-01.txt'), 'utf-8'));

describe('cenário da floresta', () => {
  it('tem uma peça de trilha para cada uma das 16 máscaras de vizinhos', () => {
    expect(TRILHA_POR_MASCARA).toHaveLength(16);
    expect(new Set(TRILHA_POR_MASCARA.map(([c, l]) => `${c},${l}`)).size).toBe(16);
  });

  it('calcula a máscara de vizinhos de chão (N=1, L=2, S=4, O=8)', () => {
    // Início (1,58): parede acima, chão à direita, parede abaixo e à esquerda.
    expect(mascaraTrilha(FASE.grade, 1, 58)).toBe(2);
    // Corredor vertical do poço final (13,20): chão acima e abaixo.
    expect(mascaraTrilha(FASE.grade, 13, 20)).toBe(1 | 4);
  });

  it('cobre cada célula de parede exatamente uma vez, sem invadir o chão', () => {
    const colocacoes = decorarParedes(FASE.grade);
    const contagem = FASE.grade.map((linha) => linha.map(() => 0));
    const tamanho = new Map(OBJETOS_GRANDES.map((o) => [o.chave, o]));
    for (const { chave, col, lin } of colocacoes) {
      const obj = tamanho.get(chave);
      const [w, h] = obj ? [obj.largura, obj.altura] : [1, 1];
      for (let l = lin; l < lin + h; l++) for (let c = col; c < col + w; c++) contagem[l][c] += 1;
    }
    FASE.grade.forEach((linha, l) =>
      linha.forEach((tipo, c) => expect(contagem[l][c]).toBe(tipo === 'parede' ? 1 : 0)),
    );
  });

  it('é determinístico e usa objetos grandes onde cabem', () => {
    const a = decorarParedes(FASE.grade);
    expect(decorarParedes(FASE.grade)).toEqual(a);
    expect(a.some((c) => !c.chave.startsWith('pequeno:'))).toBe(true);
    expect(variacaoGrama(3, 4)).toBe(variacaoGrama(3, 4));
  });

  it('não repete objetos da mesma família perto um do outro', () => {
    const grandes = decorarParedes(FASE.grade).filter((c) => !c.chave.startsWith('pequeno:'));
    for (const a of grandes) {
      for (const b of grandes) {
        if (a === b || familia(a.chave) !== familia(b.chave)) continue;
        const perto =
          Math.abs(a.col - b.col) < DISTANCIA_MESMA_FAMILIA.colunas &&
          Math.abs(a.lin - b.lin) < DISTANCIA_MESMA_FAMILIA.linhas;
        expect(perto, `${a.chave} (${a.col},${a.lin}) e ${b.chave} (${b.col},${b.lin})`).toBe(false);
      }
    }
  });
});
