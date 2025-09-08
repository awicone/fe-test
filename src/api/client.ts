import ky from 'ky';

const base = import.meta.env.VITE_API_BASE || '/api'; // на CF Pages будет работать через функцию на /api

export const api = ky.create({
  prefixUrl: base,
  timeout: 15000,
  retry: { limit: 0 },
});
