import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import catalogoJson from '../../content/fases.json';
import { lerCatalogoFases } from '../core/progresso';
import { carregarConteudoProvasDaFase } from './carregarProvas';
import { textoPorCaminho } from './textos';

const HTML = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');

describe('textos de tela', () => {
  it('todo data-texto* do index.html existe em content/telas.json', () => {
    const caminhos = [...HTML.matchAll(/data-texto(?:-aria|-title)?="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(caminhos.length).toBeGreaterThan(10);
    const ausentes = caminhos.filter((caminho) => textoPorCaminho(caminho) === null);
    expect(ausentes).toEqual([]);
  });

  it('busca textos por caminho e devolve null para caminhos inválidos', () => {
    expect(textoPorCaminho('menu.jogar')).toBe('Jogar');
    expect(textoPorCaminho('menu')).toBeNull();
    expect(textoPorCaminho('menu.inexistente')).toBeNull();
  });
});

describe('catálogo de Fases do protótipo', () => {
  const catalogo = lerCatalogoFases(catalogoJson);

  it('tem as 4 Fases do protótipo', () => {
    expect(catalogo).toHaveLength(4);
  });

  it('cada Fase aponta para um mapa e um conteúdo existentes', () => {
    for (const entrada of catalogo) {
      expect(() => readFileSync(resolve(__dirname, '../../public', entrada.mapa))).not.toThrow();
      expect(() => carregarConteudoProvasDaFase(entrada.conteudo)).not.toThrow();
    }
  });
});
