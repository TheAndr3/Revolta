import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ErroParseProva,
  parseProvaMarkdown,
  resumirTexto,
  ROTULO_TIPO_PROVA,
} from './provas';

describe('resumo da Prova (aviso ao coletar)', () => {
  it('usa a primeira frase do texto', () => {
    expect(resumirTexto('O rio corria limpo. Depois veio a estrada.')).toBe('O rio corria limpo.');
  });

  it('corta frases longas com reticências', () => {
    const longa = Array.from({ length: 30 }, (_, i) => `palavra${i}`).join(' ') + '.';
    const resumo = resumirTexto(longa, 5);
    expect(resumo).toBe('palavra0 palavra1 palavra2 palavra3 palavra4…');
  });

  it('prefere o campo "resumo" do cabeçalho quando existe', () => {
    const markdown = [
      '---',
      'tipo: passado',
      'formato: Diário',
      'titulo: Margem limpa',
      'ilustracao: a.svg',
      'tema: Memória',
      'resumo: Um diário do tempo em que o rio era limpo.',
      'fontes:',
      '  - Relato',
      '---',
      '',
      'Texto longo da Prova.',
    ].join('\n');
    expect(parseProvaMarkdown(markdown, 1).resumo).toBe(
      'Um diário do tempo em que o rio era limpo.',
    );
  });
});

describe('parser de conteúdo de Provas', () => {
  it('lê cabeçalho completo e parágrafos do corpo em Markdown', () => {
    const markdown = [
      '---',
      'tipo: passado',
      'formato: Diário',
      'titulo: Margem limpa',
      'ilustracao: assets/provas/placeholder-passado.svg',
      'tema: Memória do território',
      'fontes:',
      '  - Relato fictício A',
      '  - Relato fictício B',
      '---',
      '',
      'Primeiro parágrafo da história.',
      '',
      'Segundo parágrafo da história.',
    ].join('\n');

    const prova = parseProvaMarkdown(markdown, 1);

    expect(prova).toEqual({
      numero: 1,
      tipo: 'passado',
      rotuloTipo: ROTULO_TIPO_PROVA.passado,
      formato: 'Diário',
      titulo: 'Margem limpa',
      ilustracao: 'assets/provas/placeholder-passado.svg',
      tema: 'Memória do território',
      fontes: ['Relato fictício A', 'Relato fictício B'],
      texto: 'Primeiro parágrafo da história.\n\nSegundo parágrafo da história.',
      paragrafos: [
        'Primeiro parágrafo da história.',
        'Segundo parágrafo da história.',
      ],
      resumo: 'Primeiro parágrafo da história.',
    });
  });

  it('aceita chaves acentuadas e rótulos por extenso no cabeçalho', () => {
    const markdown = [
      '---',
      'tipo: A Transformação',
      'formato: Carta',
      'título: Água turva',
      'ilustração: assets/provas/placeholder-transformacao.svg',
      'tema: Contaminação',
      'fontes: Registro local',
      '---',
      '',
      'Texto curto.',
    ].join('\n');

    const prova = parseProvaMarkdown(markdown, 2);
    expect(prova.tipo).toBe('transformacao');
    expect(prova.rotuloTipo).toBe('A Transformação');
    expect(prova.titulo).toBe('Água turva');
    expect(prova.fontes).toEqual(['Registro local']);
  });

  it('rejeita arquivo sem frontmatter, com campo obrigatório faltando ou tipo incoerente', () => {
    expect(() => parseProvaMarkdown('Só texto sem cabeçalho', 1)).toThrow(ErroParseProva);

    const semTitulo = [
      '---',
      'tipo: passado',
      'formato: Carta',
      'ilustracao: img.svg',
      'tema: Floresta',
      'fontes: Fonte 1',
      '---',
      'Corpo.',
    ].join('\n');
    expect(() => parseProvaMarkdown(semTitulo, 1)).toThrow(ErroParseProva);

    const tipoTrocado = [
      '---',
      'tipo: responsaveis',
      'formato: Carta',
      'titulo: Título',
      'ilustracao: img.svg',
      'tema: Floresta',
      'fontes: Fonte 1',
      '---',
      'Corpo.',
    ].join('\n');
    expect(() => parseProvaMarkdown(tipoTrocado, 1)).toThrow(ErroParseProva);
  });

  it('carrega os 3 arquivos reais de conteúdo da fase-00', () => {
    const arquivos = [
      { numero: 1 as const, nome: '1-passado.md', tipo: 'passado' as const },
      { numero: 2 as const, nome: '2-transformacao.md', tipo: 'transformacao' as const },
      { numero: 3 as const, nome: '3-responsaveis.md', tipo: 'responsaveis' as const },
    ];

    for (const item of arquivos) {
      const caminho = resolve(process.cwd(), 'content/provas/fase-00', item.nome);
      const conteudo = readFileSync(caminho, 'utf-8');
      const prova = parseProvaMarkdown(conteudo, item.numero);

      expect(prova.numero).toBe(item.numero);
      expect(prova.tipo).toBe(item.tipo);
      expect(prova.titulo.length).toBeGreaterThan(0);
      expect(prova.ilustracao.length).toBeGreaterThan(0);
      expect(prova.paragrafos.length).toBeGreaterThan(0);
      expect(prova.fontes.length).toBeGreaterThan(0);
    }
  });
});
