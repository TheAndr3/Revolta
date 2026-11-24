import { describe, expect, it } from 'vitest';
import { CORES_LOGO, GLIFOS_RE, GLIFOS_VOLTA, montarLogo } from './logoRevolta';

const CORES_PERMITIDAS = new Set<string>(Object.values(CORES_LOGO));

describe('logo do Revolta', () => {
  it('cada glifo é um retângulo (todas as linhas com a mesma largura)', () => {
    for (const glifo of [...Object.values(GLIFOS_VOLTA), ...Object.values(GLIFOS_RE)]) {
      expect(new Set(glifo.map((l) => l.length)).size).toBe(1);
    }
    for (const glifo of Object.values(GLIFOS_VOLTA)) expect(glifo).toHaveLength(13);
    for (const glifo of Object.values(GLIFOS_RE)) expect(glifo).toHaveLength(9);
  });

  it('é determinística e cabe inteira no canvas', () => {
    const logo = montarLogo();
    expect(montarLogo()).toEqual(logo);
    for (const p of [...logo.volta, ...logo.re, ...logo.folhas]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(logo.largura);
      expect(p.y).toBeLessThan(logo.altura);
    }
  });

  it('usa só cores da paleta', () => {
    const logo = montarLogo();
    for (const p of [...logo.volta, ...logo.re]) expect(CORES_PERMITIDAS.has(p.cor)).toBe(true);
  });

  it('RE fica acima do VOLTA, sem encostar (com folga para flutuar 1 px)', () => {
    const logo = montarLogo();
    const fundoRe = Math.max(...logo.re.map((p) => p.y));
    expect(fundoRe + 1).toBeLessThan(logo.topoVolta - 1);
    expect(logo.caixaRe.y + logo.caixaRe.altura).toBeLessThan(logo.topoVolta);
  });

  it('VOLTA tem musgo (verdes), raízes abaixo das letras e folhas para balançar', () => {
    const logo = montarLogo();
    const verdes = logo.volta.filter((p) => p.cor === CORES_LOGO.verdeFolha || p.cor === CORES_LOGO.broto);
    expect(verdes.length).toBeGreaterThan(10);
    const baseVolta = logo.topoVolta + GLIFOS_VOLTA.V.length;
    const raizes = logo.volta.filter((p) => p.y > baseVolta + 1 && p.cor !== CORES_LOGO.noite);
    expect(raizes.length).toBeGreaterThan(5);
    expect(logo.folhas.length).toBeGreaterThan(3);
  });

  it('RE é luz de espírito: azul e claro, sem as cores de terra do VOLTA', () => {
    const logo = montarLogo();
    const coresRe = new Set(logo.re.map((p) => p.cor));
    expect(coresRe.has(CORES_LOGO.totem)).toBe(true);
    expect(coresRe.has(CORES_LOGO.luz)).toBe(true);
    for (const terra of [CORES_LOGO.barro, CORES_LOGO.madeira, CORES_LOGO.areia]) {
      expect(coresRe.has(terra)).toBe(false);
    }
  });
});
