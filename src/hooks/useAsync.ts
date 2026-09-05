import { useCallback, useEffect, useRef, useState } from 'react';
import { common } from '../constans/Constants';

/**
 * Load something, with the three states every screen needs.
 *
 * Every list in this app does the same four things: load on mount, hold a
 * spinner, hold an error, and reload. Written per screen that is a dozen
 * copies of the same twenty lines, and they drift — one forgets to clear the
 * error, another leaves the spinner up after a failure.
 *
 * `deps` is passed through to the effect, so a screen whose query depends on
 * an id reloads when the id changes.
 *
 * ---------------------------------------------------------------------------
 * Three ways to load, and why they are not one flag
 * ---------------------------------------------------------------------------
 * This used to expose a single `loading`, and every screen wired it to BOTH
 * the inline spinner and the pull-to-refresh control. Opening a screen then
 * showed two spinners at once: the RefreshControl spun at the top as though
 * the driver had pulled it, and the ActivityIndicator spun in the middle.
 *
 *   loading     the first load, when there is nothing on screen yet.
 *               Drives the inline spinner. False forever after.
 *   refreshing  the driver pulled the list down. Drives the RefreshControl,
 *               and nothing else — the rows stay up while it runs.
 *   quiet       a reload nobody asked for: coming back to a tab, a socket
 *               saying something changed. No spinner at all. A screen that
 *               flashes every time it regains focus reads as broken.
 */
export function useAsync<T>(
  run: () => Promise<T>,
  deps: unknown[] = [],
): {
  data: T | null;
  /** The first load only. */
  loading: boolean;
  /** A refresh the driver asked for, by pulling. */
  refreshing: boolean;
  error: string | null;
  /** Pull-to-refresh: shows the control's own spinner. */
  reload: () => void;
  /** Focus and socket updates: no spinner, no flash. */
  reloadQuietly: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(run, deps);

  /*
   * Guards a late response from overwriting a newer one. Two reloads in flight
   * — a pull while a focus refresh is still running — used to land in whatever
   * order the network felt like.
   */
  const attempt = useRef(0);

  const go = useCallback(async () => {
    attempt.current += 1;
    const mine = attempt.current;
    setError(null);
    try {
      const next = await load();
      if (mine !== attempt.current) return;
      setData(next);
    } catch (err) {
      if (mine !== attempt.current) return;
      setError(err instanceof Error ? err.message : common.somethingWrong);
    } finally {
      if (mine === attempt.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [load]);

  useEffect(() => {
    go();
  }, [go]);

  /*
   * Both memoised, so a screen can name them in an effect's dependencies
   * honestly. Rebuilt every render they would resubscribe a socket on every
   * render, and the alternative — leaving them out of the array — is the lie
   * that hides a stale closure.
   */
  const reload = useCallback(() => {
    setRefreshing(true);
    go();
  }, [go]);

  const reloadQuietly = useCallback(() => {
    go();
  }, [go]);

  return { data, loading, refreshing, error, reload, reloadQuietly };
}
