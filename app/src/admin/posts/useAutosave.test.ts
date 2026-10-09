import { act, renderHook } from '@testing-library/react';
import { clearDrafts, useAutosave } from './useAutosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('saves while dirty and offers restore on the next mount', () => {
  const { rerender, unmount } = renderHook(({ v, d }) => useAutosave('draft:post:new', v, d), { initialProps: { v: { body: 'a' }, d: false } });
  act(() => vi.advanceTimersByTime(6000));
  expect(localStorage.getItem('draft:post:new')).toBeNull();
  rerender({ v: { body: 'abc' }, d: true });
  act(() => vi.advanceTimersByTime(5000));
  expect(JSON.parse(localStorage.getItem('draft:post:new')!).value).toEqual({ body: 'abc' });
  unmount();
  const next = renderHook(() => useAutosave('draft:post:new', { body: '' }, false));
  expect(next.result.current.restore).toEqual({ body: 'abc' });
  act(() => next.result.current.discard());
  expect(next.result.current.restore).toBeNull();
  expect(localStorage.getItem('draft:post:new')).toBeNull();
});

it('survives corrupted storage', () => {
  localStorage.setItem('draft:post:1', '{not json');
  const { result } = renderHook(() => useAutosave('draft:post:1', {}, false));
  expect(result.current.restore).toBeNull();
});

it('clear() hides restore and suppresses a racing tick until the value changes', () => {
  localStorage.setItem('draft:post:2', JSON.stringify({ savedAt: 1, value: { body: 'old' } }));
  const { result, rerender } = renderHook(({ v, d }) => useAutosave('draft:post:2', v, d), { initialProps: { v: { body: 'x' }, d: true } });
  expect(result.current.restore).toEqual({ body: 'old' });
  act(() => result.current.clear());
  expect(result.current.restore).toBeNull();
  act(() => vi.advanceTimersByTime(5000));
  expect(localStorage.getItem('draft:post:2')).toBeNull();
  rerender({ v: { body: 'xy' }, d: true });
  act(() => vi.advanceTimersByTime(5000));
  expect(JSON.parse(localStorage.getItem('draft:post:2')!).value).toEqual({ body: 'xy' });
});

it('resumes autosave after clear() when edits typed during the save stay unsaved', () => {
  const { result, rerender } = renderHook(({ v, d }) => useAutosave('draft:post:5', v, d), { initialProps: { v: { body: 'a' }, d: true } });
  // The user keeps typing while the save request is in flight…
  rerender({ v: { body: 'a typed during save' }, d: true });
  // …then the save resolves and clears the snapshot; the form is still dirty.
  act(() => result.current.clear());
  act(() => vi.advanceTimersByTime(5000)); // the racing tick is skipped
  expect(localStorage.getItem('draft:post:5')).toBeNull();
  act(() => vi.advanceTimersByTime(5000)); // no further keystroke needed
  expect(JSON.parse(localStorage.getItem('draft:post:5')!).value).toEqual({ body: 'a typed during save' });
});

it('clearDrafts removes only post drafts', () => {
  localStorage.setItem('draft:post:new', '{}');
  localStorage.setItem('draft:post:3', '{}');
  localStorage.setItem('theme', 'dark');
  clearDrafts();
  expect(localStorage.length).toBe(1);
  expect(localStorage.getItem('theme')).toBe('dark');
});
