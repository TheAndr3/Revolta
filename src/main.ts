import Phaser from 'phaser';
import { CONFIG } from './core/config';
import { parseFase } from './core/parser';
import { registrarControles } from './game/controles';
import { calcularEscalaInteira } from './game/escala';
import { FaseScene } from './game/FaseScene';
import './style.css';

async function carregarFaseDeTexto(caminhoRelativo: string): Promise<string> {
  const url = `${import.meta.env.BASE_URL}${caminhoRelativo}`;
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar a Fase (${resposta.status}): ${url}`);
  }
  return resposta.text();
}

async function iniciar(): Promise<void> {
  const palco = document.getElementById('palco');
  const hudDeslizes = document.getElementById('contador-deslizes');
  const botaoReiniciar = document.getElementById('btn-reiniciar');
  const dialogConclusao = document.getElementById('modal-conclusao') as HTMLDialogElement | null;
  const textoResumo = document.getElementById('resumo-conclusao');
  const mensagemErro = document.getElementById('mensagem-erro');

  if (!palco || !hudDeslizes || !botaoReiniciar || !dialogConclusao || !textoResumo || !mensagemErro) {
    throw new Error('Elementos esperados do DOM não foram encontrados.');
  }

  try {
    const textoFase = await carregarFaseDeTexto('fases/fase-00-teste.txt');
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
      aoConcluir: (deslizes) => {
        textoResumo.textContent = `Você alcançou a Saída em ${deslizes} deslizes.`;
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
      if (dialogConclusao.open) {
        dialogConclusao.close();
      }
      cena.reiniciar();
    };

    botaoReiniciar.addEventListener('click', reiniciarFase);

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
      () => dialogConclusao.open,
    );
  } catch (erro) {
    mensagemErro.hidden = false;
    mensagemErro.textContent =
      erro instanceof Error ? erro.message : 'Erro inesperado ao iniciar o jogo.';
  }
}

void iniciar();
