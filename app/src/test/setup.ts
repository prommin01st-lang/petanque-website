import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no IntersectionObserver; framer-motion's whileInView/useInView need one.
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
if (!('IntersectionObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'IntersectionObserver', { value: NoopIntersectionObserver, writable: true, configurable: true });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
