import type { IdLoop, IdSom } from '../core/audio';

/**
 * Arquivos de áudio (caminhos relativos a `public/`).
 *
 * Enquanto um som não tiver arquivo aqui, o jogo usa uma versão provisória
 * sintetizada por código (ver `audio.ts`). Música e loops (`musica`, `gosma`,
 * `drone`) tocam em loop; os demais, uma vez.
 *
 * Experimento com assets CC0 de terceiros: origem e licença em
 * `public/assets/cc0/CREDITOS.md`. Os loops da Gosma e do Drone continuam sintetizados.
 */
export const ARQUIVOS_AUDIO: Partial<Record<IdSom | IdLoop, string>> = {
  musica: 'audio/floresta.ogg',
  deslize: 'audio/sfx/deslize.ogg',
  batida: 'audio/sfx/batida.ogg',
  tranco: 'audio/sfx/tranco.ogg',
  prova: 'audio/sfx/prova.ogg',
  totem: 'audio/sfx/totem.ogg',
  saida: 'audio/sfx/saida.ogg',
  morte: 'audio/sfx/morte.ogg',
  reaparecer: 'audio/sfx/reaparecer.ogg',
  espinho: 'audio/sfx/espinho.ogg',
  resgate: 'audio/sfx/resgate.ogg',
  conclusao: 'audio/sfx/conclusao.ogg',
  interface: 'audio/sfx/interface.ogg',
  alma: 'audio/sfx/alma.ogg',
};
