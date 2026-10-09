const canonicalHost = 'parasoplansetes.lt';

function privateResponse(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: {
    'x-robots-tag': 'noindex, nofollow',
    'cache-control': 'private, no-store',
    ...extra,
  } });
}

// A site-specific deployment boundary; the shared renderer keeps its normal
// publication, host, media and form checks. Only this exact preview is admitted.
export function createPreviewHandler(application) {
  return {
    async fetch(request, env, ctx) {
      const incoming = new URL(request.url);
      if (!env.PREVIEW_HOST || incoming.host !== env.PREVIEW_HOST) {
        return privateResponse('Not found', 404);
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        const origin = request.headers.get('origin');
        const referer = request.headers.get('referer');
        try {
          if (origin ? origin !== incoming.origin : !referer || new URL(referer).origin !== incoming.origin) return privateResponse('Forbidden', 403);
        } catch { return privateResponse('Forbidden', 403); }
      }
      if (incoming.pathname === '/robots.txt') {
        return privateResponse('User-agent: *\nDisallow: /\n', 200, { 'content-type': 'text/plain; charset=utf-8' });
      }
      const destination = new URL(incoming);
      destination.protocol = 'https:';
      destination.hostname = canonicalHost;
      destination.port = '';
      const headers = new Headers(request.headers);
      for (const name of [...headers.keys()]) {
        if (name.startsWith('x-niche-') || name.startsWith('x-gift-') || name.startsWith('x-forwarded-') || name === 'forwarded') headers.delete(name);
      }
      headers.set('host', canonicalHost);
      for (const name of ['origin', 'referer']) {
        const value = headers.get(name);
        if (!value) continue;
        try {
          const url = new URL(value);
          if (url.origin === incoming.origin) {
            url.protocol = 'https:';
            url.hostname = canonicalHost;
            url.port = '';
            headers.set(name, name === 'origin' ? url.origin : url.href);
          }
        } catch { /* Keep malformed/cross-origin input for the existing guard. */ }
      }
      const forwarded = new Request(destination, { method: request.method, headers,
        body: request.body, redirect: 'manual', ...(request.body ? { duplex: 'half' } : {}) });
      const response = await application.fetch(forwarded, env, ctx);
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('x-robots-tag', 'noindex, nofollow');
      responseHeaders.set('cache-control', 'private, no-store');
      const location = responseHeaders.get('location');
      if (location) {
        const target = new URL(location, destination);
        if (target.hostname === canonicalHost) {
          target.protocol = incoming.protocol;
          target.host = incoming.host;
          responseHeaders.set('location', target.href);
        }
      }
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
    },
  };
}
