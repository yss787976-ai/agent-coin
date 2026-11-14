// Pages worker: expose the AQB x402 service on the branded site domain.
// Static assets are served by env.ASSETS; only the service paths are proxied.
const PROXY_PATHS = new Set(["/stats", "/a2a/card", "/quote", "/x402/pay"]);
const ORIGIN = "https://aqb-x402.aqb-foundation.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (PROXY_PATHS.has(url.pathname)) {
      const target = ORIGIN + url.pathname + url.search;
      return fetch(target, request);
    }
    return env.ASSETS.fetch(request);
  },
};
