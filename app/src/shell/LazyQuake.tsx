import { createElement, lazy } from 'react';

// One lazy wrapper per attempt: a failed lazy is cached forever, so retry needs a fresh one.
const quakeByAttempt = new Map<number, ReturnType<typeof lazy<typeof import('./QuakeShell').default>>>();
function quakeFor(attempt: number) {
  let q = quakeByAttempt.get(attempt);
  if (!q) {
    q = lazy(() => import('./QuakeShell'));
    quakeByAttempt.set(attempt, q);
  }
  return q;
}


/** The lazy QuakeShell for the given attempt; a higher attempt re-imports the chunk. */
export default function LazyQuake(props: { attempt: number; open: boolean; onClose: () => void }) {
  const { attempt, open, onClose } = props;
  return createElement(quakeFor(attempt), { open, onClose });
}
