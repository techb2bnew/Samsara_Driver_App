import { useCallback, useEffect, useState } from 'react';
import { common } from '../constans/Constants';

/**
 * Load something, with the three states every screen needs.
 *
 * Every list in this app does the same four things: load on mount, hold a
 * spinner, hold an error, and reload on pull-to-refresh. Written per screen
 * that is twelve copies of the same twenty lines, and they drift — one forgets
 * to clear the error, another leaves the spinner up after a failure.
 *
 * `deps` is passed through to the effect, so a screen whose query depends on an
 * id reloads when the id changes.
 */
export function useAsync<T>(
  run: () => Promise<T>,
  deps: unknown[] = [],
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(run, deps);

  const go = useCallback(async () => {
    setError(null);
    try {
      setData(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : common.somethingWrong);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    go();
  }, [go]);

  return {
    data,
    loading,
    error,
    reload: () => {
      setLoading(true);
      go();
    },
  };
}
