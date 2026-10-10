// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStockKeyboard } from '@/lib/hooks/use-stock-keyboard';

type KeyboardState = { open: boolean; top: number; activeId: string | null };

function Harness({ onState }: { onState: (state: KeyboardState) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const state = useStockKeyboard(ref);
  onState(state);
  return <div ref={ref}><input data-stock-input="item-1" /></div>;
}

import React from 'react';

function viewport() {
  const target = new EventTarget() as EventTarget & { height: number; width: number; offsetTop: number; scale: number };
  target.height = 800; target.width = 390; target.offsetTop = 0; target.scale = 1;
  return target;
}

describe('useStockKeyboard', () => {
  let vv: ReturnType<typeof viewport>;
  let state: KeyboardState;
  let scrollByMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vv = viewport();
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    scrollByMock = vi.fn();
    vi.stubGlobal('scrollBy', scrollByMock);
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('opens only for a focused stock input after a meaningful viewport shrink', () => {
    render(<Harness onState={(next) => { state = next; }} />);
    const input = document.querySelector('[data-stock-input]') as HTMLInputElement;
    act(() => { input.focus(); vv.height = 600; vv.dispatchEvent(new Event('resize')); });
    expect(state.open).toBe(true);
    expect(document.documentElement.hasAttribute('data-stock-keyboard')).toBe(true);
  });

  it('does not scroll an already visible row and only scrolls an obscured row', () => {
    render(<Harness onState={(next) => { state = next; }} />);
    const input = document.querySelector('[data-stock-input]') as HTMLInputElement;
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ top: 200, bottom: 240, height: 40 } as DOMRect);
    vi.spyOn(input.parentElement!, 'getBoundingClientRect').mockReturnValue({ top: 200, bottom: 240, height: 40 } as DOMRect);
    act(() => { input.focus(); vv.height = 600; vv.dispatchEvent(new Event('resize')); });
    expect(scrollByMock).not.toHaveBeenCalled();
  });

  it('scrolls an obscured row by the minimum delta and closes when the viewport restores', () => {
    render(<Harness onState={(next) => { state = next; }} />);
    const input = document.querySelector('[data-stock-input]') as HTMLInputElement;
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ top: 700, bottom: 740, height: 40 } as DOMRect);
    vi.spyOn(input.parentElement!, 'getBoundingClientRect').mockReturnValue({ top: 700, bottom: 740, height: 40 } as DOMRect);
    act(() => { input.focus(); vv.height = 600; vv.dispatchEvent(new Event('resize')); });
    expect(scrollByMock).toHaveBeenCalledWith({ top: 208, behavior: 'instant' });
    act(() => { vv.height = 800; vv.dispatchEvent(new Event('resize')); });
    expect(state.open).toBe(false);
    expect(document.documentElement.hasAttribute('data-stock-keyboard')).toBe(false);
  });

  it('ignores pinch zoom and does not open without focus', () => {
    render(<Harness onState={(next) => { state = next; }} />);
    act(() => { vv.scale = 1.3; vv.height = 600; vv.dispatchEvent(new Event('resize')); });
    expect(state.open).toBe(false);
    act(() => { vv.scale = 1; vv.height = 800; vv.dispatchEvent(new Event('resize')); });
    expect(state.open).toBe(false);
  });

  it('ignores pinch zoom even while a stock field is focused', () => {
    render(<Harness onState={(next) => { state = next; }} />);
    const input = document.querySelector('[data-stock-input]') as HTMLInputElement;
    act(() => { input.focus(); vv.scale = 1.3; vv.height = 600; vv.dispatchEvent(new Event('resize')); });
    expect(state.open).toBe(false);
    expect(document.documentElement.hasAttribute('data-stock-keyboard')).toBe(false);
  });

  it('clears the root marker on cleanup', () => {
    const { unmount } = render(<Harness onState={(next) => { state = next; }} />);
    const input = document.querySelector('[data-stock-input]') as HTMLInputElement;
    act(() => { input.focus(); vv.height = 600; vv.dispatchEvent(new Event('resize')); });
    expect(state.open).toBe(true);
    unmount();
    expect(document.documentElement.hasAttribute('data-stock-keyboard')).toBe(false);
  });
});

