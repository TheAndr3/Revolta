export interface DimensoesEscala {
  /** Largura lógica do canvas Phaser (sempre 15 * 16 = 240 px). */
  readonly larguraLogica: number;
  /** Altura lógica do canvas Phaser (limitada à altura do mundo). */
  readonly alturaLogica: number;
  /** Largura exibida em CSS px. */
  readonly larguraCss: number;
  /** Altura exibida em CSS px. */
  readonly alturaCss: number;
  /** Fator inteiro aplicado sobre os pixels lógicos. */
  readonly escalaInteira: number;
}

const ALTURA_LOGICA_MINIMA_VISIVEL = 240; // 15 tiles (7 acima + protagonista + 7 abaixo)

export function calcularEscalaInteira(
  larguraViewportCss: number,
  alturaViewportCss: number,
  dpr: number,
  larguraMundoPx: number,
  alturaMundoPx: number,
): DimensoesEscala {
  const larguraSegura = Math.max(larguraMundoPx, Math.floor(larguraViewportCss));
  const alturaSegura = Math.max(160, Math.floor(alturaViewportCss));
  const dprSeguro = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;

  // Telas largas (PC/tablet): escala inteira em CSS px (×1..×4)
  if (larguraSegura >= 720) {
    const maxPorLargura = Math.floor(larguraSegura / larguraMundoPx);
    const maxPorAltura = Math.floor(alturaSegura / ALTURA_LOGICA_MINIMA_VISIVEL);
    const escala = Math.max(1, Math.min(4, maxPorLargura, Math.max(1, maxPorAltura)));
    const alturaLogica = Math.min(alturaMundoPx, Math.max(1, Math.floor(alturaSegura / escala)));

    return {
      larguraLogica: larguraMundoPx,
      alturaLogica,
      larguraCss: larguraMundoPx * escala,
      alturaCss: alturaLogica * escala,
      escalaInteira: escala,
    };
  }

  // Celulares/telas estreitas: escala inteira em pixels físicos (crisp em DPR 2/3)
  const larguraFisica = Math.floor(larguraSegura * dprSeguro);
  const alturaFisica = Math.floor(alturaSegura * dprSeguro);
  const maxPorLargura = Math.floor(larguraFisica / larguraMundoPx);
  const maxPorAltura = Math.floor(alturaFisica / ALTURA_LOGICA_MINIMA_VISIVEL);
  const escalaFisica = Math.max(1, Math.min(6, maxPorLargura, Math.max(1, maxPorAltura)));
  const alturaLogica = Math.min(
    alturaMundoPx,
    Math.max(1, Math.floor(alturaFisica / escalaFisica)),
  );

  return {
    larguraLogica: larguraMundoPx,
    alturaLogica,
    larguraCss: Math.round((larguraMundoPx * escalaFisica) / dprSeguro),
    alturaCss: Math.round((alturaLogica * escalaFisica) / dprSeguro),
    escalaInteira: escalaFisica,
  };
}
