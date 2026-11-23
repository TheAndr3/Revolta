import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  contarPalavras,
  lerQuadrosIntro,
  LIMITE_PALAVRAS_PROVA,
  nomeArquivoProva,
  validarHabitante,
  validarProva,
} from './conteudo';

function prova(corpo: string, cabecalhoExtra: readonly string[] = []): string {
  return [
    '---',
    'tipo: passado',
    'formato: Diário',
    'titulo: Margem limpa',
    'ilustracao: assets/provas/placeholder-passado.svg',
    'tema: Memória do território',
    'fontes:',
    '  - Relato fictício',
    ...cabecalhoExtra,
    '---',
    '',
    corpo,
  ].join('\n');
}

describe('check-content: Provas', () => {
  it('conta palavras ignorando pontuação solta', () => {
    expect(contarPalavras('Antes da estrada — o igarapé corria limpo.')).toBe(7);
    expect(contarPalavras('  ')).toBe(0);
  });

  it('aceita Prova com cabeçalho completo e até o limite de palavras', () => {
    const texto = Array.from({ length: LIMITE_PALAVRAS_PROVA }, () => 'mata').join(' ');
    const resultado = validarProva(prova(texto), 1, 'p.md');
    expect(resultado.erros).toEqual([]);
    expect(resultado.assets).toEqual(['assets/provas/placeholder-passado.svg']);
  });

  it('falha quando a Prova passa do limite de palavras', () => {
    const texto = Array.from({ length: LIMITE_PALAVRAS_PROVA + 1 }, () => 'mata').join(' ');
    expect(validarProva(prova(texto), 1, 'p.md').erros).toEqual([
      `p.md: o texto tem ${LIMITE_PALAVRAS_PROVA + 1} palavras; o limite é ${LIMITE_PALAVRAS_PROVA}.`,
    ]);
  });

  it('falha quando falta um campo do cabeçalho', () => {
    const semTema = prova('Texto curto.').replace('tema: Memória do território\n', '');
    const [erro] = validarProva(semTema, 1, 'p.md').erros;
    expect(erro).toMatch(/^p\.md: .*"tema"/);
  });

  it('usa o nome de arquivo esperado para cada Prova', () => {
    expect(nomeArquivoProva(1)).toBe('1-passado.md');
    expect(nomeArquivoProva(3)).toBe('3-responsaveis.md');
  });

  it('o conteúdo atual do projeto passa', () => {
    const caminho = resolve(process.cwd(), 'content/provas/fase-00/1-passado.md');
    expect(validarProva(readFileSync(caminho, 'utf-8'), 1, caminho).erros).toEqual([]);
  });
});

describe('check-content: Habitantes', () => {
  const habitante = (cabecalho: readonly string[], fala = 'Obrigada!') =>
    ['---', ...cabecalho, '---', '', fala].join('\n');

  it('aceita Habitante com nome, retrato, papel e fala', () => {
    const resultado = validarHabitante(
      habitante(['nome: Iara', 'retrato: assets/habitantes/iara.png', 'papel: Guarda o igarapé']),
      'fase-01',
      'h.md',
    );
    expect(resultado.erros).toEqual([]);
    expect(resultado.assets).toEqual(['assets/habitantes/iara.png']);
  });

  it('exige o papel (a frase da ficha no Arquivo)', () => {
    const resultado = validarHabitante(
      habitante(['nome: Iara', 'retrato: assets/habitantes/iara.png']),
      'fase-01',
      'h.md',
    );
    expect(resultado.erros).toEqual([
      'h.md: campo "papel" ausente no cabeçalho (é a frase da ficha no Arquivo da Resistência).',
    ]);
  });

  it('acusa campo obrigatório ausente e fala vazia', () => {
    expect(validarHabitante(habitante(['retrato: r.png', 'papel: x']), 'f', 'h.md').erros[0]).toMatch(
      /"nome"/,
    );
    expect(
      validarHabitante(habitante(['nome: Iara', 'retrato: r.png', 'papel: x'], ''), 'f', 'h.md')
        .erros[0],
    ).toMatch(/fala/);
  });
});

describe('check-content: introdução', () => {
  const quadro = { imagem: 'a.svg', descricao: 'Aldeia', texto: 'Era uma vez.' };

  it('lê os 3 quadros', () => {
    expect(lerQuadrosIntro({ quadros: [quadro, quadro, quadro] })).toHaveLength(3);
  });

  it('exige exatamente 3 quadros com imagem, descrição e texto', () => {
    expect(() => lerQuadrosIntro({ quadros: [quadro, quadro] })).toThrow(/devem ser 3/);
    expect(() => lerQuadrosIntro({ quadros: [quadro, quadro, { ...quadro, texto: '' }] })).toThrow(
      /quadro 3 está sem o campo "texto"/,
    );
    expect(() => lerQuadrosIntro(null)).toThrow(/"quadros"/);
  });

  it('o content/intro.json do projeto é válido', () => {
    const bruto: unknown = JSON.parse(
      readFileSync(resolve(process.cwd(), 'content/intro.json'), 'utf-8'),
    );
    expect(lerQuadrosIntro(bruto)).toHaveLength(3);
  });
});
