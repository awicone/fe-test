import { useId } from 'react';
import { Select, InputNumber, Checkbox, Button } from 'antd';

export interface FiltersState {
  chain?: 'ETH' | 'SOL' | 'BASE' | 'BSC';
  minVol24H?: number;
  minMcap?: number;
  maxAgeHours?: number; // hours
  isNotHP?: boolean;
}

export function FilterBar({ value, onChange, onReset }: { 
  value: FiltersState; 
  onChange: (v: FiltersState) => void;
  onReset: () => void;
}) {
  const ids = { vol: useId(), mcap: useId(), age: useId(), hp: useId(), chain: useId() };
  
  return (
    <div className="flex flex-wrap gap-4 items-end mb-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700">
      <div className="flex flex-col">
        <label htmlFor={ids.chain} className="text-xs text-slate-400 mb-1">Chain</label>
        <Select
          id={ids.chain}
          value={value.chain}
          onChange={(chain) => onChange({ ...value, chain })}
          placeholder="All chains"
          className="w-24"
          size="small"
          options={[
            { label: 'ETH', value: 'ETH' },
            { label: 'SOL', value: 'SOL' },
            { label: 'BASE', value: 'BASE' },
            { label: 'BSC', value: 'BSC' },
          ]}
        />
      </div>
      
      <div className="flex flex-col">
        <label htmlFor={ids.vol} className="text-xs text-slate-400 mb-1">Min Volume (24h, USD)</label>
        <InputNumber
          id={ids.vol}
          placeholder="10000"
          value={value.minVol24H}
          onChange={(val) => onChange({ ...value, minVol24H: val || undefined })}
          className="w-32"
          size="small"
          formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
          parser={(value) => value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0}
        />
      </div>
      
      <div className="flex flex-col">
        <label htmlFor={ids.mcap} className="text-xs text-slate-400 mb-1">Min MCap (USD)</label>
        <InputNumber
          id={ids.mcap}
          placeholder="500000"
          value={value.minMcap}
          onChange={(val) => onChange({ ...value, minMcap: val || undefined })}
          className="w-32"
          size="small"
          formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
          parser={(value) => value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0}
        />
      </div>
      
      <div className="flex flex-col">
        <label htmlFor={ids.age} className="text-xs text-slate-400 mb-1">Max Age (hours)</label>
        <InputNumber
          id={ids.age}
          placeholder="168"
          value={value.maxAgeHours}
          onChange={(val) => onChange({ ...value, maxAgeHours: val || undefined })}
          className="w-24"
          size="small"
          min={1}
        />
      </div>
      
      <div className="flex items-center">
        <Checkbox
          id={ids.hp}
          checked={value.isNotHP ?? false}
          onChange={(e) => onChange({ ...value, isNotHP: e.target.checked })}
        >
          <span className="text-xs text-slate-400">Exclude honeypots</span>
        </Checkbox>
      </div>
      
      <Button 
        size="small" 
        onClick={onReset}
        className="ml-auto"
      >
        Reset
      </Button>
    </div>
  );
}

