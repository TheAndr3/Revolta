import Phaser from 'phaser';
import { CONFIG } from './core/config';
import { TOTAL_PROVAS_FASE } from './core/fase';
import type { ConteudoHabitante } from './core/habitantes';
import { parseFase } from './core/parser';
import type { ConteudoProva } from './core/provas';
import { salvarHabitanteResgatado } from './game/armazenamentoHabitantes';
import { salvarProvaColetada } from './game/armazenamentoProvas';
import { carregarConteudoHabitanteDaFase } from './game/carregarHabitante';
import { carregarConteudoProvasDaFase } from './game/carregarProvas';
import { registrarControles } from './game/controles';
import { calcularEscalaInteira } from './game/escala';
import { FaseScene } from './game/FaseScene';
import './style.css';

const FASE_ID_ATUAL = 'fase-00';
const DURACAO_BALAO_HABITANTE_MS = 5000;

interface DocumentoComAriaNotify extends Document {
  ariaNotify?: (mensagem: string) => void;
}

async function carregarFaseDeTexto(caminhoRelativo: string): Promise<string> {
  const url = `${import.meta.env.BASE_URL}${caminhoRelativo}`;
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar a Fase (${resposta.status}): ${url}`);
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
  elementos.imagem.alt = `Ilustração da Prova: ${prova.titulo}`;
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
  return mortes === 1 ? '1 morte' : `${mortes} mortes`;
}

function anunciarParaLeitorDeTela(
  mensagem: string,
  liveRegionFallback: HTMLElement,
): void {
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

async function iniciar(): Promise<void> {
  const palco = document.getElementById('palco');
  const hudProvas = document.getElementById('contador-provas');
  const hudHabitante = document.getElementById('status-habitante');
  const hudDeslizes = document.getElementById('contador-deslizes');
  const hudMortes = document.getElementById('contador-mortes');
  const botaoPausa = document.getElementById('btn-pausa');
  const balaoHabitante = document.getElementById('balao-habitante');
  const balaoRetrato = document.getElementById('balao-retrato') as HTMLImageElement | null;
  const balaoNome = document.getElementById('balao-nome');
  const balaoFala = document.getElementById('balao-fala');
  const botaoFecharBalao = document.getElementById('btn-fechar-balao');
  const anuncioHabitante = document.getElementById('anuncio-habitante');
  const dialogPausa = document.getElementById('modal-pausa') as HTMLDialogElement | null;
  const dialogMenu = document.getElementById(
    'modal-menu-provisorio',
  ) as HTMLDialogElement | null;
  const dialogProva = document.getElementById('modal-prova') as HTMLDialogElement | null;
  const provaImagem = document.getElementById('prova-imagem') as HTMLImageElement | null;
  const provaTipo = document.getElementById('prova-tipo');
  const provaTitulo = document.getElementById('prova-titulo');
  const provaTexto = document.getElementById('prova-texto');
  const dialogConclusao = document.getElementById('modal-conclusao') as HTMLDialogElement | null;
  const textoResumo = document.getElementById('resumo-conclusao');
  const mensagemErro = document.getElementById('mensagem-erro');

  if (
    !palco ||
    !hudProvas ||
    !hudHabitante ||
    !hudDeslizes ||
    !hudMortes ||
    !botaoPausa ||
    !balaoHabitante ||
    !balaoRetrato ||
    !balaoNome ||
    !balaoFala ||
    !botaoFecharBalao ||
    !anuncioHabitante ||
    !dialogPausa ||
    !dialogMenu ||
    !dialogProva ||
    !provaImagem ||
    !provaTipo ||
    !provaTitulo ||
    !provaTexto ||
    !dialogConclusao ||
    !textoResumo ||
    !mensagemErro
  ) {
    throw new Error('Elementos esperados do DOM não foram encontrados.');
  }

  try {
    const [textoFase, conteudoProvas, conteudoHabitante] = await Promise.all([
      carregarFaseDeTexto('fases/fase-00-teste.txt'),
      Promise.resolve(carregarConteudoProvasDaFase(FASE_ID_ATUAL)),
      Promise.resolve(carregarConteudoHabitanteDaFase(FASE_ID_ATUAL)),
    ]);
    const fase = parseFase(textoFase);

    const larguraMundoPx = fase.largura * CONFIG.tamanhoTilePx;
    const alturaMundoPx = fase.altura * CONFIG.tamanhoTilePx;

    const medirEscala = () => {
      const rect = palco.getBoundingClientRect();
      return calcularEscalaInteira(
        rect.width || window.innerWidth,
        rect.height || window.innerHeight,
        window.devicePixelRatio || 1,
        larguraMundoPx,
        alturaMundoPx,
      );
    };

    const dimensoesIniciais = medirEscala();

    const suportaPopover = typeof balaoHabitante.showPopover === 'function';
    let temporizadorBalao: number | null = null;
    let falaHabitantePendente: ConteudoHabitante | null = null;

    const algumModalAberto = () =>
      dialogConclusao.open || dialogProva.open || dialogPausa.open || dialogMenu.open;

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
      balaoRetrato.alt = `Retrato de ${habitante.nome}`;
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
        `${habitante.nome} resgatado: ${habitante.fala}`,
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

    balaoHabitante.addEventListener('focusin', limparTemporizadorBalao);
    balaoHabitante.addEventListener('focusout', (evento) => {
      const proximo = evento.relatedTarget as Node | null;
      if (!proximo || !balaoHabitante.contains(proximo)) {
        agendarFechamentoBalao();
      }
    });
    botaoFecharBalao.addEventListener('click', () => {
      fecharBalaoHabitante();
    });

    const cena = new FaseScene(fase, {
      aoAtualizarDeslizes: (deslizes) => {
        hudDeslizes.textContent = `Deslizes: ${deslizes}`;
      },
      aoAtualizarMortes: (mortes) => {
        hudMortes.textContent = `Mortes: ${mortes}`;
      },
      aoAtualizarProvas: (coletadas, total) => {
        hudProvas.textContent = `Provas ${coletadas}/${total}`;
        hudProvas.dataset.completo = String(coletadas >= total);
      },
      aoAtualizarHabitante: (resgatado, temHabitante) => {
        hudHabitante.hidden = !temHabitante;
        hudHabitante.dataset.resgatado = String(resgatado);
        const descricao = resgatado
          ? 'Habitante: resgatado'
          : 'Habitante: ainda não resgatado';
        hudHabitante.setAttribute('aria-label', descricao);
        hudHabitante.title = descricao;
      },
      aoColetarProva: (prova) => {
        salvarProvaColetada(FASE_ID_ATUAL, prova.numero);
      },
      aoResgatarHabitante: () => {
        salvarHabitanteResgatado(FASE_ID_ATUAL);
        if (conteudoHabitante) {
          exibirBalaoHabitante(conteudoHabitante);
        }
      },
      aoAbrirProva: (prova) => {
        fecharBalaoHabitante();
        const conteudo = conteudoProvas[prova.numero];
        preencherOverlayProva(conteudo, {
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
      aoConcluir: ({ deslizes, mortes, habitanteResgatado, temHabitante }) => {
        fecharBalaoHabitante();
        const trechoHabitante = temHabitante
          ? ` · Habitante ${habitanteResgatado ? '✔' : '✘'}`
          : '';
        textoResumo.textContent = `Provas ${TOTAL_PROVAS_FASE}/${TOTAL_PROVAS_FASE}${trechoHabitante} · ${deslizes} deslizes · ${formatarContagemMortes(mortes)}.`;
        if (!dialogConclusao.open) {
          dialogConclusao.showModal();
        }
      },
    });

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

    const aplicarEscalaNoCanvas = () => {
      const d = medirEscala();
      jogo.scale.resize(d.larguraLogica, d.alturaLogica);
      cena.atualizarTamanhoViewport(d.larguraLogica, d.alturaLogica);
      const canvas = jogo.canvas;
      if (canvas) {
        canvas.style.width = `${d.larguraCss}px`;
        canvas.style.height = `${d.alturaCss}px`;
      }
    };

    aplicarEscalaNoCanvas();
    window.addEventListener('resize', aplicarEscalaNoCanvas);
    window.addEventListener('orientationchange', aplicarEscalaNoCanvas);

    const reiniciarFase = () => {
      falaHabitantePendente = null;
      fecharBalaoHabitante();
      if (dialogProva.open) {
        dialogProva.close('ignorar');
      }
      if (dialogPausa.open) {
        dialogPausa.close('ignorar');
      }
      if (dialogMenu.open) {
        dialogMenu.close('ignorar');
      }
      if (dialogConclusao.open) {
        dialogConclusao.close();
      }
      cena.reiniciar();
    };

    const abrirPausa = () => {
      if (algumModalAberto()) return;
      fecharBalaoHabitante();
      cena.pausar();
      dialogPausa.showModal();
    };

    botaoPausa.addEventListener('click', abrirPausa);

    dialogPausa.addEventListener('close', () => {
      const acao = dialogPausa.returnValue;
      dialogPausa.returnValue = '';

      switch (acao) {
        case 'ignorar':
          break;
        case 'totem':
          cena.voltarAoTotem();
          tentarExibirFalaPendente();
          break;
        case 'reiniciar':
          falaHabitantePendente = null;
          fecharBalaoHabitante();
          cena.reiniciar();
          break;
        case 'sair':
          if (!dialogMenu.open) {
            dialogMenu.showModal();
          }
          break;
        case 'continuar':
        case '':
        default:
          cena.retomar();
          tentarExibirFalaPendente();
          break;
      }
    });

    dialogMenu.addEventListener('close', () => {
      const acao = dialogMenu.returnValue;
      dialogMenu.returnValue = '';

      if (acao === 'ignorar') return;
      if (acao === 'jogar') {
        falaHabitantePendente = null;
        fecharBalaoHabitante();
        cena.reiniciar();
      } else {
        cena.retomar();
        tentarExibirFalaPendente();
      }
    });

    dialogProva.addEventListener('close', () => {
      const acao = dialogProva.returnValue;
      dialogProva.returnValue = '';
      if (acao !== 'ignorar') {
        cena.fecharProva();
        tentarExibirFalaPendente();
      }
    });

    dialogConclusao.addEventListener('close', () => {
      const acao = dialogConclusao.returnValue;
      dialogConclusao.returnValue = '';
      if (acao === 'reiniciar') {
        falaHabitantePendente = null;
        fecharBalaoHabitante();
        cena.reiniciar();
      }
    });

    registrarControles(
      palco,
      (direcao) => cena.receberDirecao(direcao),
      reiniciarFase,
      algumModalAberto,
      abrirPausa,
    );
  } catch (erro) {
    mensagemErro.hidden = false;
    mensagemErro.textContent =
      erro instanceof Error ? erro.message : 'Erro inesperado ao iniciar o jogo.';
  }
}

void iniciar();
