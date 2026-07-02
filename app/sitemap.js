import { SITE_URL } from '@/lib/site';

// Generates /sitemap.xml. Lists the public, indexable pages so search engines
// discover them directly instead of relying on crawl luck. Account/API routes
// are intentionally excluded (see robots.js). `lastModified` uses build time.
export default function sitemap() {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/chat`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
