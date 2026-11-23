import { describe, expect, it } from 'vitest';
import { CONFIG_AUDIO, IDS_SOM, mixagem, sonsDoEvento, volumePorDistancia } from './audio';

describe('áudio: eventos → sons', () => {
  it('liga cada evento do núcleo ao seu efeito', () => {
    expect(sonsDoEvento('iniciou_deslize')).toEqual(['deslize']);
    expect(sonsDoEvento('parou_na_parede')).toEqual(['batida']);
    expect(sonsDoEvento('tranco')).toEqual(['tranco']);
    expect(sonsDoEvento('prova_coletada')).toEqual(['prova']);
    expect(sonsDoEvento('totem_ativado')).toEqual(['totem']);
    expect(sonsDoEvento('saida_acesa')).toEqual(['saida']);
    expect(sonsDoEvento('morreu')).toEqual(['morte', 'reaparecer']);
    expect(sonsDoEvento('retornou_ao_totem')).toEqual(['reaparecer']);
    expect(sonsDoEvento('espinho_acionado')).toEqual(['espinho']);
    expect(sonsDoEvento('habitante_resgatado')).toEqual(['resgate']);
    expect(sonsDoEvento('fase_concluida')).toEqual(['conclusao']);
  });

  it('ignora eventos sem som', () => {
    expect(sonsDoEvento('ciclos_reiniciados')).toEqual([]);
    expect(sonsDoEvento('abrir_prova')).toEqual([]);
    expect(sonsDoEvento('evento_desconhecido')).toEqual([]);
  });

  it('todo efeito é usado por algum evento ou pela interface', () => {
    const eventos = [
      'iniciou_deslize', 'parou_na_parede', 'tranco', 'prova_coletada', 'totem_ativado',
      'saida_acesa', 'morreu', 'retornou_ao_totem', 'espinho_acionado',
      'habitante_resgatado', 'fase_concluida',
    ];
    const usados = new Set([...eventos.flatMap(sonsDoEvento), 'interface']);
    expect([...usados].sort()).toEqual([...IDS_SOM].sort());
  });
});

describe('áudio: volume pela distância', () => {
  it('é máximo colado, cai com a distância e zera no alcance', () => {
    expect(volumePorDistancia(0, 8, 0.5)).toBeCloseTo(0.5);
    expect(volumePorDistancia(4, 8, 0.5)).toBeCloseTo(0.125); // (1 - 0,5)² × 0,5
    expect(volumePorDistancia(8, 8, 0.5)).toBe(0);
    expect(volumePorDistancia(20, 8, 0.5)).toBe(0);
  });

  it('é sempre crescente quando a Ameaça se aproxima', () => {
    const volumes = [8, 6, 4, 2, 0].map((d) => volumePorDistancia(d, 8, 1));
    for (let i = 1; i < volumes.length; i++) expect(volumes[i]).toBeGreaterThan(volumes[i - 1]);
  });

  it('fica em silêncio sem Ameaça ou com valores inválidos', () => {
    expect(volumePorDistancia(null, 8, 1)).toBe(0);
    expect(volumePorDistancia(Number.NaN, 8, 1)).toBe(0);
    expect(volumePorDistancia(1, 0, 1)).toBe(0);
  });
});

describe('áudio: mixagem com a Prova aberta ou em pausa', () => {
  it('a música continua (mais baixa) e só os sons do jogo param', () => {
    const jogando = mixagem(false);
    const pausado = mixagem(true);
    expect(jogando.musica).toBe(CONFIG_AUDIO.volumeMusica);
    expect(pausado.musica).toBeGreaterThan(0);
    expect(pausado.musica).toBeLessThan(jogando.musica);
    expect(pausado.efeitos).toBe(0);
    expect(jogando.efeitos).toBe(CONFIG_AUDIO.volumeEfeitos);
  });

  it('os cliques de interface tocam mesmo em pausa', () => {
    expect(mixagem(true).interface).toBeGreaterThan(0);
    expect(mixagem(true).interface).toBe(mixagem(false).interface);
  });
});
