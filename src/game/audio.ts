/**
 * Motor de áudio (#30), com Web Audio.
 *
 * - Música em loop (também no menu), que começa no "Toque para começar".
 * - Efeitos nos eventos do núcleo e na interface.
 * - Loops da Gosma e do Drone, com volume pela distância ao Protagonista.
 * - Com a Prova aberta ou em pausa, os sons do jogo param e a música segue mais
 *   baixa (a trilha nunca é interrompida); os cliques de interface continuam.
 *
 * Cada som usa o arquivo de `ARQUIVOS_AUDIO` se existir; senão, uma versão
 * provisória sintetizada aqui mesmo. Sem botão de mudo: o volume geral fica
 * com o sistema e o navegador.
 */
import { CONFIG_AUDIO, mixagem, volumePorDistancia, type IdLoop, type IdSom } from '../core/audio';
import { ARQUIVOS_AUDIO } from './arquivosAudio';

export interface MotorAudio {
  /** Cria/retoma o contexto de áudio. Chamar num gesto do jogador (toque ou clique). */
  desbloquear(): void;
  tocar(id: IdSom): void;
  /** Liga os loops das Ameaças que existem na Fase (desliga os outros). */
  iniciarLoopsAmeacas(ameacas: { readonly gosma: boolean; readonly drone: boolean }): void;
  pararLoopsAmeacas(): void;
  /** Distância em tiles até a Gosma e o Drone mais próximos (`null` se não houver). */
  atualizarDistancias(gosma: number | null, drone: number | null): void;
  pausar(): void;
  retomar(): void;
}

type ContextoAudio = AudioContext;

interface LoopAtivo {
  readonly ganho: GainNode;
  parar(): void;
}

const NOTAS_MUSICA = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63, 220, 196];

function obterConstrutorContexto(): (new () => AudioContext) | null {
  if (typeof window === 'undefined') return null;
  const w = window as typeof window & { webkitAudioContext?: new () => AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function criarMotorAudio(baseUrl: string): MotorAudio {
  const Construtor = obterConstrutorContexto();
  let ctx: ContextoAudio | null = null;
  let saidaMusica: GainNode | null = null;
  let saidaEfeitos: GainNode | null = null;
  let saidaInterface: GainNode | null = null;
  let ruido: AudioBuffer | null = null;
  const buffers = new Map<IdSom | IdLoop, AudioBuffer>();
  const loops: Partial<Record<IdLoop, LoopAtivo>> = {};
  let pausadoPeloJogo = false;
  let intervaloMusica: number | null = null;
  let passoMusica = 0;

  // ------------------------------------------------------------ utilidades

  const agora = () => ctx?.currentTime ?? 0;

  function bufferRuido(c: ContextoAudio): AudioBuffer {
    if (ruido) return ruido;
    ruido = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const dados = ruido.getChannelData(0);
    // Ruído pseudoaleatório com semente fixa: o mesmo som em toda execução.
    let semente = 1234567;
    for (let i = 0; i < dados.length; i++) {
      semente = (semente * 1103515245 + 12345) & 0x7fffffff;
      dados[i] = (semente / 0x7fffffff) * 2 - 1;
    }
    return ruido;
  }

  function envelope(c: ContextoAudio, destino: AudioNode, inicio: number, duracao: number, volume: number, ataque = 0.005): GainNode {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), inicio + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
    g.connect(destino);
    return g;
  }

  function tom(
    freq: number,
    duracao: number,
    opcoes: {
      tipo?: OscillatorType;
      volume?: number;
      atraso?: number;
      freqFinal?: number;
      ataque?: number;
      destino?: AudioNode | null;
    } = {},
  ): void {
    const destino = opcoes.destino ?? saidaEfeitos;
    if (!ctx || !destino) return;
    const inicio = agora() + (opcoes.atraso ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opcoes.tipo ?? 'sine';
    osc.frequency.setValueAtTime(freq, inicio);
    if (opcoes.freqFinal) {
      osc.frequency.exponentialRampToValueAtTime(opcoes.freqFinal, inicio + duracao);
    }
    osc.connect(envelope(ctx, destino, inicio, duracao, opcoes.volume ?? 0.3, opcoes.ataque));
    osc.start(inicio);
    osc.stop(inicio + duracao + 0.02);
  }

  function chiado(
    duracao: number,
    opcoes: { filtro?: BiquadFilterType; freq?: number; freqFinal?: number; volume?: number; atraso?: number } = {},
  ): void {
    if (!ctx || !saidaEfeitos) return;
    const inicio = agora() + (opcoes.atraso ?? 0);
    const fonte = ctx.createBufferSource();
    fonte.buffer = bufferRuido(ctx);
    const filtro = ctx.createBiquadFilter();
    filtro.type = opcoes.filtro ?? 'bandpass';
    filtro.frequency.setValueAtTime(opcoes.freq ?? 1000, inicio);
    if (opcoes.freqFinal) {
      filtro.frequency.exponentialRampToValueAtTime(opcoes.freqFinal, inicio + duracao);
    }
    fonte.connect(filtro);
    filtro.connect(envelope(ctx, saidaEfeitos, inicio, duracao, opcoes.volume ?? 0.3, 0.01));
    fonte.start(inicio);
    fonte.stop(inicio + duracao + 0.02);
  }

  // ------------------------------------------------- efeitos provisórios

  const SINTETIZADOS: Record<IdSom, () => void> = {
    deslize: () => chiado(0.18, { freq: 900, freqFinal: 2600, volume: 0.18 }),
    batida: () => {
      tom(120, 0.14, { freqFinal: 55, volume: 0.5 });
      chiado(0.06, { filtro: 'lowpass', freq: 500, volume: 0.2 });
    },
    tranco: () => tom(170, 0.07, { freqFinal: 120, volume: 0.2 }),
    prova: () => [660, 880, 1320].forEach((f, i) => tom(f, 0.16, { tipo: 'triangle', volume: 0.22, atraso: i * 0.07 })),
    totem: () => {
      tom(523.25, 0.7, { volume: 0.25, ataque: 0.01 });
      tom(783.99, 0.6, { volume: 0.15, atraso: 0.04 });
    },
    saida: () => [392, 523.25, 659.25, 783.99].forEach((f, i) => tom(f, 0.35, { tipo: 'triangle', volume: 0.2, atraso: i * 0.09 })),
    morte: () => {
      chiado(0.5, { filtro: 'lowpass', freq: 2400, freqFinal: 300, volume: 0.3 });
      tom(330, 0.45, { tipo: 'sawtooth', freqFinal: 110, volume: 0.12 });
    },
    reaparecer: () => tom(220, 0.4, { freqFinal: 660, volume: 0.18, atraso: 0.35, ataque: 0.08 }),
    espinho: () => {
      tom(900, 0.05, { tipo: 'square', volume: 0.12 });
      chiado(0.08, { filtro: 'highpass', freq: 4000, volume: 0.15 });
    },
    resgate: () => [587.33, 880].forEach((f, i) => tom(f, 0.22, { tipo: 'triangle', volume: 0.22, atraso: i * 0.12 })),
    conclusao: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tom(f, 0.45, { tipo: 'triangle', volume: 0.2, atraso: i * 0.12 })),
    interface: () => tom(880, 0.04, { volume: 0.08, destino: saidaInterface }),
    alma: () => tom(1318.5, 0.09, { tipo: 'sine', freqFinal: 1760, volume: 0.1 }),
  };

  // --------------------------------------------------------------- loops

  function loopDeArquivo(c: ContextoAudio, buffer: AudioBuffer, destino: AudioNode): LoopAtivo {
    const ganho = c.createGain();
    ganho.gain.value = 0;
    ganho.connect(destino);
    const fonte = c.createBufferSource();
    fonte.buffer = buffer;
    fonte.loop = true;
    fonte.connect(ganho);
    fonte.start();
    return { ganho, parar: () => { fonte.stop(); ganho.disconnect(); } };
  }

  function loopSintetizado(c: ContextoAudio, id: 'gosma' | 'drone', destino: AudioNode): LoopAtivo {
    const ganho = c.createGain();
    ganho.gain.value = 0;
    ganho.connect(destino);
    const nos: AudioScheduledSourceNode[] = [];

    if (id === 'gosma') {
      // Borbulhar: ruído grave com o filtro oscilando.
      const fonte = c.createBufferSource();
      fonte.buffer = bufferRuido(c);
      fonte.loop = true;
      const filtro = c.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 260;
      filtro.Q.value = 8;
      const lfo = c.createOscillator();
      lfo.frequency.value = 3.2;
      const profundidade = c.createGain();
      profundidade.gain.value = 160;
      lfo.connect(profundidade).connect(filtro.frequency);
      fonte.connect(filtro).connect(ganho);
      nos.push(fonte, lfo);
    } else {
      // Motor do Drone: duas serras desafinadas com trêmulo rápido.
      const filtro = c.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 1400;
      const tremulo = c.createGain();
      tremulo.gain.value = 0.7;
      const lfo = c.createOscillator();
      lfo.frequency.value = 22;
      const profundidade = c.createGain();
      profundidade.gain.value = 0.3;
      lfo.connect(profundidade).connect(tremulo.gain);
      for (const [freq, desafino] of [[96, 0], [192, 7]] as const) {
        const osc = c.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = desafino;
        osc.connect(filtro);
        nos.push(osc);
      }
      filtro.connect(tremulo).connect(ganho);
      nos.push(lfo);
    }

    nos.forEach((no) => no.start());
    return {
      ganho,
      parar: () => {
        nos.forEach((no) => no.stop());
        ganho.disconnect();
      },
    };
  }

  function iniciarLoop(id: IdLoop, destino: AudioNode): LoopAtivo | null {
    if (!ctx) return null;
    const buffer = buffers.get(id);
    if (buffer) return loopDeArquivo(ctx, buffer, destino);
    if (id === 'musica') return null; // a música provisória é tocada por notas (abaixo)
    return loopSintetizado(ctx, id, destino);
  }

  // ------------------------------------------------- música provisória

  function tocarNotaMusica(): void {
    if (!ctx || !saidaMusica || ctx.state !== 'running') return;
    const freq = NOTAS_MUSICA[passoMusica % NOTAS_MUSICA.length];
    passoMusica += 1;
    const inicio = agora();
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(envelope(ctx, saidaMusica, inicio, 2.4, 0.18, 0.25));
    osc.start(inicio);
    osc.stop(inicio + 2.5);
  }

  function iniciarMusica(): void {
    if (!ctx || !saidaMusica || loops.musica || intervaloMusica !== null) return;
    const deArquivo = iniciarLoop('musica', saidaMusica);
    if (deArquivo) {
      deArquivo.ganho.gain.value = 1;
      loops.musica = deArquivo;
      return;
    }
    // Provisória: um pad grave contínuo e notas lentas de uma escala pentatônica.
    const pad = ctx.createGain();
    pad.gain.value = 0.12;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 600;
    pad.connect(filtro).connect(saidaMusica);
    const oscs = [110, 164.81].map((freq) => {
      const osc = ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(pad);
      osc.start();
      return osc;
    });
    loops.musica = { ganho: pad, parar: () => oscs.forEach((o) => o.stop()) };
    tocarNotaMusica();
    intervaloMusica = window.setInterval(tocarNotaMusica, 1600);
  }

  // ------------------------------------------------- arquivos (#5 e #6)

  function carregarArquivos(c: ContextoAudio): void {
    for (const [id, caminho] of Object.entries(ARQUIVOS_AUDIO) as Array<[IdSom | IdLoop, string]>) {
      fetch(`${baseUrl}${caminho}`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
        .then((dados) => c.decodeAudioData(dados))
        .then((buffer) => {
          buffers.set(id, buffer);
          if (id === 'musica' && loops.musica && intervaloMusica !== null) {
            // A música real chegou depois da provisória: troca.
            window.clearInterval(intervaloMusica);
            intervaloMusica = null;
            loops.musica.parar();
            delete loops.musica;
            iniciarMusica();
          }
        })
        .catch((erro: unknown) => {
          console.warn(`Áudio "${id}" (${caminho}) indisponível; usando o provisório.`, erro);
        });
    }
  }

  /** Ajusta o volume de cada saída para o estado atual (sem cortes bruscos). */
  function aplicarMixagem(imediato = false): void {
    if (!ctx || !saidaMusica || !saidaEfeitos || !saidaInterface) return;
    const alvo = mixagem(pausadoPeloJogo);
    const pares: [GainNode, number][] = [
      [saidaMusica, alvo.musica],
      [saidaEfeitos, alvo.efeitos],
      [saidaInterface, alvo.interface],
    ];
    for (const [saida, volume] of pares) {
      if (imediato) saida.gain.value = volume;
      else saida.gain.setTargetAtTime(volume, agora(), 0.12);
    }
  }

  // ------------------------------------------------------------- API

  return {
    desbloquear: () => {
      if (!Construtor) return;
      if (!ctx) {
        ctx = new Construtor();
        saidaMusica = ctx.createGain();
        saidaMusica.gain.value = CONFIG_AUDIO.volumeMusica;
        saidaMusica.connect(ctx.destination);
        saidaEfeitos = ctx.createGain();
        saidaEfeitos.gain.value = CONFIG_AUDIO.volumeEfeitos;
        saidaEfeitos.connect(ctx.destination);
        saidaInterface = ctx.createGain();
        saidaInterface.connect(ctx.destination);
        aplicarMixagem(true);
        carregarArquivos(ctx);
      }
      void ctx.resume();
      iniciarMusica();
    },

    tocar: (id) => {
      if (!ctx || !saidaEfeitos || !saidaInterface || ctx.state !== 'running') return;
      // Em pausa só os cliques de interface soam.
      if (pausadoPeloJogo && id !== 'interface') return;
      const buffer = buffers.get(id);
      if (buffer) {
        const fonte = ctx.createBufferSource();
        fonte.buffer = buffer;
        fonte.connect(id === 'interface' ? saidaInterface : saidaEfeitos);
        fonte.start();
        return;
      }
      SINTETIZADOS[id]();
    },

    iniciarLoopsAmeacas: ({ gosma, drone }) => {
      if (!ctx || !saidaEfeitos) return;
      for (const [id, ligado] of [['gosma', gosma], ['drone', drone]] as const) {
        if (ligado && !loops[id]) {
          loops[id] = iniciarLoop(id, saidaEfeitos) ?? undefined;
        } else if (!ligado && loops[id]) {
          loops[id]?.parar();
          delete loops[id];
        }
      }
    },

    pararLoopsAmeacas: () => {
      for (const id of ['gosma', 'drone'] as const) {
        loops[id]?.parar();
        delete loops[id];
      }
    },

    atualizarDistancias: (gosma, drone) => {
      if (!ctx) return;
      const { volumeMaximoLoop, alcanceLoopTiles } = CONFIG_AUDIO;
      const alvos: Array<[IdLoop, number | null, number, number]> = [
        ['gosma', gosma, alcanceLoopTiles.gosma, volumeMaximoLoop.gosma],
        ['drone', drone, alcanceLoopTiles.drone, volumeMaximoLoop.drone],
      ];
      for (const [id, distancia, alcance, maximo] of alvos) {
        const loop = loops[id];
        if (!loop) continue;
        loop.ganho.gain.setTargetAtTime(volumePorDistancia(distancia, alcance, maximo), agora(), 0.08);
      }
    },

    pausar: () => {
      pausadoPeloJogo = true;
      aplicarMixagem();
    },

    retomar: () => {
      pausadoPeloJogo = false;
      aplicarMixagem();
    },
  };
}
