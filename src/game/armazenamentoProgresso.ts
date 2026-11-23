import type { NumeroProva } from '../core/fase';
import {
  listarHabitantesResgatados,
  salvarHabitanteResgatado,
} from './armazenamentoHabitantes';
import {
  listarProvasSalvas,
  salvarProvaColetada,
  type StorageBasico,
} from './armazenamentoProvas';

const CHAVE_FASES_CONCLUIDAS = 'revolta:fases-concluidas:v1';
const CHAVE_INTRO_VISTA = 'revolta:intro-vista:v1';

function obterStoragePadrao(): StorageBasico | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function lerListaDeTextos(storage: StorageBasico | null, chave: string): string[] {
  if (!storage) return [];
  try {
    const bruto = storage.getItem(chave);
    if (!bruto) return [];
    const parsed: unknown = JSON.parse(bruto);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function gravarListaDeTextos(
  storage: StorageBasico | null,
  chave: string,
  valores: ReadonlySet<string>,
): void {
  if (!storage) return;
  try {
    storage.setItem(chave, JSON.stringify([...valores].sort()));
  } catch {
    // Armazenamento cheio ou bloqueado: o progresso segue só em memória.
  }
}

export interface RepositorioProgresso {
  fasesConcluidas(): ReadonlySet<string>;
  faseConcluida(faseId: string): boolean;
  habitanteResgatado(faseId: string): boolean;
  provaColetada(faseId: string, numero: NumeroProva): boolean;
  registrarConclusao(faseId: string): void;
  registrarProva(faseId: string, numero: NumeroProva): void;
  registrarHabitante(faseId: string): void;
  /** A introdução já foi vista (ou pulada) neste navegador. */
  introVista(): boolean;
  registrarIntroVista(): void;
}

/**
 * Progresso do jogador: Fases concluídas, Provas e Habitantes.
 *
 * O estado vive em memória durante a sessão; o navegador é só a cópia
 * persistente. Se o `localStorage` estiver bloqueado, cheio ou corrompido,
 * o jogo continua funcionando, apenas sem salvar entre recarregamentos.
 */
export function criarRepositorioProgresso(
  storage: StorageBasico | null = obterStoragePadrao(),
): RepositorioProgresso {
  const concluidas = new Set(lerListaDeTextos(storage, CHAVE_FASES_CONCLUIDAS));
  const provas = new Set(listarProvasSalvas(storage));
  const habitantes = new Set(listarHabitantesResgatados(storage));
  let introVista = false;
  try {
    introVista = storage?.getItem(CHAVE_INTRO_VISTA) === '1';
  } catch {
    introVista = false;
  }

  return {
    fasesConcluidas: () => concluidas,
    faseConcluida: (faseId) => concluidas.has(faseId),
    habitanteResgatado: (faseId) => habitantes.has(faseId),
    provaColetada: (faseId, numero) => provas.has(`${faseId}:${numero}`),
    registrarConclusao: (faseId) => {
      concluidas.add(faseId);
      gravarListaDeTextos(storage, CHAVE_FASES_CONCLUIDAS, concluidas);
    },
    registrarProva: (faseId, numero) => {
      provas.add(`${faseId}:${numero}`);
      salvarProvaColetada(faseId, numero, storage);
    },
    registrarHabitante: (faseId) => {
      habitantes.add(faseId);
      salvarHabitanteResgatado(faseId, storage);
    },
    introVista: () => introVista,
    registrarIntroVista: () => {
      introVista = true;
      try {
        storage?.setItem(CHAVE_INTRO_VISTA, '1');
      } catch {
        // Sem armazenamento: a intro não volta nesta sessão, mas pode voltar ao recarregar.
      }
    },
  };
}
