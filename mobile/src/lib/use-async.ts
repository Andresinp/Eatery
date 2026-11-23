import { useCallback, useEffect, useRef, useState } from 'react';

import { logError } from './log';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: T };

// Runs `load` on mount and whenever `deps` change; `reload` re-runs it (pull to refresh) keeping
// the current data on screen. A result that arrives after unmount or a newer run is dropped.
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> & { reload: () => Promise<void>; isRefreshing: boolean } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const runId = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async (isRefresh: boolean) => {
    const id = ++runId.current;
    if (isRefresh) setIsRefreshing(true);
    try {
      const data = await loadRef.current();
      if (id === runId.current) setState({ status: 'ready', data });
    } catch (error) {
      logError('useAsync', error);
      if (id === runId.current) setState((prev) => (isRefresh && prev.status === 'ready' ? prev : { status: 'error', error }));
    } finally {
      if (id === runId.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setState({ status: 'loading' });
    void run(false);
    const ids = runId;
    return () => {
      ids.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's
  }, deps);

  const reload = useCallback(() => run(true), [run]);
  return { ...state, reload, isRefreshing };
}
