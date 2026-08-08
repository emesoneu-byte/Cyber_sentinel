import { useState, useEffect, useCallback } from 'react';
import { userApi, simApi, moduleApi, quizApi } from '../api/client';

function useAsync<T>(fn: ()=>Promise<T>, deps: unknown[]=[]) {
  const [data, setData] = useState<T|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const run = useCallback(async () => { setLoading(true); setError(null); try { setData(await fn()); } catch(e) { setError((e as Error).message); } finally { setLoading(false); } }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [run]);
  return { data, loading, error, refetch: run };
}

export const useDashboard    = () => useAsync(() => userApi.dashboard(), []);
export const useSimResults   = () => useAsync(() => simApi.myResults(), []);
export const useModuleProgress = () => useAsync(() => moduleApi.progress(), []);
export const useQuizHistory  = () => useAsync(() => quizApi.history(), []);
export const useLeaderboard  = (limit=20) => useAsync(() => userApi.leaderboard(limit), [limit]);
