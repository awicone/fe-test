import { useEffect, useMemo, useRef, useState } from 'react';
import { Table, Spin } from 'antd';
import { CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { useScannerStore } from '../../../store/scannerStore';
import { fmtPrice, fmtUsd, fmtPc, fmtAge } from '../../../shared/format';

function DiffPill({ value }: { value: number }) {
  const isPositive = Number(value) >= 0;
  const color = isPositive ? '#29cc74' : '#ff5b5b';
  const bg = isPositive ? 'rgba(41, 204, 116, 0.10)' : 'rgba(255, 91, 91, 0.10)';
  const border = isPositive ? 'rgba(41, 204, 116, 0.30)' : 'rgba(255, 91, 91, 0.30)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 5px',
        borderRadius: 999,
        background: bg,
        color,
        border: `1px solid ${border}`,
        lineHeight: 1,
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.2) inset',
      }}
    >
      {isPositive ? <CaretUpOutlined style={{ fontSize: 10 }} /> : <CaretDownOutlined style={{ fontSize: 10 }} />}
      {fmtPc(value)}
    </span>
  );
}

function Sparkline({ points }: { points: Array<{ t: number; p: number }> }) {
  if (!points || points.length < 2) return <span style={{ color: '#64748b' }}>—</span>;
  const w = 90;
  const h = 28;
  const padding = 2;
  const minP = Math.min(...points.map((d) => d.p));
  const maxP = Math.max(...points.map((d) => d.p));
  const range = maxP - minP || 1;
  const stepX = (w - padding * 2) / (points.length - 1);
  const coords = points.map((d, i) => {
    const x = padding + i * stepX;
    const y = padding + (h - padding * 2) - ((d.p - minP) / range) * (h - padding * 2);
    return `${x},${y}`;
  });
  const trendUp = points[points.length - 1].p >= points[0].p;
  const color = trendUp ? '#29cc74' : '#ff5b5b';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        points={coords.join(' ')}
        shapeRendering="geometricPrecision"
      />
    </svg>
  );
}

export function ScannerTable({ kind, loading, isFetching, onEndReached }: {
  kind: 'trending' | 'fresh';
  loading?: boolean;
  isFetching?: boolean;
  onEndReached?: () => void;
}) {
  const pages = useScannerStore((s) => s.pages[kind === 'trending' ? 'trending' : 'fresh']);
  const entities = useScannerStore((s) => s.entities);
  const meta = useScannerStore((s) => s.meta);
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const keys: string[] = [];
    for (const p of pages) {
      for (const k of p.pairKeys) {
        if (!seen.has(k)) { seen.add(k); keys.push(k); }
      }
    }
    return keys.map((k) => (entities as any)[k]).filter(Boolean).map((r: any) => ({ key: r.id, ...r }));
  }, [pages, entities]);

  const [sortInfo, setSortInfo] = useState<{ columnKey?: string; order?: 'ascend' | 'descend' }>(() => (
    kind === 'trending' ? { columnKey: 'volume', order: 'descend' } : { columnKey: 'age', order: 'descend' }
  ));

  const columns: TableProps<any>['columns'] = useMemo(() => ([
    {
      title: 'Name / Symbol',
      dataIndex: 'tokenName',
      key: 'tokenName',
      width: 260,
      render: (_: any, r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {r.imageUri ? <img src={r.imageUri} style={{ width: 20, height: 20, borderRadius: 999 }} /> : <span style={{ width: 20, height: 20, borderRadius: 999, background: '#374151', display: 'inline-block' }} />}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.tokenName} <span style={{ color: '#94a3b8' }}>{r.tokenSymbol}</span>
            <span style={{ color: '#64748b', marginLeft: 6 }}>[{r.chain}]</span>
          </span>
        </div>
      ),
      fixed: 'left',
      sorter: (a: any, b: any) => String(a.tokenName).localeCompare(String(b.tokenName)),
      sortDirections: ['ascend', 'descend'],
      sortOrder: sortInfo.columnKey === 'tokenName' ? sortInfo.order : undefined,
    },
    { title: 'Pair', dataIndex: 'pairAddress', key: 'pair', width: 140, render: (v: string) => <span>{v.slice(0,6)}…{v.slice(-4)}</span>, sorter: (a: any, b: any) => String(a.pairAddress).localeCompare(String(b.pairAddress)), sortDirections: ['ascend', 'descend'], sortOrder: sortInfo.columnKey === 'pair' ? sortInfo.order : undefined },
    { title: 'Exchange', dataIndex: 'exchange', key: 'exchange', width: 120, ellipsis: true, sorter: (a: any, b: any) => String(a.exchange).localeCompare(String(b.exchange)), sortDirections: ['ascend', 'descend'], sortOrder: sortInfo.columnKey === 'exchange' ? sortInfo.order : undefined },
    {
      title: 'Trend',
      dataIndex: 'id',
      key: 'trend',
      width: 110,
      render: (_: any, r: any) => <Sparkline points={(meta[r.id]?.history || []) as any} />,
      sorter: (a: any, b: any) => {
        const ha = meta[a.id]?.history || [];
        const hb = meta[b.id]?.history || [];
        const da = ha.length > 1 ? (ha[ha.length - 1].p - ha[0].p) : 0;
        const db = hb.length > 1 ? (hb[hb.length - 1].p - hb[0].p) : 0;
        return da - db;
      },
      sortDirections: ['descend', 'ascend'],
      sortOrder: sortInfo.columnKey === 'trend' ? sortInfo.order : undefined,
    },
    {
      title: 'Price', dataIndex: 'priceUsd', key: 'price', width: 120,
      render: (_: number, r: any) => {
        const eff = meta[r.id]?.cellEffects?.price;
        const within = eff && Date.now() - eff.at < 1200;
        const highlight = within ? (eff!.dir === 'up' ? 'rgba(41,204,116,0.18)' : 'rgba(255,91,91,0.18)') : 'transparent';
        const border = within ? (eff!.dir === 'up' ? 'rgba(41,204,116,0.35)' : 'rgba(255,91,91,0.35)') : 'transparent';
        return (
          <span style={{
            display: 'inline-block',
            padding: '1px 6px',
            borderRadius: 6,
            background: highlight,
            border: `1px solid ${border}`,
            transition: 'background-color 600ms ease, border-color 600ms ease',
          }}>{fmtPrice(r.priceUsd)}</span>
        );
      }
    },
    {
      title: 'MCap',
      dataIndex: 'mcap',
      key: 'mcap',
      width: 120,
      render: (_: number, r: any) => {
        const eff = meta[r.id]?.cellEffects?.mcap;
        const within = eff && Date.now() - eff.at < 1200;
        const highlight = within ? (eff!.dir === 'up' ? 'rgba(41,204,116,0.18)' : 'rgba(255,91,91,0.18)') : 'transparent';
        const border = within ? (eff!.dir === 'up' ? 'rgba(41,204,116,0.35)' : 'rgba(255,91,91,0.35)') : 'transparent';
        return (
          <span style={{
            display: 'inline-block',
            padding: '1px 6px',
            borderRadius: 6,
            background: highlight,
            border: `1px solid ${border}`,
            transition: 'background-color 600ms ease, border-color 600ms ease',
          }}>{fmtUsd(r.mcap)}</span>
        );
      },
      sorter: (a: any, b: any) => a.mcap - b.mcap,
      sortDirections: ['descend', 'ascend'],
      sortOrder: sortInfo.columnKey === 'mcap' ? sortInfo.order : undefined,
    },
    {
      title: 'Volume',
      dataIndex: 'volumeUsd',
      key: 'volume',
      width: 120,
      render: (v: number) => fmtUsd(v),
      sorter: (a: any, b: any) => a.volumeUsd - b.volumeUsd,
      sortDirections: ['descend', 'ascend'],
      defaultSortOrder: kind === 'trending' ? 'descend' : undefined,
      sortOrder: sortInfo.columnKey === 'volume' ? sortInfo.order : undefined,
    },
    {
      title: '5m/1h/6h/24h', dataIndex: 'priceChangePcs', key: 'diffs', width: 350,
      render: (pcs: any) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <DiffPill value={pcs['5m']} />
          <DiffPill value={pcs['1h']} />
          <DiffPill value={pcs['6h']} />
          <DiffPill value={pcs['24h']} />
        </div>
      )
    },
    {
      title: 'Age',
      dataIndex: 'tokenCreatedTimestamp',
      key: 'age',
      width: 110,
      render: (v: Date) => fmtAge(v),
      sorter: (a: any, b: any) => new Date(a.tokenCreatedTimestamp).getTime() - new Date(b.tokenCreatedTimestamp).getTime(),
      sortDirections: ['descend', 'ascend'],
      defaultSortOrder: kind === 'fresh' ? 'descend' : undefined,
      sortOrder: sortInfo.columnKey === 'age' ? sortInfo.order : undefined,
    },
    { title: 'Buys/Sells', dataIndex: 'transactions', key: 'txs', width: 110, render: (t: any) => `${t.buys}/${t.sells}`, sorter: (a: any, b: any) => (a.transactions.buys + a.transactions.sells) - (b.transactions.buys + b.transactions.sells), sortDirections: ['descend', 'ascend'], sortOrder: sortInfo.columnKey === 'txs' ? sortInfo.order : undefined },
    {
      title: 'Liquidity',
      dataIndex: 'liquidity',
      key: 'liquidity',
      width: 120,
      render: (l: any) => fmtUsd(l.current),
      sorter: (a: any, b: any) => a.liquidity.current - b.liquidity.current,
      sortDirections: ['descend', 'ascend'],
      sortOrder: sortInfo.columnKey === 'liquidity' ? sortInfo.order : undefined,
    },
    {
      title: 'HP',
      dataIndex: 'audit',
      key: 'hp',
      width: 80,
      render: (a: any) => (a?.honeypot ? 'HP' : '-'),
      sorter: (a: any, b: any) => Number(a?.audit?.honeypot) - Number(b?.audit?.honeypot),
      sortDirections: ['ascend', 'descend'],
      sortOrder: sortInfo.columnKey === 'hp' ? sortInfo.order : undefined,
    }
  ]), [kind, meta, sortInfo]);

  const isInitialLoading = (loading && rows.length === 0);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const body = root.querySelector('.ant-table-body') as HTMLDivElement | null;
    if (!body) return;
    const onScroll = () => {
      if (isFetching) return;
      const nearBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 40;
      if (nearBottom) onEndReached?.();
    };
    body.addEventListener('scroll', onScroll, { passive: true });
    return () => body.removeEventListener('scroll', onScroll);
  }, [isFetching, onEndReached, rows.length]);

  return (
    <Spin spinning={isInitialLoading} tip="Loading tokens...">
      <div ref={containerRef}>
      <Table
        size="small"
        scroll={{ x: 1280, y: 'calc(70vh - 40px)' as any }}
        sticky
        rowClassName={(_, idx) => (idx % 2 === 0 ? 'bg-[#0f1115]' : 'bg-[#13171d]')}
        columns={columns}
        dataSource={rows}
        pagination={false}
        bordered={false}
        style={{ background: 'transparent' }}
        onChange={(_, __, sorter) => {
          const s = Array.isArray(sorter) ? sorter[0] : (sorter as any);
          setSortInfo({ columnKey: s?.columnKey, order: s?.order });
        }}
      />
      </div>
    </Spin>
  );
}
