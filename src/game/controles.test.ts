import { describe, expect, it } from 'vitest';
import { direcaoDeSwipe, direcaoDeTecla, ehTeclaPausa } from './controles';
import { calcularEscalaInteira } from './escala';

describe('controles', () => {
  it('mapeia setas e WASD corretamente', () => {
    expect(direcaoDeTecla('ArrowUp')).toBe('cima');
    expect(direcaoDeTecla('w')).toBe('cima');
    expect(direcaoDeTecla('ArrowDown')).toBe('baixo');
    expect(direcaoDeTecla('S')).toBe('baixo');
    expect(direcaoDeTecla('ArrowLeft')).toBe('esquerda');
    expect(direcaoDeTecla('a')).toBe('esquerda');
    expect(direcaoDeTecla('ArrowRight')).toBe('direita');
    expect(direcaoDeTecla('D')).toBe('direita');
    expect(direcaoDeTecla('Space')).toBeNull();
  });

  it('ignora swipes abaixo da distância mínima e reconhece o eixo dominante', () => {
    expect(direcaoDeSwipe(15, 10)).toBeNull();
    expect(direcaoDeSwipe(35, 10)).toBe('direita');
    expect(direcaoDeSwipe(-40, 12)).toBe('esquerda');
    expect(direcaoDeSwipe(8, -32)).toBe('cima');
    expect(direcaoDeSwipe(-5, 45)).toBe('baixo');
  });

  it('reconhece Esc e P como teclas de pausa', () => {
    expect(ehTeclaPausa('Escape')).toBe(true);
    expect(ehTeclaPausa('p')).toBe(true);
    expect(ehTeclaPausa('P')).toBe(true);
    expect(ehTeclaPausa('r')).toBe(false);
  });
});

describe('calcularEscalaInteira', () => {
  it('usa escala inteira ×4 em desktop Full HD e ×3 em laptop 768p', () => {
    const fhd = calcularEscalaInteira(1920, 1080, 1, 240, 704);
    expect(fhd.escalaInteira).toBe(4);
    expect(fhd.larguraLogica).toBe(240);
    expect(fhd.larguraCss).toBe(960);

    const laptop = calcularEscalaInteira(1366, 768, 1, 240, 704);
    expect(laptop.escalaInteira).toBe(3);
    expect(laptop.larguraCss).toBe(720);
  });

  it('usa escala física inteira em celular retrato sem exceder a largura da tela', () => {
    const celular = calcularEscalaInteira(360, 640, 2, 240, 704);
    expect(celular.escalaInteira).toBe(3);
    expect(celular.larguraCss).toBe(360);
    expect(celular.larguraLogica).toBe(240);
  });
});
