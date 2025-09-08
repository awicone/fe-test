import { api } from './client';
import type { ScannerApiResponse, GetScannerResultParams, ScannerResult} from "../../test-task-types.ts";

export async function getScanner(params: GetScannerResultParams): Promise<ScannerApiResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => searchParams.append(k, String(x)));
    else searchParams.set(k, String(v));
  });
  return api.get('scanner', { searchParams }).json<ScannerApiResponse>();
}

export function parseNumber(x?: string | null): number {
  const n = Number(x ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function resolveInitialMcap(src: Pick<ScannerResult, 'currentMcap' | 'initialMcap' | 'pairMcapUsd' | 'pairMcapUsdInitial'>): number {
  const pick = (...xs: (string | undefined)[]) => xs.map((s) => Number(s ?? 0)).find((n) => Number.isFinite(n) && n > 0) ?? 0;
  return pick(src.currentMcap, src.initialMcap, src.pairMcapUsd, src.pairMcapUsdInitial);
}

