import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { ScannerTable } from './ScannerTable';
import { FilterBar, type FiltersState } from './FilterBar';
import { useScannerQuery } from '../hooks/useScannerQuery';
import { useScannerStore } from '../../../store/scannerStore';
import { wsAddHandler, wsRemoveHandler, wsSend } from '../../../ws/client';
import type { GetScannerResultParams } from '../../../../../test-task-types';

const DEFAULTS = {
  trending: { rankBy: 'volume', orderBy: 'desc' as const },
  fresh: { rankBy: 'age', orderBy: 'desc' as const },
};

export function ScannerPane({ kind }: { kind: 'trending' | 'fresh' }) {
  const [filters, setFilters] = useState<FiltersState>({ chain: 'ETH', isNotHP: true });

  const params = useMemo(() => ({
    chain: filters.chain,
    isNotHP: filters.isNotHP,
    minVol24H: filters.minVol24H,
    minMcap: filters.minMcap,
    maxAge: filters.maxAgeHours ? filters.maxAgeHours * 3600 : undefined,
    ...DEFAULTS[kind],
  }), [filters, kind]);

  const [page, setPage] = useState(1);
  const { isPending, isError, error, isFetching } = useScannerQuery(kind, page, params as any);
  const pages = useScannerStore((s) => s.pages[kind]);
  const entities = useScannerStore((s) => s.entities);
  const resetTable = useScannerStore((s) => s.resetTable);
  const applyTickBatch = useScannerStore((s) => s.applyTickBatch);
  const applyPairStatsBatch = useScannerStore((s) => (s as any).applyPairStatsBatch);
  const upsertFromScanner = useScannerStore((s) => (s as any).upsertFromScanner);

  const subsRef = useRef<Set<string>>(new Set());
  const pending: Array<{ key: any; newPrice: number; swap?: any }> = [];
  const pendingStats: Array<{ key: any; data: any }> = [];

  useEffect(() => {
    const handler = (msg: any) => {
      if (msg?.event === 'tick') {
        const swaps = msg.data?.swaps || [];
        const last = swaps.filter((s: any) => !s.isOutlier).pop();
        if (!last) return;
        const price = Number(last.priceToken1Usd);
        const chainName = msg.data?.pair?.chain;
        const pair = msg.data?.pair?.pair;
        const key = `${chainName}:${pair}` as any;
        pending.push({ key, newPrice: price, swap: last });
      } else if (msg?.event === 'pair-stats') {
        const data = msg.data;
        const key = `${data?.pair?.chain}:${data?.pair?.pairAddress}` as any;
        pendingStats.push({ key, data });
      } else if (msg?.event === 'scanner-pairs') {
        const filter = msg.data?.filter as GetScannerResultParams | undefined;
        const items = msg.data?.results?.pairs as any[] | undefined;
        if (!items || !filter) return;
        const rankBy = (filter.rankBy || '').toString();
        const table: 'trending' | 'fresh' | null = rankBy === 'volume' ? 'trending' : (rankBy === 'age' ? 'fresh' : null);
        if (!table) return;
        if ((table === 'trending' && kind !== 'trending') || (table === 'fresh' && kind !== 'fresh')) {
          // Only handle updates for the currently mounted pane
          return;
        }
        // Replace dataset for the table; preserve price/mcap via store logic
        resetTable(table);
        upsertFromScanner(items as any, table, 1);
      }
    };
    wsAddHandler(handler);
    return () => wsRemoveHandler(handler);
  }, [kind, resetTable, upsertFromScanner]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (pending.length) {
        const copy = pending.splice(0, pending.length);
        startTransition(() => {
          applyTickBatch(copy as any);
        });
      }
      if (pendingStats.length) {
        const copy = pendingStats.splice(0, pendingStats.length);
        startTransition(() => {
          (applyPairStatsBatch as any)(copy);
        });
      }
    }, 500);
    return () => clearInterval(id);
  }, [applyTickBatch, applyPairStatsBatch]);

  useEffect(() => {
    // reset pages when filters or kind change
    resetTable(kind);
    setPage(1);
    // subscribe to scanner-filter for current filters
    const data: GetScannerResultParams = { ...(params as any), page: 1 };
    wsSend({ event: 'scanner-filter', data });
    return () => {
      wsSend({ event: 'unsubscribe-scanner-filter', data });
    };
  }, [kind, filters.chain, filters.isNotHP, filters.maxAgeHours, filters.minMcap, filters.minVol24H]);

  useEffect(() => {
    const current = subsRef.current;
    const next = new Set<string>();
    const keys = pages.flatMap((p) => p.pairKeys);
    for (const k of keys) next.add(k);

    for (const k of next) {
      if (!current.has(k)) {
        const e = entities[k as any];
        if (!e) continue;
        wsSend({ event: 'subscribe-pair', data: { pair: e.pairAddress, token: e.tokenAddress, chain: e.chain } });
        wsSend({ event: 'subscribe-pair-stats', data: { pair: e.pairAddress, token: e.tokenAddress, chain: e.chain } });
      }
    }
    for (const k of Array.from(current)) {
      if (!next.has(k)) {
        const e = entities[k as any];
        if (!e) continue;
        wsSend({ event: 'unsubscribe-pair', data: { pair: e.pairAddress, token: e.tokenAddress, chain: e.chain } });
        wsSend({ event: 'unsubscribe-pair-stats', data: { pair: e.pairAddress, token: e.tokenAddress, chain: e.chain } });
        current.delete(k);
      }
    }
    subsRef.current = next;
  }, [pages, entities]);

  const handleResetFilters = () => {
    setFilters({ chain: 'ETH', isNotHP: true });
  };

  return (
    <div className="rounded-md border border-slate-800 p-3" style={{ background: '#121418' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium" style={{ color: '#e2e8f0' }}>
          {kind === 'trending' ? 'Trending Tokens' : 'New Tokens'}
        </div>
      </div>

      <FilterBar 
        value={filters} 
        onChange={(v) => startTransition(() => setFilters(v))} 
        onReset={() => startTransition(() => handleResetFilters())}
      />

      {isError && <div className="text-sm text-red-400 mb-3">Error: {(error as any)?.message}</div>}
      <div className="h-[70vh]" onScroll={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
        if (nearBottom && !isFetching) {
          setPage((p) => p + 1);
        }
      }}>
        <ScannerTable 
          kind={kind} 
          loading={isPending && pages.length === 0}
          isFetching={isFetching}
          onEndReached={() => setPage((p) => p + 1)}
        />
        {isFetching && pages.length > 0 && (
          <div className="text-center text-xs py-2" style={{ color: '#9aa4b2' }}>Loading more…</div>
        )}
      </div>
    </div>
  );
}
