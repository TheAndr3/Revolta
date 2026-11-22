import Phaser from 'phaser';
import { CONFIG } from './core/config';
import { TOTAL_PROVAS_FASE } from './core/fase';
import { parseFase } from './core/parser';
import type { ConteudoProva } from './core/provas';
import { salvarProvaColetada } from './game/armazenamentoProvas';
import { carregarConteudoProvasDaFase } from './game/carregarProvas';
import { registrarControles } from './game/controles';
import { calcularEscalaInteira } from './game/escala';
import { FaseScene } from './game/FaseScene';
import './style.css';

const FASE_ID_ATUAL = 'fase-00';

async function carregarFaseDeTexto(caminhoRelativo: string): Promise<string> {
  const url = `${import.meta.env.BASE_URL}${caminhoRelativo}`;
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar a Fase (${resposta.status}): ${url}`);
  }
  return resposta.text();
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
  const srcIlustracao = prova.ilustracao.startsWith('http')
    ? prova.ilustracao
    : `${import.meta.env.BASE_URL}${prova.ilustracao}`;

  elementos.imagem.src = srcIlustracao;
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

async function iniciar(): Promise<void> {
  const palco = document.getElementById('palco');
  const hudProvas = document.getElementById('contador-provas');
  const hudDeslizes = document.getElementById('contador-deslizes');
  const hudMortes = document.getElementById('contador-mortes');
  const botaoPausa = document.getElementById('btn-pausa');
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
    !hudDeslizes ||
    !hudMortes ||
    !botaoPausa ||
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
    const [textoFase, conteudoProvas] = await Promise.all([
      carregarFaseDeTexto('fases/fase-00-teste.txt'),
      Promise.resolve(carregarConteudoProvasDaFase(FASE_ID_ATUAL)),
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
      aoColetarProva: (prova) => {
        salvarProvaColetada(FASE_ID_ATUAL, prova.numero);
      },
      aoAbrirProva: (prova) => {
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
      aoConcluir: ({ deslizes, mortes }) => {
        textoResumo.textContent = `Você coletou as ${TOTAL_PROVAS_FASE}/${TOTAL_PROVAS_FASE} Provas em ${deslizes} deslizes e ${formatarContagemMortes(mortes)}.`;
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

    const algumModalAberto = () =>
      dialogConclusao.open || dialogProva.open || dialogPausa.open || dialogMenu.open;

    const reiniciarFase = () => {
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
          break;
        case 'reiniciar':
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
          break;
      }
    });

    dialogMenu.addEventListener('close', () => {
      const acao = dialogMenu.returnValue;
      dialogMenu.returnValue = '';

      if (acao === 'ignorar') return;
      if (acao === 'jogar') {
        cena.reiniciar();
      } else {
        cena.retomar();
      }
    });

    dialogProva.addEventListener('close', () => {
      const acao = dialogProva.returnValue;
      dialogProva.returnValue = '';
      if (acao !== 'ignorar') {
        cena.fecharProva();
      }
    });

    dialogConclusao.addEventListener('close', () => {
      const acao = dialogConclusao.returnValue;
      dialogConclusao.returnValue = '';
      if (acao === 'reiniciar') {
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
