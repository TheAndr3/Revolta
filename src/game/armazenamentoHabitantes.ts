import type { StorageBasico } from './armazenamentoProvas';

const CHAVE_STORAGE = 'revolta:habitantes-resgatados:v1';

function obterStoragePadrao(): StorageBasico | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function listarHabitantesResgatados(
  storage: StorageBasico | null = obterStoragePadrao(),
): string[] {
  if (!storage) return [];
  try {
    const bruto = storage.getItem(CHAVE_STORAGE);
    if (!bruto) return [];
    const parsed: unknown = JSON.parse(bruto);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

/**
 * Chave salva de um Habitante: `<faseId>#<número>` (número 1, 2, 3 na ordem do grid).
 * Saves antigos, de quando a Fase tinha um Habitante só, guardam só `<faseId>`: vale
 * como o Habitante 1.
 */
export function chaveHabitante(faseId: string, numero: number): string {
  return `${faseId}#${numero}`;
}

/** Números (1, 2, 3) dos Habitantes já resgatados na Fase, a partir das chaves salvas. */
export function numerosResgatados(chaves: Iterable<string>, faseId: string): Set<number> {
  const numeros = new Set<number>();
  for (const chave of chaves) {
    if (chave === faseId) numeros.add(1);
    else if (chave.startsWith(`${faseId}#`)) {
      const numero = Number(chave.slice(faseId.length + 1));
      if (Number.isInteger(numero) && numero >= 1) numeros.add(numero);
    }
  }
  return numeros;
}

/**
 * Persiste imediatamente o resgate de um Habitante da Fase no navegador.
 * Morrer não remove o resgate.
 */
export function salvarHabitanteResgatado(
  faseId: string,
  numero: number,
  storage: StorageBasico | null = obterStoragePadrao(),
): void {
  if (!storage) return;
  try {
    const existentes = new Set(listarHabitantesResgatados(storage));
    existentes.add(chaveHabitante(faseId, numero));
    storage.setItem(CHAVE_STORAGE, JSON.stringify([...existentes].sort()));
  } catch {
    // Falha silenciosa se o navegador bloquear escrita em localStorage
  }
}
