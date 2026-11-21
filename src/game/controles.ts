import { CONFIG } from '../core/config';
import type { Direcao } from '../core/deslize';

export function direcaoDeTecla(tecla: string): Direcao | null {
  switch (tecla) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'cima';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'baixo';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'esquerda';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'direita';
    default:
      return null;
  }
}

export function direcaoDeSwipe(
  dx: number,
  dy: number,
  distanciaMinimaPx: number = CONFIG.distanciaMinimaSwipePx,
): Direcao | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.hypot(dx, dy) < distanciaMinimaPx) {
    return null;
  }
  if (absX >= absY) {
    return dx > 0 ? 'direita' : 'esquerda';
  }
  return dy > 0 ? 'baixo' : 'cima';
}

export function registrarControles(
  alvoSwipe: HTMLElement,
  aoDirecionar: (direcao: Direcao) => void,
  aoReiniciar: () => void,
  estaBloqueado: () => boolean,
): () => void {
  const onKeyDown = (evento: KeyboardEvent) => {
    if (estaBloqueado()) return;

    if (evento.key === 'r' || evento.key === 'R') {
      evento.preventDefault();
      aoReiniciar();
      return;
    }

    const direcao = direcaoDeTecla(evento.key);
    if (!direcao) return;

    evento.preventDefault();
    aoDirecionar(direcao);
  };

  let ponteiroAtivo: { id: number; x: number; y: number } | null = null;

  const onPointerDown = (evento: PointerEvent) => {
    if (estaBloqueado()) return;
    if (evento.button !== 0 && evento.pointerType === 'mouse') return;
    if ((evento.target as HTMLElement | null)?.closest('button, dialog')) return;

    ponteiroAtivo = { id: evento.pointerId, x: evento.clientX, y: evento.clientY };
  };

  const finalizarSwipe = (evento: PointerEvent) => {
    if (!ponteiroAtivo || evento.pointerId !== ponteiroAtivo.id) return;
    const dx = evento.clientX - ponteiroAtivo.x;
    const dy = evento.clientY - ponteiroAtivo.y;
    ponteiroAtivo = null;

    if (estaBloqueado()) return;
    const direcao = direcaoDeSwipe(dx, dy);
    if (direcao) {
      aoDirecionar(direcao);
    }
  };

  const cancelarSwipe = (evento: PointerEvent) => {
    if (ponteiroAtivo && evento.pointerId === ponteiroAtivo.id) {
      ponteiroAtivo = null;
    }
  };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  alvoSwipe.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', finalizarSwipe);
  window.addEventListener('pointercancel', cancelarSwipe);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    alvoSwipe.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', finalizarSwipe);
    window.removeEventListener('pointercancel', cancelarSwipe);
  };
}
