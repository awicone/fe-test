import { create } from 'zustand';
import type { SupportedChainName, ScannerResult, PairStatsMsgData, WsTokenSwap } from "../../test-task-types.ts";
import { resolveInitialMcap, parseNumber } from '../api/scanner';

export type PairKey = `${SupportedChainName}:${string}`;

export interface TokenData {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  tokenAddress: string;
  pairAddress: string;
  chain: SupportedChainName;
  exchange: string;
  priceUsd: number;
  volumeUsd: number;
  mcap: number;
  priceChangePcs: { '5m': number; '1h': number; '6h': number; '24h': number };
  transactions: { buys: number; sells: number };
  tokenCreatedTimestamp: Date;
  liquidity: { current: number; changePc: number };
  audit: { mintable: boolean; freezable: boolean; honeypot: boolean; contractVerified: boolean };
  imageUri?: string | null;
  lastPriceUpdateAt?: number;
  // optional
  migrationPc?: number;
  linkDiscord?: string | null;
  linkTelegram?: string | null;
  linkTwitter?: string | null;
  linkWebsite?: string | null;
  dexPaid?: boolean;
  liquidityLockedRatio?: number;
}

export interface ScannerPagesState { page: number; pairKeys: PairKey[] };

export interface ScannerState {
  entities: Record<PairKey, TokenData>;
  pages: { trending: ScannerPagesState[]; fresh: ScannerPagesState[] };
  meta: Record<PairKey, { totalSupply?: number; lastScannerSeenAt: number; cellEffects?: { price?: { dir: 'up' | 'down'; at: number }; mcap?: { dir: 'up' | 'down'; at: number } }; history?: { t: number; p: number }[] }>;
  upsertFromScanner: (items: ScannerResult[], table: 'trending' | 'fresh', page: number) => void;
  applyTickBatch: (updates: Array<{ key: PairKey; newPrice: number; swap?: WsTokenSwap }>) => void;
  applyPairStatsBatch: (updates: Array<{ key: PairKey; data: PairStatsMsgData }>) => void;
  resetTable: (table: 'trending' | 'fresh') => void;
}

function keyOf(chain: SupportedChainName, pairAddress: string): PairKey { return `${chain}:${pairAddress}`; }

export const useScannerStore = create<ScannerState>((set) => ({
  entities: {},
  pages: { trending: [], fresh: [] },
  meta: {},
  resetTable: (table) => set((state) => ({ ...state, pages: { ...state.pages, [table]: [] } })),
  upsertFromScanner: (items, table, page) => set((state) => {
    const now = Date.now();

    const nextEntities: Record<PairKey, TokenData> = { ...state.entities };
    const nextMeta: ScannerState['meta'] = { ...state.meta };

    const pageKeys: PairKey[] = [];
    for (const r of items) {
      const chain = (r.chainId.toString() === '900' ? 'SOL' : r.chainId.toString() === '8453' ? 'BASE' : r.chainId.toString() === '56' ? 'BSC' : 'ETH') as SupportedChainName;
      const k = keyOf(chain, r.pairAddress);
      pageKeys.push(k);
      const existing = nextEntities[k];
      const computedMcap = resolveInitialMcap(r);
      const next: TokenData = {
        id: k,
        tokenName: r.token1Name,
        tokenSymbol: r.token1Symbol,
        tokenAddress: r.token1Address,
        pairAddress: r.pairAddress,
        chain,
        exchange: r.migratedFromVirtualRouter || r.virtualRouterType || r.routerAddress,
        priceUsd: existing?.priceUsd ?? parseNumber(r.price),
        volumeUsd: parseNumber(r.volume),
        mcap: existing?.priceUsd ? (existing.mcap ?? computedMcap) : computedMcap,
        priceChangePcs: { '5m': parseNumber(r.diff5M), '1h': parseNumber(r.diff1H), '6h': parseNumber(r.diff6H), '24h': parseNumber(r.diff24H) },
        transactions: { buys: r.buys ?? 0, sells: r.sells ?? 0 },
        tokenCreatedTimestamp: new Date(r.age),
        liquidity: { current: parseNumber(r.liquidity), changePc: parseNumber(r.percentChangeInLiquidity) },
        audit: { mintable: r.isMintAuthDisabled, freezable: r.isFreezeAuthDisabled, honeypot: Boolean(r.honeyPot) === true, contractVerified: r.contractVerified },
        imageUri: r.token1ImageUri ?? existing?.imageUri,
        lastPriceUpdateAt: existing?.lastPriceUpdateAt,
      };
      nextEntities[k] = { ...existing, ...next };
      nextMeta[k] = { ...(nextMeta[k] || {}), totalSupply: parseNumber(r.token1TotalSupplyFormatted), lastScannerSeenAt: now };
    }

    const nextPages = { ...state.pages };
    const arr = [...state.pages[table]];
    const idx = arr.findIndex((p) => p.page === page);
    if (idx >= 0) arr[idx] = { page, pairKeys: pageKeys };
    else arr.push({ page, pairKeys: pageKeys });
    nextPages[table] = arr;

    return { ...state, entities: nextEntities, meta: nextMeta, pages: nextPages };
  }),
  applyTickBatch: (updates) => set((state) => {
    if (!updates.length) return state;
    const nextEntities: Record<PairKey, TokenData> = { ...state.entities };
    const nextMeta: ScannerState['meta'] = { ...state.meta };
    const now = Date.now();
    for (const { key, newPrice, swap } of updates) {
      const ex = nextEntities[key];
      if (!ex) continue;
      const totalSupply = state.meta[key]?.totalSupply;
      const mcap = Number.isFinite(totalSupply) ? (totalSupply! * newPrice) : ex.mcap;
      const dir: 'up' | 'down' = newPrice >= ex.priceUsd ? 'up' : 'down';
      // if it's available to compute volume/tx deltas from latest swap
      let volumeUsd = ex.volumeUsd;
      let transactions = ex.transactions;
      if (swap) {
        const amountToken1 = Number(swap.amountToken1 || 0);
        const priceToken1Usd = Number(swap.priceToken1Usd || 0);
        const deltaVol = Math.abs(amountToken1) * (Number.isFinite(priceToken1Usd) ? priceToken1Usd : 0);
        const isBuy = swap.tokenInAddress !== ex.tokenAddress;
        volumeUsd = Number.isFinite(deltaVol) ? (ex.volumeUsd + deltaVol) : ex.volumeUsd;
        transactions = {
          buys: ex.transactions.buys + (isBuy ? 1 : 0),
          sells: ex.transactions.sells + (isBuy ? 0 : 1),
        };
      }
      nextEntities[key] = { ...ex, priceUsd: newPrice, mcap, lastPriceUpdateAt: now, volumeUsd, transactions };
      const prevMeta = state.meta[key] || { lastScannerSeenAt: now };
      // Append to compact history buffer for sparkline
      const prevHistory = prevMeta.history || [];
      const nextHistory = [...prevHistory, { t: now, p: newPrice }];
      const MAX_POINTS = 60; // ~ last 60 samples (about 30s with 500ms batching)
      if (nextHistory.length > MAX_POINTS) nextHistory.splice(0, nextHistory.length - MAX_POINTS);
      nextMeta[key] = {
        ...prevMeta,
        history: nextHistory,
        cellEffects: {
          ...(prevMeta.cellEffects || {}),
          price: { dir, at: now },
          mcap: { dir, at: now },
        }
      };
    }
    return { ...state, entities: nextEntities, meta: nextMeta };
  }),
  applyPairStatsBatch: (updates) => set((state) => {
    if (!updates.length) return state;
    const nextEntities: Record<PairKey, TokenData> = { ...state.entities };
    for (const { key, data } of updates) {
      const ex = nextEntities[key];
      if (!ex) continue;
      const p = data.pair;
      const updated: Partial<TokenData> = {
        migrationPc: Number(data.migrationProgress ?? 0),
        audit: {
          mintable: p.mintAuthorityRenounced,
          freezable: p.freezeAuthorityRenounced,
          honeypot: Boolean(!p.token1IsHoneypot),
          contractVerified: p.isVerified,
        },
        linkDiscord: p.linkDiscord ?? ex.linkDiscord ?? null,
        linkTelegram: p.linkTelegram ?? ex.linkTelegram ?? null,
        linkTwitter: p.linkTwitter ?? ex.linkTwitter ?? null,
        linkWebsite: p.linkWebsite ?? ex.linkWebsite ?? null,
        dexPaid: p.dexPaid ?? ex.dexPaid,
        liquidityLockedRatio: Number((p as any).totalLockedRatio ?? 0),
      } as Partial<TokenData>;
      nextEntities[key] = { ...ex, ...updated } as TokenData;
    }
    return { ...state, entities: nextEntities };
  }),
}));
