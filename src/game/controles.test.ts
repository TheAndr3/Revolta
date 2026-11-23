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

describe('calcularEscalaInteira (câmera de ~9 colunas, ADR 0006)', () => {
  it('mostra 9 colunas no PC, com a escala limitada pela altura (mínimo de 15 linhas)', () => {
    const fhd = calcularEscalaInteira(1920, 1080, 1, 240, 704);
    expect(fhd.escalaInteira).toBe(4); // 1080 / (15 × 16) = 4,5
    expect(fhd.larguraLogica).toBe(9 * 16);
    expect(fhd.larguraCss).toBe(576);
    expect(fhd.alturaLogica).toBe(270); // ~16,9 linhas

    const laptop = calcularEscalaInteira(1366, 768, 1, 240, 704);
    expect(laptop.escalaInteira).toBe(3);
    expect(laptop.larguraCss).toBe(432);
  });

  it('no celular retrato, o personagem fica ~2× maior que com 15 colunas', () => {
    const celular = calcularEscalaInteira(360, 640, 2, 240, 704);
    expect(celular.escalaInteira).toBe(5); // antes: 3 (15 colunas)
    expect(celular.larguraLogica).toBe(9 * 16);
    expect(celular.larguraCss).toBe(360);
    expect(celular.alturaLogica).toBe(256); // 16 linhas

    const iphone = calcularEscalaInteira(375, 812, 3, 240, 704);
    expect(iphone.escalaInteira).toBe(7);
    expect(iphone.larguraLogica).toBe(144);
    expect(Math.floor(iphone.alturaLogica / 16)).toBeGreaterThanOrEqual(15);
  });

  it('nunca passa do tamanho do mundo nem da tela', () => {
    const faseBaixa = calcularEscalaInteira(1920, 1080, 1, 240, 160);
    expect(faseBaixa.alturaLogica).toBeLessThanOrEqual(160);

    const telaMinuscula = calcularEscalaInteira(100, 200, 1, 240, 704);
    expect(telaMinuscula.escalaInteira).toBe(1);
    expect(telaMinuscula.larguraCss).toBeLessThanOrEqual(100);
  });
});
