<<<<<<< Updated upstream
import { SITE_URL } from '@/lib/site';

// Generates /robots.txt. Allows crawling of the public marketing + product
// pages, keeps bots out of API and auth/account routes (no SEO value, and they
// waste crawl budget), and points crawlers at the sitemap so pages are
// discovered quickly. See Next's Metadata Files guide (robots).
=======
>>>>>>> Stashed changes
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
<<<<<<< Updated upstream
      disallow: ['/api/', '/auth/', '/profile'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
=======
      disallow: ['/api/', '/auth/'],
    },
    sitemap: 'https://www.counsa.ai/sitemap.xml',
  }
>>>>>>> Stashed changes
}
