/**
 * Spritesheet dos Habitantes: pixel art desenhada em código por `npm run gerar-habitantes`
 * (scripts/gerar-habitantes.ts). Mesmas proporções do Protagonista (quadros de 24×24),
 * para todos parecerem gente da mesma aldeia; cada um com silhueta própria.
 *
 * Uma linha por aparência; colunas: medo ×4 (tremendo, olhos procurando) · alívio ×2.
 */
export const SPRITES_HABITANTES = {
  chave: 'habitantes-sprites',
  arquivo: 'assets/habitantes-sprites.png',
  quadroPx: 24,
  colunas: 6,
  linhas: 3,
  /** Mesma origem do Protagonista: os pés na base do tile. */
  origemY: 14 / 24,
} as const;

/** Aparências desenhadas, na ordem das linhas da folha. */
export const APARENCIAS_HABITANTE = ['agente', 'avo', 'menino'] as const;
export type AparenciaHabitante = (typeof APARENCIAS_HABITANTE)[number];

export const COLUNAS_HABITANTE = { medo: [0, 1, 2, 3], alivio: [4, 5] } as const;

/**
 * Linha da folha para um Habitante: a aparência do conteúdo, se for conhecida; senão,
 * uma diferente para cada número (1, 2, 3), para dois Habitantes não ficarem iguais.
 */
export function linhaDoHabitante(aparencia: string | undefined, numero: number): number {
  const i = APARENCIAS_HABITANTE.indexOf(aparencia as AparenciaHabitante);
  if (i >= 0) return i;
  const n = Math.max(1, Math.floor(numero));
  return (n - 1) % APARENCIAS_HABITANTE.length;
}

export function chaveAnimacaoHabitante(acao: 'medo' | 'alivio', linha: number): string {
  return `habitante-${acao}-${linha}`;
}
