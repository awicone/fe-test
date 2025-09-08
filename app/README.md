# Scanner Tables App (made with react + TS + vite)

## Overview

Two side-by-side tables: Trending (sorted by volume) and New Tokens (sorted by age). Data comes from GET /scanner and real-time updates via WebSocket: tick, scanner-pairs, and pair-stats.

## API/WS

- REST: proxied to `https://api-rs.dexcelerate.com` via Vite. See `src/api/scanner.ts`.
- WS: `wss://api-rs.dexcelerate.com/ws`. See `src/ws/client.ts`.

## Data flow

1) Initial load uses react-query to fetch `/scanner` with filters. Response is normalized into Zustand store (`entities`, `pages`, `meta`). Market cap is resolved using priority: `currentMcap` → `initialMcap` → `pairMcapUsd` → `pairMcapUsdInitial`.

2) WebSocket subscriptions:
   - `scanner-filter`: subscribed on filter changes. Incoming `scanner-pairs` replaces the current table dataset while preserving existing `priceUsd/mcap`.
   - `subscribe-pair`: per visible pair for `tick` events.
   - `subscribe-pair-stats`: per visible pair for audit/migration updates.

3) Real-time updates handling:
   - `tick`: uses latest non-outlier swap to compute new price; recalculates mcap via cached totalSupply; updates rolling 24h `volumeUsd` and `transactions` counters.
   - `pair-stats`: updates audit flags (mintable/freezable/honeypot/contractVerified), migration progress, social links, and dexPaid/lock ratio.
   - `scanner-pairs`: updates current table page using store upsert.

## UI/UX

- AntD Table, sticky header, infinite scroll, highlighting for price/mcap changes, client sorters for all essential columns. Chain label shown next to symbol.

## Virtualization

- AntD Table can handle a few thousand rows reasonably in modern browsers. For >1000 rows with frequent updates, consider using virtualization (e.g., `react-virtualized`, `rc-virtual-list`, or AntD Table `virtual` mode) to further reduce DOM nodes.

## Files

- `src/features/scanner/components/ScannerPane.tsx`: tables, filters, WS subscriptions, batching.
- `src/features/scanner/components/ScannerTable.tsx`: columns, sorting, rendering.
- `src/store/scannerStore.ts`: normalized state, tick/pair-stats reducers.
- `src/api/scanner.ts`: REST client, market cap resolution.

## Run

To start this app just run yarn dev in app folder
