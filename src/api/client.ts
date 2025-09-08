import ky from 'ky';

const base = import.meta.env.VITE_API_BASE || '/api';

export const api = ky.create({
  prefixUrl: base,
  timeout: 15000,
  retry: { limit: 0 },
});
