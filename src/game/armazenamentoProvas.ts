import type { NumeroProva } from '../core/fase';

const CHAVE_STORAGE = 'revolta:provas-salvas:v1';

export interface StorageBasico {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function obterStoragePadrao(): StorageBasico | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function chaveProva(faseId: string, numero: NumeroProva): string {
  return `${faseId}:${numero}`;
}

export function listarProvasSalvas(
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
 * Persiste imediatamente a coleta de uma Prova no Arquivo da Resistência local.
 * Seguro contra ambientes sem localStorage ou modo privado restrito.
 */
export function salvarProvaColetada(
  faseId: string,
  numero: NumeroProva,
  storage: StorageBasico | null = obterStoragePadrao(),
): void {
  if (!storage) return;
  try {
    const existentes = new Set(listarProvasSalvas(storage));
    existentes.add(chaveProva(faseId, numero));
    storage.setItem(CHAVE_STORAGE, JSON.stringify([...existentes].sort()));
  } catch {
    // Falha silenciosa se o navegador bloquear escrita em localStorage
  }
}
