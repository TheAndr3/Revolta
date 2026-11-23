import type { IdLoop, IdSom } from '../core/audio';

/**
 * Arquivos de áudio finais (issues #5 e #6), com caminhos relativos a `public/`.
 *
 * Enquanto um som não tiver arquivo aqui, o jogo usa uma versão provisória
 * sintetizada por código (ver `audio.ts`). Para trocar, basta acrescentar a
 * entrada, por exemplo:
 *
 *   musica: 'audio/floresta.ogg',
 *   deslize: 'audio/sfx/deslize.ogg',
 *
 * Música e loops (`musica`, `gosma`, `drone`) tocam em loop; os demais, uma vez.
 */
export const ARQUIVOS_AUDIO: Partial<Record<IdSom | IdLoop, string>> = {};
