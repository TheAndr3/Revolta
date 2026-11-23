/**
 * Leitura da paleta do kit de estilo (`art/paleta.hex`): um hex por linha,
 * com comentário opcional depois de ";" no formato "nome · grupo · uso".
 */

export const MINIMO_CORES_PALETA = 24;
export const MAXIMO_CORES_PALETA = 32;

export interface CorPaleta {
  /** Hex em minúsculas, sem "#". */
  readonly hex: string;
  readonly nome: string;
  readonly grupo: string;
  readonly uso: string;
}

export function lerPaletaHex(conteudo: string): CorPaleta[] {
  const cores: CorPaleta[] = [];
  conteudo.split(/\r?\n/).forEach((linhaBruta, i) => {
    const linha = linhaBruta.trim();
    if (linha === '' || linha.startsWith(';')) return;

    const [hexBruto, comentario = ''] = linha.split(';', 2).map((parte) => parte.trim());
    const hex = hexBruto.replace(/^#/, '').toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(hex)) {
      throw new Error(`art/paleta.hex, linha ${i + 1}: "${hexBruto}" não é uma cor hex de 6 dígitos.`);
    }
    const [nome = '', grupo = '', uso = ''] = comentario.split('·').map((parte) => parte.trim());
    cores.push({ hex, nome, grupo, uso });
  });

  const repetidas = cores.filter((cor, i) => cores.findIndex((c) => c.hex === cor.hex) !== i);
  if (repetidas.length > 0) {
    throw new Error(
      `art/paleta.hex: cores repetidas: ${repetidas.map((c) => `#${c.hex}`).join(', ')}.`,
    );
  }
  if (cores.length < MINIMO_CORES_PALETA || cores.length > MAXIMO_CORES_PALETA) {
    throw new Error(
      `art/paleta.hex: a paleta tem ${cores.length} cores; devem ser de ${MINIMO_CORES_PALETA} a ${MAXIMO_CORES_PALETA}.`,
    );
  }
  return cores;
}

/** Converte "rrggbb" em [r, g, b]. */
export function hexParaRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
