export const onRequest = async ({ request }) => {
  const url = new URL(request.url);
  const upstream = 'https://api-rs.dexcelerate.com/';
  const path = url.pathname.replace(/^\/api\//, '');
  const target = upstream + path + (url.search || '');

  const origin = request.headers.get('Origin') || '*';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const resp = await fetch(target, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const res = new Response(resp.body, resp);
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Access-Control-Allow-Credentials', 'false');
  res.headers.set('Access-Control-Expose-Headers', '*');
  return res;
};


