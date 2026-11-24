import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFase } from '../core/parser';
import { LADO, copasDaMata, ehParede, ladosComParede, mascaraTrilha } from './cenarioFloresta';

const FASE = parseFase(readFileSync(resolve(process.cwd(), 'public/fases/fase-01.txt'), 'utf-8'));

describe('cenário da floresta (estilo limpo)', () => {
  it('calcula a máscara de vizinhos de chão (N=1, L=2, S=4, O=8)', () => {
    // Início (1,69): parede acima, chão à direita, parede abaixo e à esquerda.
    expect(mascaraTrilha(FASE.grade, 1, 69)).toBe(LADO.leste);
    // Poço final (13,20): chão acima e abaixo.
    expect(mascaraTrilha(FASE.grade, 13, 20)).toBe(LADO.norte | LADO.sul);
  });

  it('marca borda em todo lado da trilha que encosta na mata (fora do mapa conta como mata)', () => {
    expect(ladosComParede(FASE.grade, 1, 69)).toBe(LADO.norte | LADO.sul | LADO.oeste);
    expect(ladosComParede(FASE.grade, 13, 20)).toBe(LADO.leste | LADO.oeste);
    expect(ehParede(FASE.grade, -1, 0)).toBe(true);
    expect(ehParede(FASE.grade, 0, FASE.altura)).toBe(true);
  });

  it('põe copas só no miolo da mata, longe da beira da trilha, de forma estável', () => {
    const copas = copasDaMata(FASE.grade);
    expect(copas.length).toBeGreaterThan(20);
    expect(copasDaMata(FASE.grade)).toEqual(copas);
    for (const { col, lin, raio } of copas) {
      for (let dl = -1; dl <= 1; dl++) {
        for (let dc = -1; dc <= 1; dc++) expect(ehParede(FASE.grade, col + dc, lin + dl)).toBe(true);
      }
      expect(raio).toBeGreaterThanOrEqual(0.35);
      expect(raio).toBeLessThanOrEqual(0.6);
    }
  });
});
