import Phaser from 'phaser';
import catalogoFasesJson from '../content/fases.json';
import { CONFIG } from './core/config';
import { TOTAL_PROVAS_FASE } from './core/fase';
import type { ConteudoHabitante } from './core/habitantes';
import { parseFase } from './core/parser';
import {
  faseDesbloqueada,
  formatarTempo,
  lerCatalogoFases,
  proximaFase,
  type EntradaCatalogoFase,
} from './core/progresso';
import type { ConteudoProva } from './core/provas';
import { criarRepositorioProgresso } from './game/armazenamentoProgresso';
import { criarArquivo } from './game/arquivo';
import { criarIntro } from './game/intro';
import { montarSobre } from './game/sobre';
import { carregarConteudoHabitanteDaFase } from './game/carregarHabitante';
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

type NomeTela =
  | 'capa'
  | 'menu'
  | 'intro'
  | 'arquivo'
  | 'sobre'
  | 'selecao'
  | 'fim-prototipo'
  | 'jogo';

const NOMES_TELA: readonly NomeTela[] = [
  'capa',
  'menu',
  'intro',
  'arquivo',
  'sobre',
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
  readonly conteudoHabitante: ConteudoHabitante | null;
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

  const telas = new Map<NomeTela, HTMLElement>(
    NOMES_TELA.map((nome) => [nome, elemento(`tela-${nome}`)]),
  );
  const telaJogo = elemento('tela-jogo');
  const listaFases = elemento<HTMLOListElement>('lista-fases');
  const botaoComecar = elemento('btn-comecar');

  const palco = elemento('palco');
  const hudNomeFase = elemento('hud-nome-fase');
  const hudProvas = elemento('contador-provas');
  const hudHabitante = elemento('status-habitante');
  const hudDeslizes = elemento('contador-deslizes');
  const hudMortes = elemento('contador-mortes');
  const botaoPausa = elemento('btn-pausa');
  const balaoHabitante = elemento('balao-habitante');
  const balaoRetrato = elemento<HTMLImageElement>('balao-retrato');
  const balaoNome = elemento('balao-nome');
  const balaoFala = elemento('balao-fala');
  const botaoFecharBalao = elemento('btn-fechar-balao');
  const anuncioHabitante = elemento('anuncio-habitante');
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
  const mensagemErro = elemento('mensagem-erro');
  const mensagemErroTexto = elemento('mensagem-erro-texto');
  const botaoErroVoltar = elemento('btn-erro-voltar');

  let sessao: SessaoFase | null = null;
  /** Incrementado a cada Fase iniciada/encerrada, para descartar carregamentos obsoletos. */
  let geracaoSessao = 0;

  // ---------------------------------------------------------------- Telas

  const mostrarTela = (nome: NomeTela) => {
    for (const [chave, tela] of telas) {
      tela.hidden = chave !== nome;
    }
    if (nome !== 'jogo') {
      document.title = TEXTOS.documento.titulo;
      const alvo = telas.get(nome)?.querySelector<HTMLElement>('button:not([disabled])');
      alvo?.focus();
    }
  };

  const renderizarSelecao = () => {
    const concluidas = progresso.fasesConcluidas();
    const itens = catalogo.map((entrada, indice) => {
      const liberada = faseDesbloqueada(catalogo, indice, concluidas);
      const concluida = concluidas.has(entrada.id);
      const resgatado = progresso.habitanteResgatado(entrada.id);

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
        detalhe.dataset.resgatado = String(resgatado);
        detalhe.textContent = resgatado
          ? TEXTOS.selecao.habitanteResgatado
          : TEXTOS.selecao.habitanteNaoResgatado;
      } else {
        detalhe.textContent = TEXTOS.selecao.bloqueadaDica;
      }

      botao.append(nome, subtitulo, status, detalhe);
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

  function encerrarSessao(): void {
    geracaoSessao += 1;
    descartarFalaPendente();
    fecharDialogosDaFase();
    if (sessao) {
      sessao.jogo.destroy(true);
      sessao = null;
    }
    dimensoesFaseAtual = null;
  }

  const atualizarHudHabitante = (resgatado: boolean, temHabitante: boolean) => {
    hudHabitante.hidden = !temHabitante;
    hudHabitante.dataset.resgatado = String(resgatado);
    const descricao = resgatado
      ? TEXTOS.hud.habitanteResgatado
      : TEXTOS.hud.habitanteNaoResgatado;
    hudHabitante.setAttribute('aria-label', descricao);
    hudHabitante.title = descricao;
  };

  const mostrarFimDeFase = (indice: number, resumo: ResumoConclusaoFase) => {
    const entrada = catalogo[indice];
    progresso.registrarConclusao(entrada.id);
    descartarFalaPendente();

    tituloConclusao.textContent = formatarTexto(TEXTOS.fimFase.titulo, { fase: entrada.nome });
    const linhas = [
      formatarTexto(TEXTOS.fimFase.provas, {
        coletadas: TOTAL_PROVAS_FASE,
        total: TOTAL_PROVAS_FASE,
      }),
      ...(resumo.temHabitante
        ? [resumo.habitanteResgatado ? TEXTOS.fimFase.habitanteSim : TEXTOS.fimFase.habitanteNao]
        : []),
      formatarContagemMortes(resumo.mortes),
      formatarTexto(TEXTOS.fimFase.tempo, { tempo: formatarTempo(resumo.tempoSegundos) }),
    ];
    resumoConclusao.replaceChildren(
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

    mensagemErro.hidden = true;
    hudNomeFase.textContent = entrada.nome;
    hudProvas.textContent = formatarTexto(TEXTOS.hud.provas, {
      coletadas: 0,
      total: TOTAL_PROVAS_FASE,
    });
    hudProvas.dataset.completo = 'false';
    hudDeslizes.textContent = formatarTexto(TEXTOS.hud.deslizes, { n: 0 });
    hudMortes.textContent = formatarTexto(TEXTOS.hud.mortes, { n: 0 });
    atualizarHudHabitante(false, false);
    document.title = `${entrada.nome} · ${TEXTOS.documento.titulo}`;
    mostrarTela('jogo');

    try {
      const textoFase = await carregarFaseDeTexto(entrada.mapa);
      if (geracao !== geracaoSessao) return; // o jogador saiu durante o carregamento

      const fase = parseFase(textoFase);
      const conteudoProvas = carregarConteudoProvasDaFase(entrada.conteudo);
      const conteudoHabitante = carregarConteudoHabitanteDaFase(entrada.conteudo);

      const cena = new FaseScene(fase, {
        aoAtualizarDeslizes: (deslizes) => {
          hudDeslizes.textContent = formatarTexto(TEXTOS.hud.deslizes, { n: deslizes });
        },
        aoAtualizarMortes: (mortes) => {
          hudMortes.textContent = formatarTexto(TEXTOS.hud.mortes, { n: mortes });
        },
        aoAtualizarProvas: (coletadas, total) => {
          hudProvas.textContent = formatarTexto(TEXTOS.hud.provas, { coletadas, total });
          hudProvas.dataset.completo = String(coletadas >= total);
        },
        aoAtualizarHabitante: atualizarHudHabitante,
        aoColetarProva: (prova) => {
          progresso.registrarProva(entrada.id, prova.numero);
        },
        aoResgatarHabitante: () => {
          progresso.registrarHabitante(entrada.id);
          if (conteudoHabitante) {
            exibirBalaoHabitante(conteudoHabitante);
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

      sessao = { indice, entrada, cena, jogo, conteudoProvas, conteudoHabitante };
      aplicarEscalaNoCanvas();
    } catch (erro) {
      if (geracao !== geracaoSessao) return;
      mostrarErroDeFase(erro);
    }
  }

  const reiniciarFase = () => {
    if (!sessao) return;
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

  const intro = criarIntro({
    resolverUrlAsset,
    aoTerminar: () => {
      progresso.registrarIntroVista();
      irParaSelecao();
    },
  });

  montarSobre(elemento('titulo-sobre'), elemento('sobre-conteudo'));

  botaoComecar.addEventListener('click', () => {
    // Gesto do jogador: ponto em que o áudio será destravado no celular (issue de áudio).
    mostrarTela('menu');
  });

  document.addEventListener('click', (evento) => {
    const alvo = (evento.target as HTMLElement | null)?.closest<HTMLElement>('[data-ir-para]');
    if (!alvo) return;
    const destino = alvo.dataset.irPara as NomeTela | 'jogar' | undefined;
    if (destino === 'jogar') {
      // Na primeira vez que se clica em Jogar, a introdução vem antes da seleção de Fase.
      if (progresso.introVista()) {
        irParaSelecao();
      } else {
        mostrarTela('intro');
        intro.iniciar();
      }
    } else if (destino === 'selecao') {
      irParaSelecao();
    } else if (destino === 'arquivo') {
      arquivo.renderizar();
      mostrarTela('arquivo');
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
        sessao.cena.reiniciar();
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
    if (acao !== 'ignorar' && sessao) {
      sessao.cena.fecharProva();
      tentarExibirFalaPendente();
    }
  });

  // A Fase já terminou: Esc não pode fechar o resumo e deixar o jogador numa cena parada.
  dialogConclusao.addEventListener('cancel', (evento) => {
    evento.preventDefault();
  });

  dialogConclusao.addEventListener('close', () => {
    const acao = dialogConclusao.returnValue;
    dialogConclusao.returnValue = '';
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
