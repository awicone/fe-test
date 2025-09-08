import { useQuery } from '@tanstack/react-query';
import type { GetScannerResultParams } from '../../../../../test-task-types';
import { getScanner } from '../../../api/scanner';
import { useScannerStore } from '../../../store/scannerStore';

export function useScannerQuery(kind: 'trending' | 'fresh', page: number, params: GetScannerResultParams) {
  const upsert = useScannerStore((s) => s.upsertFromScanner);
  const key = [
    'scanner',
    kind,
    page,
    params.chain ?? 'ALL',
    params.rankBy,
    params.orderBy,
    params.isNotHP ?? null,
    params.minVol24H ?? null,
    (params as any).minMcap ?? null,
    params.maxAge ?? null,
  ] as const;

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await getScanner({ ...params, page });
      upsert(res.pairs, kind === 'trending' ? 'trending' : 'fresh', page);
      return res;
    },
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
  });
}
