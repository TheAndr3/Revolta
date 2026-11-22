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
 * Persiste imediatamente o resgate do Habitante da Fase no navegador.
 * Morrer não remove o resgate.
 */
export function salvarHabitanteResgatado(
  faseId: string,
  storage: StorageBasico | null = obterStoragePadrao(),
): void {
  if (!storage) return;
  try {
    const existentes = new Set(listarHabitantesResgatados(storage));
    existentes.add(faseId);
    storage.setItem(CHAVE_STORAGE, JSON.stringify([...existentes].sort()));
  } catch {
    // Falha silenciosa se o navegador bloquear escrita em localStorage
  }
}
