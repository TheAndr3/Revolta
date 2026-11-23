import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { interpretarTrechos, lerMarkdownSimples } from './markdownSimples';

describe('markdown simples', () => {
  it('separa cabeçalho, títulos, parágrafos e listas', () => {
    const doc = lerMarkdownSimples(
      [
        '---',
        'titulo: Sobre',
        '---',
        'Primeira linha',
        'continua o parágrafo.',
        '',
        '## Fontes',
        '- Item um',
        '- [Item dois](https://exemplo.org)',
      ].join('\r\n'),
    );

    expect(doc.cabecalho.get('titulo')).toBe('Sobre');
    expect(doc.blocos).toEqual([
      { tipo: 'paragrafo', trechos: [{ texto: 'Primeira linha continua o parágrafo.' }] },
      { tipo: 'titulo', texto: 'Fontes' },
      {
        tipo: 'lista',
        itens: [[{ texto: 'Item um' }], [{ texto: 'Item dois', href: 'https://exemplo.org' }]],
      },
    ]);
  });

  it('só transforma em link endereços http(s)', () => {
    expect(interpretarTrechos('Veja [o site](https://a.org) e [isto](javascript:alert(1)).')).toEqual([
      { texto: 'Veja ' },
      { texto: 'o site', href: 'https://a.org' },
      { texto: ' e ' },
      { texto: 'isto' },
      { texto: ').' },
    ]);
  });

  it('lê o content/sobre.md do projeto com título e uma lista de fontes', () => {
    const doc = lerMarkdownSimples(
      readFileSync(resolve(process.cwd(), 'content/sobre.md'), 'utf-8'),
    );
    expect(doc.cabecalho.get('titulo')).toBeTruthy();
    expect(doc.blocos.some((b) => b.tipo === 'lista')).toBe(true);
  });
});
