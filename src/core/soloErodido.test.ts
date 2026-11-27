import { describe, expect, it } from 'vitest';
import {
  atualizarOcupacaoSolosErodidos,
  avancarSolosErodidos,
  criarSolosErodidos,
  pisarSoloErodido,
  reiniciarSolosErodidos,
  soloErodidoLetal,
} from './soloErodido';

const QUEBRA_SEG = 1.0;

describe('solo erodido (~)', () => {
  it('começa intacto, racha ao passar e desaba após quebraSegundos permanecendo quebrado', () => {
    const [solo] = criarSolosErodidos([{ col: 2, lin: 1 }]);

    expect(solo.etapa).toBe('intacto');
    expect(soloErodidoLetal(solo)).toBe(false);

    expect(pisarSoloErodido(solo)).toBe('acionado');
    expect(atualizarOcupacaoSolosErodidos([solo], { x: 8, y: 1 })).toEqual([]);
    expect(solo.etapa).toBe('rachando');

    expect(avancarSolosErodidos([solo], 0.5, false, QUEBRA_SEG)).toEqual([]);
    expect(solo.etapa).toBe('rachando');

    expect(avancarSolosErodidos([solo], 0.5, false, QUEBRA_SEG)).toEqual([solo]);
    expect(soloErodidoLetal(solo)).toBe(true);

    // Continua quebrado indefinidamente até reiniciar.
    expect(avancarSolosErodidos([solo], 10, false, QUEBRA_SEG)).toEqual([]);
    expect(soloErodidoLetal(solo)).toBe(true);
  });

  it('não conta segunda passada enquanto o Protagonista ainda não deixou a célula', () => {
    const [solo] = criarSolosErodidos([{ col: 3, lin: 2 }]);
    expect(pisarSoloErodido(solo)).toBe('acionado');
    expect(pisarSoloErodido(solo)).toBe('nenhum');
    expect(solo.passadas).toBe(1);
  });

  it('na segunda passada enquanto rachando, sobrevive deslizando e desaba ao sair', () => {
    const [solo] = criarSolosErodidos([{ col: 5, lin: 2 }]);
    expect(pisarSoloErodido(solo)).toBe('acionado');
    atualizarOcupacaoSolosErodidos([solo], { x: 7, y: 2 });
    expect(solo.ocupado).toBe(false);

    // Volta em 0,2 s (antes de 1,0 s): marca 2ª passada sem quebrar enquanto atravessa.
    avancarSolosErodidos([solo], 0.2, false, QUEBRA_SEG);
    expect(pisarSoloErodido(solo)).toBe('segunda_passada');
    expect(solo.etapa).toBe('rachando');
    expect(solo.passadas).toBe(2);

    // Mesmo que o tempo zere no meio da travessia da 2ª passada, não mata antes de sair.
    expect(avancarSolosErodidos([solo], 0.9, true, QUEBRA_SEG)).toEqual([]);
    expect(solo.etapa).toBe('rachando');

    // Assim que sai da célula, desaba imediatamente.
    expect(atualizarOcupacaoSolosErodidos([solo], { x: 4.4, y: 2 })).toEqual([solo]);
    expect(solo.etapa).toBe('quebrado');
    expect(soloErodidoLetal(solo)).toBe(true);
  });

  it('restaura todos os tiles para intacto ao reiniciar (morte / voltar ao Totem)', () => {
    const solos = criarSolosErodidos([
      { col: 2, lin: 1 },
      { col: 3, lin: 1 },
    ]);
    pisarSoloErodido(solos[0]);
    pisarSoloErodido(solos[1]);
    avancarSolosErodidos(solos, 1.1, false, QUEBRA_SEG);
    expect(solos.every((s) => s.etapa === 'quebrado')).toBe(true);

    reiniciarSolosErodidos(solos);
    expect(solos.every((s) => s.etapa === 'intacto' && s.passadas === 0 && !s.ocupado)).toBe(true);
  });
});
