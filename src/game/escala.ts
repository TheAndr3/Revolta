import { CONFIG } from '../core/config';

export interface DimensoesEscala {
  /** Largura lógica do canvas Phaser (cerca de 9 colunas, ADR 0006). */
  readonly larguraLogica: number;
  /** Altura lógica do canvas Phaser (limitada à altura do mundo). */
  readonly alturaLogica: number;
  /** Largura exibida em CSS px. */
  readonly larguraCss: number;
  /** Altura exibida em CSS px. */
  readonly alturaCss: number;
  /** Fator inteiro aplicado sobre os pixels lógicos, em pixels físicos da tela. */
  readonly escalaInteira: number;
}

export interface OpcoesEscala {
  readonly colunasVisiveis: number;
  readonly linhasMinimas: number;
}

const OPCOES_PADRAO: OpcoesEscala = {
  colunasVisiveis: CONFIG.camera.colunasVisiveis,
  linhasMinimas: CONFIG.camera.linhasMinimasVisiveis,
};

/**
 * Escolhe a maior escala inteira (em pixels físicos, para a pixel art ficar nítida
 * em qualquer DPR) que mostre `colunasVisiveis` colunas e pelo menos `linhasMinimas`
 * linhas. A largura visível fica fixa em ~9 colunas em qualquer tela (no PC, o jogo
 * vira uma coluna em pé, como no celular); a altura usa o espaço que sobra.
 */
export function calcularEscalaInteira(
  larguraViewportCss: number,
  alturaViewportCss: number,
  dpr: number,
  larguraMundoPx: number,
  alturaMundoPx: number,
  opcoes: OpcoesEscala = OPCOES_PADRAO,
): DimensoesEscala {
  const tile = CONFIG.tamanhoTilePx;
  const dprSeguro = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const larguraFisica = Math.max(1, Math.floor(Math.max(1, larguraViewportCss) * dprSeguro));
  const alturaFisica = Math.max(1, Math.floor(Math.max(1, alturaViewportCss) * dprSeguro));

  const larguraAlvo = Math.min(larguraMundoPx, opcoes.colunasVisiveis * tile);
  const alturaMinima = Math.min(alturaMundoPx, opcoes.linhasMinimas * tile);
  const escala = Math.max(
    1,
    Math.min(Math.floor(larguraFisica / larguraAlvo), Math.floor(alturaFisica / alturaMinima)),
  );

  const larguraLogica = Math.min(larguraAlvo, Math.floor(larguraFisica / escala));
  const alturaLogica = Math.min(alturaMundoPx, Math.floor(alturaFisica / escala));

  return {
    larguraLogica,
    alturaLogica,
    larguraCss: Math.round((larguraLogica * escala) / dprSeguro),
    alturaCss: Math.round((alturaLogica * escala) / dprSeguro),
    escalaInteira: escala,
  };
}
