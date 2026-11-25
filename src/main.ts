import Phaser from 'phaser';
import catalogoFasesJson from '../content/fases.json';
import { CONFIG } from './core/config';
import { TOTAL_PROVAS_FASE } from './core/fase';
import type { ConteudoHabitante } from './core/habitantes';
import { parseFase } from './core/parser';
import {
  calcularMarcas,
  contarMarcas,
  faseDesbloqueada,
  TOTAL_MARCAS,
  lerCatalogoFases,
  proximaFase,
  type EntradaCatalogoFase,
} from './core/progresso';
import type { ConteudoProva } from './core/provas';
import {
  faltaParaEntrar,
  faltasDaTentativa,
  formatarDiferenca,
  formatarTempoRanking,
  inserirNoRanking,
  letrasValidas,
  normalizarLetras,
  posicaoNoRanking,
  segundosParaMs,
  tentativaPerfeita,
  type ColetaDaTentativa,
  type EntradaRanking,
} from './core/ranking';
import { criarClienteRanking } from './game/ranking';
import { renderizarListaRanking } from './game/rankingTela';
import { criarRepositorioProgresso } from './game/armazenamentoProgresso';
import { sonsDoEvento } from './core/audio';
import { criarArquivo } from './game/arquivo';
import { criarMotorAudio } from './game/audio';
import { criarIntro } from './game/intro';
import { montarSobre } from './game/sobre';
import { montarComoJogar } from './game/comoJogar';
import { criarAberturaAnimada } from './game/capaAnimada';
import { carregarConteudoHabitantesDaFase } from './game/carregarHabitante';
import {
  carregarConteudoProvasDaFase,
  type MapaConteudoProvas,
} from './game/carregarProvas';
import { registrarControles } from './game/controles';
import { calcularEscalaInteira } from './game/escala';
import { FaseScene, type ResumoConclusaoFase } from './game/FaseScene';
import { aplicarTextosEstaticos, formatarTexto, TEXTOS } from './game/textos';
import './style.css';

const DURACAO_BALAO_HABITANTE_MS = 5000;
/** Tempo que o aviso de Prova coletada fica na tela (some sozinho; não pausa o jogo). */
const DURACAO_AVISO_PROVA_MS = 7000;

type NomeTela =
  | 'capa'
  | 'menu'
  | 'intro'
  | 'arquivo'
  | 'sobre'
  | 'ranking'
  | 'como-jogar'
  | 'selecao'
  | 'fim-prototipo'
  | 'jogo';

const NOMES_TELA: readonly NomeTela[] = [
  'capa',
  'menu',
  'intro',
  'arquivo',
  'sobre',
  'ranking',
  'como-jogar',
  'selecao',
  'fim-prototipo',
  'jogo',
];

interface DocumentoComAriaNotify extends Document {
  ariaNotify?: (mensagem: string) => void;
}

interface SessaoFase {
  readonly indice: number;
  readonly entrada: EntradaCatalogoFase;
  readonly cena: FaseScene;
  readonly jogo: Phaser.Game;
  readonly conteudoProvas: MapaConteudoProvas;
  readonly conteudoHabitantes: readonly ConteudoHabitante[];
}

function elemento<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Elemento esperado do DOM não encontrado: #${id}`);
  }
  return el as T;
}

async function carregarFaseDeTexto(caminhoRelativo: string): Promise<string> {
  const url = `${import.meta.env.BASE_URL}${caminhoRelativo}`;
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(formatarTexto(TEXTOS.erros.carregarFase, { status: resposta.status, url }));
  }
  return resposta.text();
}

function resolverUrlAsset(caminho: string): string {
  return caminho.startsWith('http') ? caminho : `${import.meta.env.BASE_URL}${caminho}`;
}

function preencherOverlayProva(
  prova: ConteudoProva,
  elementos: {
    imagem: HTMLImageElement;
    tipo: HTMLElement;
    titulo: HTMLElement;
    texto: HTMLElement;
  },
): void {
  elementos.imagem.src = resolverUrlAsset(prova.ilustracao);
  elementos.imagem.alt = formatarTexto(TEXTOS.prova.ilustracao, { titulo: prova.titulo });
  elementos.tipo.textContent = prova.rotuloTipo;
  elementos.titulo.textContent = prova.titulo;

  const nosParagrafos = prova.paragrafos.map((trecho) => {
    const p = document.createElement('p');
    p.textContent = trecho;
    return p;
  });
  elementos.texto.replaceChildren(...nosParagrafos);
}

function formatarContagemMortes(mortes: number): string {
  return mortes === 1
    ? TEXTOS.fimFase.morteUma
    : formatarTexto(TEXTOS.fimFase.mortesVarias, { n: mortes });
}

function anunciarParaLeitorDeTela(mensagem: string, liveRegionFallback: HTMLElement): void {
  const doc = document as DocumentoComAriaNotify;
  if (typeof doc.ariaNotify === 'function') {
    doc.ariaNotify(mensagem);
    return;
  }

  liveRegionFallback.textContent = '';
  requestAnimationFrame(() => {
    liveRegionFallback.textContent = mensagem;
  });
}

function iniciar(): void {
  aplicarTextosEstaticos();
  document.title = TEXTOS.documento.titulo;

  const catalogo = lerCatalogoFases(catalogoFasesJson);
  const progresso = criarRepositorioProgresso();
  const audio = criarMotorAudio(import.meta.env.BASE_URL);

  const telas = new Map<NomeTela, HTMLElement>(
    NOMES_TELA.map((nome) => [nome, elemento(`tela-${nome}`)]),
  );
  const telaJogo = elemento('tela-jogo');
  const listaFases = elemento<HTMLOListElement>('lista-fases');
  const botaoComecar = elemento('btn-comecar');

  const palco = elemento('palco');
  const hudNomeFase = elemento('hud-nome-fase');
  const hudProvas = elemento('contador-provas');
  const hudAlmas = elemento('contador-almas');
  const hudHabitante = elemento('status-habitante');
  const hudHabitanteRotulo = hudHabitante.querySelector<HTMLElement>('.hud-habitante-rotulo') ?? hudHabitante;
  const hudJogo = elemento('hud-jogo');
  /** Quanto tempo o aviso "Habitante 2 de 4" fica na tela depois de um resgate. */
  const DURACAO_AVISO_HABITANTE_MS = 2200;
  let temporizadorAvisoHabitante: number | undefined;
  const botaoPausa = elemento('btn-pausa');
  const balaoHabitante = elemento('balao-habitante');
  const balaoRetrato = elemento<HTMLImageElement>('balao-retrato');
  const balaoNome = elemento('balao-nome');
  const balaoFala = elemento('balao-fala');
  const botaoFecharBalao = elemento('btn-fechar-balao');
  const anuncioHabitante = elemento('anuncio-habitante');
  const avisoProva = elemento<HTMLButtonElement>('aviso-prova');
  const avisoProvaTipo = elemento('aviso-prova-tipo');
  const avisoProvaTitulo = elemento('aviso-prova-titulo');
  const avisoProvaResumo = elemento('aviso-prova-resumo');
  const anuncioProva = elemento('anuncio-prova');
  const dialogPausa = elemento<HTMLDialogElement>('modal-pausa');
  const dialogProva = elemento<HTMLDialogElement>('modal-prova');
  const provaImagem = elemento<HTMLImageElement>('prova-imagem');
  const provaTipo = elemento('prova-tipo');
  const provaTitulo = elemento('prova-titulo');
  const provaTexto = elemento('prova-texto');
  const dialogConclusao = elemento<HTMLDialogElement>('modal-conclusao');
  const tituloConclusao = elemento('titulo-conclusao');
  const resumoConclusao = elemento<HTMLUListElement>('resumo-conclusao');
  const botaoProxima = elemento('btn-proxima');
  const hudTempo = elemento('hud-tempo');
  const botaoSpeedrun = elemento('btn-speedrun');
  const formLetras = elemento<HTMLFormElement>('form-letras');
  const campoLetras = elemento<HTMLInputElement>('campo-letras');
  const listaRankingConclusao = elemento<HTMLOListElement>('lista-ranking-conclusao');
  const notaRankingConclusao = elemento('ranking-conclusao-nota');
  const listaRankingTela = elemento<HTMLOListElement>('lista-ranking-tela');
  const notaRankingTela = elemento('ranking-tela-nota');
  const subtituloRanking = elemento('ranking-subtitulo');
  const mensagemErro = elemento('mensagem-erro');
  const mensagemErroTexto = elemento('mensagem-erro-texto');
  const botaoErroVoltar = elemento('btn-erro-voltar');

  let sessao: SessaoFase | null = null;
  /**
   * Modo speedrun: só muda a tela (sem avisos de Prova, Habitante e Almas; tempo à
   * direita). Sobrevive a "Reiniciar Fase" e acaba ao sair da Fase.
   */
  let modoSpeedrun = false;
  const ranking = criarClienteRanking();
  // O que ficou de sessões anteriores (offline, aba fechada) vai agora, em segundo plano.
  void ranking.esvaziarCaixaDeSaida();
  /** Incrementado a cada Fase iniciada/encerrada, para descartar carregamentos obsoletos. */
  let geracaoSessao = 0;

  // ---------------------------------------------------------------- Telas

  // Floresta animada atrás da capa e do menu (pausa nas outras telas).
  const abertura = criarAberturaAnimada({
    fundo: elemento<HTMLCanvasElement>('abertura-fundo'),
    logos: [...document.querySelectorAll<HTMLCanvasElement>('.logo-revolta')],
    resolverUrlAsset,
  });

  const mostrarTela = (nome: NomeTela) => {
    for (const [chave, tela] of telas) {
      tela.hidden = chave !== nome;
    }
    abertura.ativar(nome === 'capa' || nome === 'menu');
    if (nome !== 'jogo') {
      document.title = TEXTOS.documento.titulo;
      const tela = telas.get(nome);
      const alvo = tela?.querySelector<HTMLElement>('button:not([disabled])');
      // O foco vai para o primeiro botão sem rolar a tela (em telas longas, como
      // Como jogar, o primeiro botão é o "Voltar" lá embaixo).
      alvo?.focus({ preventScroll: true });
      tela?.scrollTo?.({ top: 0 });
      window.scrollTo({ top: 0 });
    }
  };

  /**
   * Habitantes de uma Fase e quantos já foram resgatados (em qualquer partida). O total
   * vem do conteúdo (um arquivo por `H` do mapa, conferido pelo check-content), para a
   * seleção e as Marcas não precisarem carregar o mapa.
   */
  const contarHabitantesDaEntrada = (entrada: { readonly id: string; readonly conteudo: string }) => {
    const total = carregarConteudoHabitantesDaFase(entrada.conteudo).length;
    const salvos = progresso.habitantesResgatados(entrada.id);
    const resgatados = [...salvos].filter((numero) => numero <= total).length;
    return { resgatados, total };
  };

  const contarHabitantesSalvos = (faseId: string) => {
    const entrada = catalogo.find((e) => e.id === faseId);
    const { resgatados, total } = entrada
      ? contarHabitantesDaEntrada(entrada)
      : { resgatados: 0, total: 0 };
    return { habitantesResgatados: resgatados, totalHabitantes: total };
  };

  const renderizarSelecao = () => {
    const concluidas = progresso.fasesConcluidas();
    const itens = catalogo.map((entrada, indice) => {
      const liberada = faseDesbloqueada(catalogo, indice, concluidas);
      const concluida = concluidas.has(entrada.id);
      const habitantes = contarHabitantesDaEntrada(entrada);

      const li = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'cartao-fase';
      botao.dataset.indice = String(indice);
      botao.dataset.estado = !liberada ? 'bloqueada' : concluida ? 'concluida' : 'nova';
      botao.disabled = !liberada;

      const nome = document.createElement('span');
      nome.className = 'cartao-fase-nome';
      nome.textContent = entrada.nome;

      const subtitulo = document.createElement('span');
      subtitulo.className = 'cartao-fase-subtitulo';
      subtitulo.textContent = entrada.subtitulo;

      const status = document.createElement('span');
      status.className = 'cartao-fase-status';
      status.textContent = !liberada
        ? TEXTOS.selecao.bloqueada
        : concluida
          ? TEXTOS.selecao.concluida
          : TEXTOS.selecao.naoConcluida;

      const detalhe = document.createElement('span');
      detalhe.className = 'cartao-fase-habitante';
      if (liberada) {
        detalhe.dataset.resgatado = String(habitantes.total > 0 && habitantes.resgatados >= habitantes.total);
        detalhe.textContent = formatarTexto(TEXTOS.selecao.habitantes, habitantes);
      } else {
        detalhe.textContent = TEXTOS.selecao.bloqueadaDica;
      }

      const marcas = document.createElement('span');
      marcas.className = 'cartao-fase-marcas';
      if (liberada) {
        const daFase = marcasDaFase(entrada.id);
        marcas.textContent = simbolosMarcas(daFase);
        marcas.setAttribute(
          'aria-label',
          formatarTexto(TEXTOS.selecao.marcas, { n: contarMarcas(daFase), total: TOTAL_MARCAS }),
        );
      }

      botao.append(nome, subtitulo, status, detalhe, marcas);
      li.append(botao);
      return li;
    });
    listaFases.replaceChildren(...itens);
  };

  const irParaSelecao = () => {
    encerrarSessao();
    renderizarSelecao();
    mostrarTela('selecao');
  };

  // ------------------------------------------------- Balão do Habitante

  const suportaPopover = typeof balaoHabitante.showPopover === 'function';
  let temporizadorBalao: number | null = null;
  let falaHabitantePendente: ConteudoHabitante | null = null;

  const algumModalAberto = () => dialogConclusao.open || dialogProva.open || dialogPausa.open;

  const limparTemporizadorBalao = () => {
    if (temporizadorBalao !== null) {
      window.clearTimeout(temporizadorBalao);
      temporizadorBalao = null;
    }
  };

  const fecharBalaoHabitante = () => {
    limparTemporizadorBalao();
    if (suportaPopover) {
      if (balaoHabitante.matches(':popover-open')) {
        balaoHabitante.hidePopover();
      }
    } else {
      balaoHabitante.classList.remove('visivel');
    }
  };

  const agendarFechamentoBalao = () => {
    limparTemporizadorBalao();
    temporizadorBalao = window.setTimeout(() => {
      if (balaoHabitante.contains(document.activeElement)) {
        return;
      }
      fecharBalaoHabitante();
    }, DURACAO_BALAO_HABITANTE_MS);
  };

  const exibirBalaoHabitante = (habitante: ConteudoHabitante) => {
    if (algumModalAberto()) {
      falaHabitantePendente = habitante;
      return;
    }

    balaoRetrato.src = resolverUrlAsset(habitante.retrato);
    balaoRetrato.alt = formatarTexto(TEXTOS.habitante.retrato, { nome: habitante.nome });
    balaoNome.textContent = habitante.nome;
    balaoFala.textContent = `“${habitante.fala}”`;

    if (suportaPopover) {
      if (!balaoHabitante.matches(':popover-open')) {
        balaoHabitante.showPopover();
      }
    } else {
      balaoHabitante.classList.add('visivel');
    }

    anunciarParaLeitorDeTela(
      formatarTexto(TEXTOS.habitante.anuncio, { nome: habitante.nome, fala: habitante.fala }),
      anuncioHabitante,
    );
    agendarFechamentoBalao();
  };

  const tentarExibirFalaPendente = () => {
    if (falaHabitantePendente && !algumModalAberto()) {
      const pendente = falaHabitantePendente;
      falaHabitantePendente = null;
      exibirBalaoHabitante(pendente);
    }
  };

  // ------------------------------------------------- Aviso de Prova coletada
  // Coletar uma Prova não interrompe o deslize: um aviso com o resumo aparece no
  // topo e some sozinho. Clicar, tocar ou apertar Enter abre a história (e só
  // então o jogo pausa).

  let temporizadorAvisoProva: number | null = null;
  let provaDoAviso: ConteudoProva | null = null;
  /** O modal da Prova foi aberto pelo aviso (o jogo foi pausado pela interface). */
  let provaAbertaPeloAviso = false;
  const suportaPopoverAviso = typeof avisoProva.showPopover === 'function';
  const avisoProvaVisivel = () =>
    suportaPopoverAviso ? avisoProva.matches(':popover-open') : avisoProva.classList.contains('visivel');

  const esconderAvisoProva = () => {
    if (temporizadorAvisoProva !== null) {
      window.clearTimeout(temporizadorAvisoProva);
      temporizadorAvisoProva = null;
    }
    if (!avisoProvaVisivel()) return;
    if (suportaPopoverAviso) avisoProva.hidePopover();
    else avisoProva.classList.remove('visivel');
  };

  const agendarFimDoAviso = () => {
    if (temporizadorAvisoProva !== null) window.clearTimeout(temporizadorAvisoProva);
    temporizadorAvisoProva = window.setTimeout(() => {
      // Não some enquanto o jogador está com o foco ou o mouse em cima.
      if (avisoProva.matches(':hover, :focus')) {
        agendarFimDoAviso();
        return;
      }
      esconderAvisoProva();
    }, DURACAO_AVISO_PROVA_MS);
  };

  const mostrarAvisoProva = (prova: ConteudoProva) => {
    provaDoAviso = prova;
    avisoProvaTipo.textContent = prova.rotuloTipo;
    avisoProvaTitulo.textContent = prova.titulo;
    avisoProvaResumo.textContent = prova.resumo;
    avisoProva.setAttribute(
      'aria-label',
      formatarTexto(TEXTOS.avisoProva.rotulo, { tipo: prova.rotuloTipo, titulo: prova.titulo }),
    );
    if (suportaPopoverAviso) {
      if (!avisoProva.matches(':popover-open')) avisoProva.showPopover();
    } else {
      avisoProva.classList.add('visivel');
    }
    anunciarParaLeitorDeTela(
      formatarTexto(TEXTOS.avisoProva.anuncio, { titulo: prova.titulo, resumo: prova.resumo }),
      anuncioProva,
    );
    agendarFimDoAviso();
  };

  const abrirProvaDoAviso = () => {
    if (!sessao || !provaDoAviso || dialogProva.open || dialogPausa.open || dialogConclusao.open) {
      return;
    }
    esconderAvisoProva();
    fecharBalaoHabitante();
    sessao.cena.pausar();
    provaAbertaPeloAviso = true;
    preencherOverlayProva(provaDoAviso, {
      imagem: provaImagem,
      tipo: provaTipo,
      titulo: provaTitulo,
      texto: provaTexto,
    });
    dialogProva.scrollTop = 0;
    dialogProva.showModal();
  };

  avisoProva.addEventListener('click', abrirProvaDoAviso);
  window.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Enter' || !avisoProvaVisivel() || telaJogo.hidden) return;
    if (document.activeElement === avisoProva) return; // o clique do botão já trata
    evento.preventDefault();
    abrirProvaDoAviso();
  });

  const descartarFalaPendente = () => {
    falaHabitantePendente = null;
    fecharBalaoHabitante();
  };

  balaoHabitante.addEventListener('focusin', limparTemporizadorBalao);
  balaoHabitante.addEventListener('focusout', (evento) => {
    const proximo = evento.relatedTarget as Node | null;
    if (!proximo || !balaoHabitante.contains(proximo)) {
      agendarFechamentoBalao();
    }
  });
  botaoFecharBalao.addEventListener('click', fecharBalaoHabitante);

  // ------------------------------------------------------ Sessão de Fase

  const medirEscala = (fase: { largura: number; altura: number }) => {
    const rect = palco.getBoundingClientRect();
    return calcularEscalaInteira(
      rect.width || window.innerWidth,
      rect.height || window.innerHeight,
      window.devicePixelRatio || 1,
      fase.largura * CONFIG.tamanhoTilePx,
      fase.altura * CONFIG.tamanhoTilePx,
    );
  };

  let dimensoesFaseAtual: { largura: number; altura: number } | null = null;

  const aplicarEscalaNoCanvas = () => {
    if (!sessao || !dimensoesFaseAtual) return;
    const d = medirEscala(dimensoesFaseAtual);
    sessao.jogo.scale.resize(d.larguraLogica, d.alturaLogica);
    sessao.cena.atualizarTamanhoViewport(d.larguraLogica, d.alturaLogica);
    const canvas = sessao.jogo.canvas;
    if (canvas) {
      canvas.style.width = `${d.larguraCss}px`;
      canvas.style.height = `${d.alturaCss}px`;
    }
    // A HUD fica sobre o canvas, com os contadores nos cantos da tela de jogo.
    hudJogo.style.setProperty('--hud-largura', `${d.larguraCss}px`);
    hudJogo.style.setProperty('--hud-altura', `${d.alturaCss}px`);
  };

  window.addEventListener('resize', aplicarEscalaNoCanvas);
  window.addEventListener('orientationchange', aplicarEscalaNoCanvas);

  const fecharDialogosDaFase = () => {
    for (const dialogo of [dialogProva, dialogPausa, dialogConclusao]) {
      if (dialogo.open) {
        dialogo.close('ignorar');
      }
    }
  };

  /** Laço que acompanha a distância das Ameaças para o volume dos loops. */
  let quadroAudioAmeacas: number | null = null;
  const acompanharAmeacasNoAudio = () => {
    if (!sessao) return;
    audio.atualizarDistancias(
      sessao.cena.distanciaAteAmeaca('gosma'),
      sessao.cena.distanciaAteAmeaca('drone'),
    );
    if (modoSpeedrun) {
      const texto = formatarTempoRanking(segundosParaMs(sessao.cena.tempoJogadoSegundos()));
      if (hudTempo.textContent !== texto) hudTempo.textContent = texto;
    }
    quadroAudioAmeacas = requestAnimationFrame(acompanharAmeacasNoAudio);
  };

  function encerrarSessao(): void {
    geracaoSessao += 1;
    esconderAvisoProva();
    provaDoAviso = null;
    descartarFalaPendente();
    fecharDialogosDaFase();
    if (quadroAudioAmeacas !== null) {
      cancelAnimationFrame(quadroAudioAmeacas);
      quadroAudioAmeacas = null;
    }
    audio.pararLoopsAmeacas();
    if (sessao) {
      sessao.jogo.destroy(true);
      sessao = null;
    }
    dimensoesFaseAtual = null;
  }

  /**
   * Habitantes não ficam na tela: ao resgatar um, "Habitante 2 de 4" aparece por um
   * instante no canto e some (o total e o que faltou aparecem no fim da Fase).
   */
  const atualizarHudHabitantes = (resgatados: number, total: number) => {
    window.clearTimeout(temporizadorAvisoHabitante);
    hudHabitante.classList.remove('visivel');
    hudHabitante.hidden = true;
    if (resgatados === 0 || total === 0) return;
    hudHabitante.dataset.resgatado = String(resgatados >= total);
    hudHabitanteRotulo.textContent = formatarTexto(TEXTOS.hud.habitanteResgatado, { resgatados, total });
    hudHabitante.setAttribute('aria-label', formatarTexto(TEXTOS.hud.habitantesAria, { resgatados, total }));
    hudHabitante.hidden = false;
    requestAnimationFrame(() => hudHabitante.classList.add('visivel'));
    temporizadorAvisoHabitante = window.setTimeout(() => {
      hudHabitante.classList.remove('visivel');
      temporizadorAvisoHabitante = window.setTimeout(() => (hudHabitante.hidden = true), 300);
    }, DURACAO_AVISO_HABITANTE_MS);
  };

  const aplicarModoSpeedrun = (ligado: boolean) => {
    modoSpeedrun = ligado;
    hudJogo.dataset.speedrun = String(ligado);
    hudTempo.hidden = !ligado;
    hudTempo.textContent = formatarTempoRanking(0);
    botaoSpeedrun.textContent = ligado ? TEXTOS.pausa.speedrunSair : TEXTOS.pausa.speedrunEntrar;
    if (ligado) {
      esconderAvisoProva();
      descartarFalaPendente();
    }
  };

  // ------------------------------------------------------------ Ranking

  /** Conclusão que está no modal agora (para descartar respostas atrasadas da rede). */
  let conclusaoAtual: {
    faseId: string;
    tempoMs: number;
    coleta: ColetaDaTentativa;
    gravou: boolean;
  } | null = null;

  /** "3 Almas e 1 Habitante": o que faltou para a Tentativa ser perfeita. */
  const descreverFaltas = (coleta: ColetaDaTentativa) => {
    const { almas, habitantes } = faltasDaTentativa(coleta);
    const partes = [
      ...(almas > 0
        ? [almas === 1 ? TEXTOS.ranking.faltaAlma : formatarTexto(TEXTOS.ranking.faltaAlmas, { n: almas })]
        : []),
      ...(habitantes > 0
        ? [
            habitantes === 1
              ? TEXTOS.ranking.faltaHabitante
              : formatarTexto(TEXTOS.ranking.faltaHabitantes, { n: habitantes }),
          ]
        : []),
    ];
    return partes.length === 2 ? formatarTexto(TEXTOS.ranking.faltasE, { a: partes[0], b: partes[1] }) : partes[0] ?? '';
  };

  const mostrarRankingDaConclusao = () => {
    const atual = conclusaoAtual;
    if (!atual || atual.gravou) return;
    const top = ranking.topConhecido(atual.faseId);
    if (!tentativaPerfeita(atual.coleta)) {
      // Só a Tentativa perfeita concorre: mostra o Ranking e o que faltou.
      renderizarListaRanking(listaRankingConclusao, top);
      formLetras.hidden = true;
      notaRankingConclusao.textContent = formatarTexto(TEXTOS.ranking.naoPerfeita, {
        faltas: descreverFaltas(atual.coleta),
      });
      return;
    }
    const entra = posicaoNoRanking(top, atual.tempoMs) !== null;
    renderizarListaRanking(listaRankingConclusao, top);
    const estavaOculto = formLetras.hidden;
    formLetras.hidden = !entra;
    if (entra) {
      notaRankingConclusao.textContent = '';
      if (estavaOculto) {
        campoLetras.value = ranking.ultimasLetras();
        campoLetras.focus();
        campoLetras.select();
      }
    } else {
      const falta = faltaParaEntrar(top, atual.tempoMs);
      notaRankingConclusao.textContent =
        falta === null ? '' : formatarTexto(TEXTOS.ranking.faltou, { diferenca: formatarDiferenca(falta) });
    }
  };

  const prepararRankingDaConclusao = (faseId: string, tempoMs: number, coleta: ColetaDaTentativa) => {
    const pedido = { faseId, tempoMs, coleta, gravou: false };
    conclusaoAtual = pedido;
    formLetras.hidden = true;
    mostrarRankingDaConclusao();
    // O top 10 foi pré-carregado ao entrar na Fase; esta busca só confirma.
    void ranking.carregarTop(faseId).then((top) => {
      if (top !== null && conclusaoAtual === pedido) mostrarRankingDaConclusao();
    });
  };

  campoLetras.addEventListener('input', () => {
    const limpo = normalizarLetras(campoLetras.value);
    if (campoLetras.value !== limpo) campoLetras.value = limpo;
  });

  formLetras.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const atual = conclusaoAtual;
    if (!atual || atual.gravou) return;
    const letras = normalizarLetras(campoLetras.value);
    if (!letrasValidas(letras)) {
      notaRankingConclusao.textContent = TEXTOS.ranking.letrasInvalidas;
      campoLetras.focus();
      return;
    }
    atual.gravou = true;
    formLetras.hidden = true;
    botaoProxima.focus();

    const posicaoDe = (top: readonly EntradaRanking[]) => {
      const i = top.findIndex((e) => e.letras === letras && e.tempoMs === atual.tempoMs);
      return i < 0 ? null : i + 1;
    };
    // Mostra na hora, antes de o servidor responder.
    const otimista = inserirNoRanking(ranking.topConhecido(atual.faseId), {
      letras,
      tempoMs: atual.tempoMs,
      gravadoEm: new Date().toISOString(),
    });
    renderizarListaRanking(listaRankingConclusao, otimista, posicaoDe(otimista));
    notaRankingConclusao.textContent = TEXTOS.ranking.gravando;

    void ranking.gravar(atual.faseId, letras, atual.tempoMs).then((resultado) => {
      if (conclusaoAtual !== atual) return;
      const posicao = posicaoDe(resultado.top);
      renderizarListaRanking(listaRankingConclusao, resultado.top, posicao);
      notaRankingConclusao.textContent = resultado.confirmado
        ? posicao === null
          ? ''
          : formatarTexto(TEXTOS.ranking.gravado, { posicao })
        : TEXTOS.ranking.pendente;
    });
  });

  const mostrarTelaRanking = () => {
    const entrada = catalogo[0];
    subtituloRanking.textContent = formatarTexto(TEXTOS.ranking.subtitulo, { fase: entrada.nome });
    const desenhar = () => {
      const top = ranking.topConhecido(entrada.id);
      renderizarListaRanking(listaRankingTela, top);
      return top;
    };
    const conhecido = desenhar();
    notaRankingTela.textContent = conhecido.length === 0 ? TEXTOS.ranking.carregando : '';
    mostrarTela('ranking');
    void ranking.carregarTop(entrada.id).then((top) => {
      if (telas.get('ranking')?.hidden) return;
      const atualizado = desenhar();
      notaRankingTela.textContent =
        top === null
          ? atualizado.length === 0
            ? TEXTOS.ranking.indisponivelVazio
            : TEXTOS.ranking.indisponivel
          : atualizado.length === 0
            ? TEXTOS.ranking.vazio
            : '';
    });
  };

  /** Marcas da Fase pelo progresso salvo (concluir · todas as Almas · Habitante). */
  const marcasDaFase = (faseId: string) => {
    const recorde = progresso.recordeAlmas(faseId);
    return calcularMarcas({
      concluida: progresso.faseConcluida(faseId),
      melhorAlmas: recorde?.melhor ?? 0,
      // Sem recorde (Fase nunca concluída), a Marca das Almas ainda não foi ganha.
      totalAlmas: recorde?.total ?? Number.POSITIVE_INFINITY,
      ...contarHabitantesSalvos(faseId),
    });
  };

  /** ✦ para Marca ganha, ✧ para Marca que falta, na ordem do glossário. */
  const simbolosMarcas = (marcas: ReturnType<typeof calcularMarcas>) =>
    [marcas.concluida, marcas.todasAsAlmas, marcas.habitantes].map((m) => (m ? '✦' : '✧')).join('');

  const mostrarFimDeFase = (indice: number, resumo: ResumoConclusaoFase) => {
    const entrada = catalogo[indice];
    progresso.registrarConclusao(entrada.id);
    progresso.registrarAlmas(entrada.id, resumo.almasColetadas, resumo.almasTotal);
    descartarFalaPendente();
    const marcas = marcasDaFase(entrada.id);

    tituloConclusao.textContent = formatarTexto(TEXTOS.fimFase.titulo, { fase: entrada.nome });
    const linhas = [
      formatarTexto(TEXTOS.fimFase.provas, {
        coletadas: TOTAL_PROVAS_FASE,
        total: TOTAL_PROVAS_FASE,
      }),
      // No fim da Fase aparece o que a HUD esconde: o total e o que faltou.
      ...(resumo.almasTotal > 0
        ? [
            formatarTexto(
              resumo.almasColetadas < resumo.almasTotal ? TEXTOS.fimFase.almasFaltaram : TEXTOS.fimFase.almas,
              {
                coletadas: resumo.almasColetadas,
                total: resumo.almasTotal,
                faltam: resumo.almasTotal - resumo.almasColetadas,
              },
            ),
          ]
        : []),
      ...(resumo.habitantesTotal > 0
        ? [
            formatarTexto(
              resumo.habitantesResgatados < resumo.habitantesTotal
                ? TEXTOS.fimFase.habitantesFaltaram
                : TEXTOS.fimFase.habitantes,
              {
                resgatados: resumo.habitantesResgatados,
                total: resumo.habitantesTotal,
                faltam: resumo.habitantesTotal - resumo.habitantesResgatados,
              },
            ),
          ]
        : []),
      formatarContagemMortes(resumo.mortes),
      formatarTexto(TEXTOS.fimFase.deslizes, { n: resumo.deslizes }),
      formatarTexto(TEXTOS.fimFase.tempo, {
        tempo: formatarTempoRanking(segundosParaMs(resumo.tempoSegundos)),
      }),
    ];
    const linhaMarcas = document.createElement('li');
    linhaMarcas.className = 'resumo-marcas';
    linhaMarcas.textContent = formatarTexto(TEXTOS.fimFase.marcas, {
      simbolos: simbolosMarcas(marcas),
    });
    linhaMarcas.setAttribute(
      'aria-label',
      formatarTexto(TEXTOS.fimFase.marcasAria, { n: contarMarcas(marcas), total: TOTAL_MARCAS }),
    );
    resumoConclusao.replaceChildren(
      linhaMarcas,
      ...linhas.map((linha) => {
        const li = document.createElement('li');
        li.textContent = linha;
        return li;
      }),
    );
    botaoProxima.textContent =
      proximaFase(catalogo, indice) === null ? TEXTOS.fimFase.ultima : TEXTOS.fimFase.proxima;

    if (!dialogConclusao.open) {
      dialogConclusao.showModal();
    }
    prepararRankingDaConclusao(entrada.id, segundosParaMs(resumo.tempoSegundos), resumo);
  };

  const mostrarErroDeFase = (erro: unknown) => {
    mensagemErroTexto.textContent =
      erro instanceof Error ? erro.message : TEXTOS.erros.inesperado;
    mensagemErro.hidden = false;
    botaoErroVoltar.focus();
  };

  async function iniciarFase(indice: number): Promise<void> {
    const entrada = catalogo[indice];
    if (!entrada || !faseDesbloqueada(catalogo, indice, progresso.fasesConcluidas())) {
      irParaSelecao();
      return;
    }

    encerrarSessao();
    const geracao = geracaoSessao;
    aplicarModoSpeedrun(false);
    // Pré-carrega o top 10: quando a Tentativa acabar, ele já chegou.
    void ranking.carregarTop(entrada.id);

    mensagemErro.hidden = true;
    hudNomeFase.textContent = entrada.nome;
    hudProvas.textContent = formatarTexto(TEXTOS.hud.provas, {
      coletadas: 0,
      total: TOTAL_PROVAS_FASE,
    });
    hudProvas.dataset.completo = 'false';
    hudAlmas.textContent = formatarTexto(TEXTOS.hud.almas, { coletadas: 0 });
    atualizarHudHabitantes(0, 0);
    document.title = `${entrada.nome} · ${TEXTOS.documento.titulo}`;
    mostrarTela('jogo');

    try {
      const textoFase = await carregarFaseDeTexto(entrada.mapa);
      if (geracao !== geracaoSessao) return; // o jogador saiu durante o carregamento

      const fase = parseFase(textoFase);
      const conteudoProvas = carregarConteudoProvasDaFase(entrada.conteudo);
      const conteudoHabitantes = carregarConteudoHabitantesDaFase(entrada.conteudo);

      const cena = new FaseScene(fase, {
        aparenciasHabitantes: fase.habitantes.map(
          (_, i) => conteudoHabitantes.find((c) => c.numero === i + 1)?.aparencia ?? '',
        ),
        // Deslizes e mortes só aparecem no fim da Fase.
        aoAtualizarDeslizes: () => {},
        aoAtualizarMortes: () => {},
        aoAtualizarProvas: (coletadas, total) => {
          hudProvas.textContent = formatarTexto(TEXTOS.hud.provas, { coletadas, total });
          hudProvas.dataset.completo = String(coletadas >= total);
        },
        aoAtualizarHabitantes: atualizarHudHabitantes,
        aoAtualizarAlmas: (coletadas, total) => {
          // Só a contagem: o total da Fase fica para o fim.
          hudAlmas.textContent = formatarTexto(TEXTOS.hud.almas, { coletadas });
          hudAlmas.parentElement!.hidden = total === 0;
        },
        aoColetarProva: (prova) => {
          progresso.registrarProva(entrada.id, prova.numero);
          // No speedrun a Prova vai para o Arquivo sem aviso na tela.
          if (!modoSpeedrun) mostrarAvisoProva(conteudoProvas[prova.numero]);
        },
        aoResgatarHabitante: (indice) => {
          progresso.registrarHabitante(entrada.id, indice + 1);
          const conteudo = conteudoHabitantes.find((c) => c.numero === indice + 1);
          if (conteudo && !modoSpeedrun) {
            exibirBalaoHabitante(conteudo);
          }
        },
        aoAbrirProva: (prova) => {
          fecharBalaoHabitante();
          preencherOverlayProva(conteudoProvas[prova.numero], {
            imagem: provaImagem,
            tipo: provaTipo,
            titulo: provaTitulo,
            texto: provaTexto,
          });
          dialogProva.scrollTop = 0;
          if (!dialogProva.open) {
            dialogProva.showModal();
          }
        },
        aoConcluir: (resumo) => mostrarFimDeFase(indice, resumo),
        aoEventos: (eventos) => {
          for (const evento of eventos) {
            sonsDoEvento(evento.tipo).forEach((som) => audio.tocar(som));
          }
        },
      });

      dimensoesFaseAtual = { largura: fase.largura, altura: fase.altura };
      const dimensoesIniciais = medirEscala(dimensoesFaseAtual);

      const jogo = new Phaser.Game({
        type: Phaser.AUTO,
        parent: palco,
        width: dimensoesIniciais.larguraLogica,
        height: dimensoesIniciais.alturaLogica,
        backgroundColor: '#0d1512',
        pixelArt: true,
        roundPixels: true,
        antialias: false,
        scale: {
          mode: Phaser.Scale.NONE,
        },
        scene: [cena],
      });

      sessao = { indice, entrada, cena, jogo, conteudoProvas, conteudoHabitantes };
      audio.iniciarLoopsAmeacas({
        gosma: fase.ameacas.some((a) => a.tipo === 'gosma'),
        drone: fase.ameacas.some((a) => a.tipo === 'drone'),
      });
      acompanharAmeacasNoAudio();
      aplicarEscalaNoCanvas();
    } catch (erro) {
      if (geracao !== geracaoSessao) return;
      mostrarErroDeFase(erro);
    }
  }

  const reiniciarFase = () => {
    if (!sessao) return;
    esconderAvisoProva();
    descartarFalaPendente();
    fecharDialogosDaFase();
    sessao.cena.reiniciar();
  };

  const abrirPausa = () => {
    if (!sessao || algumModalAberto()) return;
    fecharBalaoHabitante();
    sessao.cena.pausar();
    dialogPausa.showModal();
  };

  // ------------------------------------------------------------ Eventos

  // Arquivo da Resistência: abrir uma Prova coletada mostra o mesmo overlay do jogo.
  const arquivo = criarArquivo({
    catalogo,
    progresso,
    resolverUrlAsset,
    abrirProva: (prova) => {
      preencherOverlayProva(prova, {
        imagem: provaImagem,
        tipo: provaTipo,
        titulo: provaTitulo,
        texto: provaTexto,
      });
      dialogProva.scrollTop = 0;
      dialogProva.showModal();
    },
  });

  // Com uma Fase só (ADR 0007), Jogar entra direto nela; a seleção continua acessível
  // ao sair da Fase, para ver Marcas e Habitante.
  const entrarNoJogo = () => {
    if (catalogo.length === 1) {
      void iniciarFase(0);
    } else {
      irParaSelecao();
    }
  };

  const intro = criarIntro({
    resolverUrlAsset,
    aoTerminar: () => {
      progresso.registrarIntroVista();
      entrarNoJogo();
    },
  });

  montarSobre(elemento('titulo-sobre'), elemento('sobre-conteudo'));
  montarComoJogar(elemento('como-jogar-conteudo'), resolverUrlAsset);

  botaoComecar.addEventListener('click', () => {
    // Gesto do jogador: destrava o áudio no celular e começa a música (também no menu).
    audio.desbloquear();
    mostrarTela('menu');
  });

  // Som de interface em qualquer botão.
  document.addEventListener('click', (evento) => {
    if ((evento.target as HTMLElement | null)?.closest('button')) {
      audio.tocar('interface');
    }
  });

  // Com a Prova aberta ou em pausa (durante uma Fase), os sons do jogo param e a
  // música segue mais baixa; ela nunca é interrompida.
  const sincronizarPausaDoAudio = () => {
    if (sessao && (dialogPausa.open || dialogProva.open)) {
      audio.pausar();
    } else {
      audio.retomar();
    }
  };
  const observadorDialogos = new MutationObserver(sincronizarPausaDoAudio);
  for (const dialogo of [dialogPausa, dialogProva]) {
    observadorDialogos.observe(dialogo, { attributes: true, attributeFilter: ['open'] });
  }

  document.addEventListener('click', (evento) => {
    const alvo = (evento.target as HTMLElement | null)?.closest<HTMLElement>('[data-ir-para]');
    if (!alvo) return;
    const destino = alvo.dataset.irPara as NomeTela | 'jogar' | undefined;
    if (destino === 'jogar') {
      // Na primeira vez que se clica em Jogar, a introdução vem antes da Fase.
      if (progresso.introVista()) {
        entrarNoJogo();
      } else {
        mostrarTela('intro');
        intro.iniciar();
      }
    } else if (destino === 'selecao') {
      irParaSelecao();
    } else if (destino === 'arquivo') {
      arquivo.renderizar();
      mostrarTela('arquivo');
    } else if (destino === 'ranking') {
      mostrarTelaRanking();
    } else if (destino && telas.has(destino)) {
      mostrarTela(destino);
    }
  });

  listaFases.addEventListener('click', (evento) => {
    const cartao = (evento.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '.cartao-fase',
    );
    if (!cartao || cartao.disabled) return;
    void iniciarFase(Number(cartao.dataset.indice));
  });

  botaoErroVoltar.addEventListener('click', irParaSelecao);
  botaoPausa.addEventListener('click', abrirPausa);

  dialogPausa.addEventListener('close', () => {
    const acao = dialogPausa.returnValue;
    dialogPausa.returnValue = '';
    if (!sessao) return;

    switch (acao) {
      case 'ignorar':
        break;
      case 'totem':
        sessao.cena.voltarAoTotem();
        tentarExibirFalaPendente();
        break;
      case 'reiniciar':
        descartarFalaPendente();
        esconderAvisoProva();
        sessao.cena.reiniciar();
        break;
      case 'speedrun':
        if (modoSpeedrun) {
          // Sair do speedrun não reinicia: o tempo é medido igual nos dois modos.
          aplicarModoSpeedrun(false);
          sessao.cena.retomar();
          tentarExibirFalaPendente();
        } else {
          aplicarModoSpeedrun(true);
          sessao.cena.reiniciar();
        }
        break;
      case 'sair':
        irParaSelecao();
        break;
      case 'continuar':
      case '':
      default:
        sessao.cena.retomar();
        tentarExibirFalaPendente();
        break;
    }
  });

  dialogProva.addEventListener('close', () => {
    const acao = dialogProva.returnValue;
    dialogProva.returnValue = '';
    if (acao === 'ignorar' || !sessao) {
      provaAbertaPeloAviso = false;
      return;
    }
    if (provaAbertaPeloAviso) {
      // Aberta pelo aviso: o jogo tinha sido pausado pela interface.
      provaAbertaPeloAviso = false;
      sessao.cena.retomar();
    } else {
      sessao.cena.fecharProva();
    }
    tentarExibirFalaPendente();
  });

  // A Fase já terminou: Esc não pode fechar o resumo e deixar o jogador numa cena parada.
  dialogConclusao.addEventListener('cancel', (evento) => {
    evento.preventDefault();
  });

  dialogConclusao.addEventListener('close', () => {
    const acao = dialogConclusao.returnValue;
    dialogConclusao.returnValue = '';
    if (acao !== '') conclusaoAtual = null;
    if (!sessao || acao === 'ignorar') return;

    switch (acao) {
      case 'proxima': {
        const proxima = proximaFase(catalogo, sessao.indice);
        if (proxima === null) {
          encerrarSessao();
          mostrarTela('fim-prototipo');
        } else {
          void iniciarFase(proxima);
        }
        break;
      }
      case 'repetir':
        descartarFalaPendente();
        sessao.cena.reiniciar();
        break;
      case '':
        // Fechado sem escolha (o Chrome deixa um segundo Esc ignorar o preventDefault):
        // a Fase já acabou, então o resumo volta a aparecer.
        dialogConclusao.showModal();
        break;
      case 'selecao':
      default:
        irParaSelecao();
        break;
    }
  });

  registrarControles(
    palco,
    (direcao) => sessao?.cena.receberDirecao(direcao),
    reiniciarFase,
    () => !sessao || telaJogo.hidden || algumModalAberto(),
    abrirPausa,
  );

  mostrarTela('capa');
}

try {
  iniciar();
} catch (erro) {
  // Falha de montagem (DOM ou conteúdo inválido): mostra a mensagem na própria página.
  const aviso = document.createElement('p');
  aviso.className = 'erro';
  aviso.setAttribute('role', 'alert');
  aviso.textContent = erro instanceof Error ? erro.message : String(erro);
  document.body.prepend(aviso);
  throw erro;
}
