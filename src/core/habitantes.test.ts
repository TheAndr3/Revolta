import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ErroParseHabitante, parseHabitanteMarkdown } from './habitantes';

describe('parser de conteúdo de Habitantes', () => {
  it('lê cabeçalho e fala curta de resgate em Markdown', () => {
    const markdown = [
      '---',
      'nome: Habitante da Mata',
      'retrato: assets/habitantes/placeholder-habitante.svg',
      'papel: Guardiã da trilha',
      '---',
      '',
      'Vou para o ponto de encontro avisar o grupo!',
    ].join('\n');

    expect(parseHabitanteMarkdown(markdown, 'fase-00')).toEqual({
      faseId: 'fase-00',
      nome: 'Habitante da Mata',
      retrato: 'assets/habitantes/placeholder-habitante.svg',
      papel: 'Guardiã da trilha',
      fala: 'Vou para o ponto de encontro avisar o grupo!',
    });
  });

  it('rejeita arquivo sem cabeçalho, sem nome ou sem fala', () => {
    expect(() => parseHabitanteMarkdown('Sem frontmatter', 'fase-00')).toThrow(
      ErroParseHabitante,
    );

    const semFala = [
      '---',
      'nome: Habitante',
      'retrato: retrato.svg',
      '---',
      '   ',
    ].join('\n');
    expect(() => parseHabitanteMarkdown(semFala, 'fase-00')).toThrow(ErroParseHabitante);
  });

  it('carrega o arquivo real de conteúdo do Habitante da fase-00', () => {
    const caminho = resolve(process.cwd(), 'content/habitantes/fase-00.md');
    const conteudo = readFileSync(caminho, 'utf-8');
    const habitante = parseHabitanteMarkdown(conteudo, 'fase-00');

    expect(habitante.nome.length).toBeGreaterThan(0);
    expect(habitante.retrato.length).toBeGreaterThan(0);
    expect(habitante.fala.length).toBeGreaterThan(10);
  });
});
