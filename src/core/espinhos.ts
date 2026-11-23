import { CONFIG } from './config';
import type { Coordenada } from './fase';

/**
 * Espinhos temporários (a única Armadilha do protótipo).
 *
 * Ciclo: `recolhido` → (o Protagonista passa por cima) → `aviso` → `ativo` → `recolhendo` → `recolhido`.
 * Só matam em `ativo`. Como o aviso dura mais do que atravessar um tile deslizando,
 * passar deslizando é sempre seguro; o perigo é parar em cima ou voltar logo.
 */
export type EtapaEspinho = 'recolhido' | 'aviso' | 'ativo' | 'recolhendo';

export interface EstadoEspinho {
  readonly celula: Coordenada;
  etapa: EtapaEspinho;
  /** Tempo decorrido na etapa atual, em segundos. */
  tempoNaEtapa: number;
}

export interface TemposEspinho {
  readonly avisoSegundos: number;
  readonly ativoSegundos: number;
  readonly recolhendoSegundos: number;
}

export const TEMPOS_ESPINHO_PADRAO: TemposEspinho = CONFIG.espinhos;

export function criarEspinhos(celulas: readonly Coordenada[]): EstadoEspinho[] {
  return celulas.map((celula) => ({
    celula: { col: celula.col, lin: celula.lin },
    etapa: 'recolhido',
    tempoNaEtapa: 0,
  }));
}

/** Volta todos os espinhos ao estado inicial (ao morrer ou voltar ao Totem). */
export function reiniciarEspinhos(espinhos: EstadoEspinho[]): void {
  for (const espinho of espinhos) {
    espinho.etapa = 'recolhido';
    espinho.tempoNaEtapa = 0;
  }
}

/** O Protagonista passou por cima: um espinho recolhido começa o aviso. Devolve se disparou. */
export function pisarEspinho(espinho: EstadoEspinho): boolean {
  if (espinho.etapa !== 'recolhido') return false;
  espinho.etapa = 'aviso';
  espinho.tempoNaEtapa = 0;
  return true;
}

export function espinhoLetal(espinho: EstadoEspinho): boolean {
  return espinho.etapa === 'ativo';
}

export function algumEspinhoEmCiclo(espinhos: readonly EstadoEspinho[]): boolean {
  return espinhos.some((espinho) => espinho.etapa !== 'recolhido');
}

function duracaoDaEtapa(etapa: EtapaEspinho, tempos: TemposEspinho): number {
  switch (etapa) {
    case 'aviso':
      return tempos.avisoSegundos;
    case 'ativo':
      return tempos.ativoSegundos;
    case 'recolhendo':
      return tempos.recolhendoSegundos;
    case 'recolhido':
      return Number.POSITIVE_INFINITY;
  }
}

const PROXIMA_ETAPA: Record<EtapaEspinho, EtapaEspinho> = {
  recolhido: 'recolhido',
  aviso: 'ativo',
  ativo: 'recolhendo',
  recolhendo: 'recolhido',
};

/** Avança o relógio dos espinhos em ciclo. */
export function avancarEspinhos(
  espinhos: EstadoEspinho[],
  deltaSegundos: number,
  tempos: TemposEspinho = TEMPOS_ESPINHO_PADRAO,
): void {
  for (const espinho of espinhos) {
    if (espinho.etapa === 'recolhido') continue;
    espinho.tempoNaEtapa += deltaSegundos;

    // Um passo grande pode atravessar mais de uma etapa.
    let duracao = duracaoDaEtapa(espinho.etapa, tempos);
    while (espinho.etapa !== 'recolhido' && espinho.tempoNaEtapa >= duracao) {
      espinho.tempoNaEtapa -= duracao;
      espinho.etapa = PROXIMA_ETAPA[espinho.etapa];
      duracao = duracaoDaEtapa(espinho.etapa, tempos);
    }
    if (espinho.etapa === 'recolhido') {
      espinho.tempoNaEtapa = 0;
    }
  }
}

/** O Protagonista ocupa a célula do espinho (metade de um tile em cada eixo). */
export function protagonistaSobreEspinho(
  posicao: { readonly x: number; readonly y: number },
  espinho: EstadoEspinho,
): boolean {
  return (
    Math.abs(posicao.x - espinho.celula.col) < 0.5 &&
    Math.abs(posicao.y - espinho.celula.lin) < 0.5
  );
}
