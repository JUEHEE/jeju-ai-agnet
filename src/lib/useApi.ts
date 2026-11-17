import { useEffect, useState } from "react";

/** 비동기 호출 하나. deps 가 바뀌면 다시 부르고, 늦게 온 이전 응답은 버린다. */
export function useApi<T>(fn: (() => Promise<T>) | null, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: !!fn });
  useEffect(() => {
    if (!fn) {
      setState({ loading: false });
      return;
    }
    let alive = true;
    setState((s) => ({ data: s.data, loading: true }));
    fn().then(
      (data) => alive && setState({ data, loading: false }),
      (e: Error) => alive && setState({ error: e.message, loading: false }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
