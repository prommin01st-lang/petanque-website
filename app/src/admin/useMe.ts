import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, ApiError, setCsrfToken } from '@/lib/api';
import type { Me } from '@/lib/types';

export const ME_KEY = ['me'] as const;

async function fetchMe(): Promise<Me> {
  try {
    const me = await api.auth.me();
    setCsrfToken(me.csrfToken);
    return me;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) setCsrfToken(null);
    throw err;
  }
}

export default function useMe(): UseQueryResult<Me, ApiError> {
  return useQuery<Me, ApiError>({ queryKey: ME_KEY, queryFn: fetchMe, retry: false });
}
