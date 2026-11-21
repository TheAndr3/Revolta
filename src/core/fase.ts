export type TipoCelula = 'chao' | 'parede' | 'inicio' | 'saida';

export interface Coordenada {
  readonly col: number;
  readonly lin: number;
}

export interface Fase {
  readonly largura: number;
  readonly altura: number;
  readonly grade: readonly (readonly TipoCelula[])[];
  readonly inicio: Coordenada;
  readonly saida: Coordenada;
}

export function celulaEm(fase: Fase, col: number, lin: number): TipoCelula | null {
  if (lin < 0 || lin >= fase.altura || col < 0 || col >= fase.largura) {
    return null;
  }
  return fase.grade[lin][col];
}

export function ehParede(fase: Fase, col: number, lin: number): boolean {
  const celula = celulaEm(fase, col, lin);
  return celula === null || celula === 'parede';
}
