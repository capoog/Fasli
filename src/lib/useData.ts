import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Loads data when the screen gains focus, with pull-to-refresh and error state. */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = [], opts: { refetchOnFocus?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLoading(true); run(); }, deps);
  // The first focus happens together with the mount effect above, so only refetch on later focuses.
  const focusedOnce = useRef(false);
  const refetch = opts.refetchOnFocus !== false;
  useFocusEffect(useCallback(() => {
    if (!focusedOnce.current) { focusedOnce.current = true; return; }
    if (refetch) run();
  }, [run, refetch]));

  return { data, error, loading, refreshing, reload: () => run(false), refresh: () => run(true), setData };
}

export const errMsg = (e: unknown): string => {
  const text = (v: unknown, depth = 0): string => {
    if (typeof v === 'string') return v;
    if (v == null) return '';
    if (typeof v === 'object' && depth < 3) {
      const o = v as Record<string, unknown>;
      for (const k of ['message', 'error_description', 'error', 'msg', 'details', 'hint', 'code']) {
        const s = text(o[k], depth + 1);
        if (s && s !== '[object Object]') return s;
      }
      try { return JSON.stringify(v); } catch { return 'Unknown error'; }
    }
    return String(v);
  };
  return text(e) || 'Unknown error';
};
