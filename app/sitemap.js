<<<<<<< Updated upstream
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
=======
export default function sitemap() {
  const baseUrl = 'https://www.counsa.ai';
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
>>>>>>> Stashed changes
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
<<<<<<< Updated upstream
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
=======
      url: `${baseUrl}/chat`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/profile`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  ]
>>>>>>> Stashed changes
}
