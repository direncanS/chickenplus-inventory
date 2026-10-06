'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface KeyboardState {
  open: boolean;
  top: number;
  activeId: string | null;
  bottomInset: number;
}

const INITIAL_STATE: KeyboardState = { open: false, top: 0, activeId: null, bottomInset: 0 };
export const STOCK_KEYBOARD_BAR_HEIGHT = 56;

/** Follow the visible viewport, rather than the layout viewport, on iOS. */
export function useStockKeyboard(containerRef: RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState(INITIAL_STATE);
  const refreshRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refreshRef.current?.(), []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let baselineHeight = viewport.height;
    let baselineWidth = viewport.width;
    let frame = 0;
    let alignFrame = 0;
    let activeInput: HTMLInputElement | null = null;

    function update(align: boolean) {
      cancelAnimationFrame(frame);
      if (align) cancelAnimationFrame(alignFrame);
      frame = requestAnimationFrame(() => {
        const focused = document.activeElement;
        activeInput = focused instanceof HTMLInputElement &&
          focused.hasAttribute('data-stock-input') && containerRef.current?.contains(focused)
          ? focused : null;

        // Pinch zoom and orientation changes are not keyboard opening signals.
        const unzoomed = Math.abs(viewport!.scale - 1) < 0.05;
        if (unzoomed && Math.abs(viewport!.width - baselineWidth) > 80) {
          baselineWidth = viewport!.width;
          baselineHeight = Math.max(window.innerHeight, viewport!.height);
        }
        if (!activeInput && unzoomed) {
          baselineHeight = Math.max(baselineHeight, viewport!.height);
        }
        const open = Boolean(activeInput) && window.innerWidth < 768 && unzoomed &&
          baselineHeight - viewport!.height > 120;
        const top = viewport!.offsetTop + viewport!.height - STOCK_KEYBOARD_BAR_HEIGHT;
        document.documentElement.toggleAttribute('data-stock-keyboard', open);
        const activeId = activeInput?.dataset.stockInput ?? null;
        const bottomInset = open ? baselineHeight - viewport!.height + STOCK_KEYBOARD_BAR_HEIGHT + 24 : 0;
        setState((current) => current.open === open && current.top === top && current.activeId === activeId && current.bottomInset === bottomInset
          ? current : { open, top, activeId, bottomInset });

        if (open && align && activeInput) {
          alignFrame = requestAnimationFrame(() => {
            if (!activeInput || document.activeElement !== activeInput) return;
            const row = activeInput.closest('[data-checklist-row]') ?? activeInput;
            const rowRect = row.getBoundingClientRect();
            const visibleTop = viewport!.offsetTop + 12;
            const visibleBottom = top - 12;
            const rect = rowRect.height > visibleBottom - visibleTop
              ? activeInput.getBoundingClientRect() : rowRect;
            // Leave already-visible fields alone; move only enough to uncover the row.
            const delta = rect.bottom > visibleBottom ? rect.bottom - visibleBottom
              : rect.top < visibleTop ? rect.top - visibleTop : 0;
            if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' });
          });
        }
      });
    }

    const handleFocus = () => update(true);
    const handleResize = () => update(true);
    const handleScroll = () => update(false);
    refreshRef.current = handleFocus;
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);
    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      refreshRef.current = null;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(alignFrame);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.documentElement.removeAttribute('data-stock-keyboard');
    };
  }, [containerRef]);

  return { ...state, refresh };
}
