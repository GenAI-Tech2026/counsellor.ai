// Canonical site origin, shared by metadata, robots, and sitemap.
//
// Production 308-redirects counsa.ai → www.counsa.ai, so www IS the canonical
// origin. Every canonical / Open Graph / sitemap URL must use it — pointing at
// the non-www host makes crawlers follow a redirect to reach the real page,
// which dilutes indexing signals.
export const SITE_URL = 'https://www.counsa.ai';
