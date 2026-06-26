import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep supabase out of the bundler.
  serverExternalPackages: ['@supabase/supabase-js'],

  // Ignore native node modules when bundling @xenova/transformers for Vercel
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": path.resolve("./lib/empty.js"),
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      "onnxruntime-node": "./lib/empty.js",
    },
  },

  // Allow the dev server (and its HMR websocket at /_next/webpack-hmr) to be
  // reached through the ngrok tunnel. Next blocks cross-origin requests to
  // dev-only endpoints by default, which otherwise kills hot reload when the
  // browser origin is the ngrok host instead of localhost.
  allowedDevOrigins: ['*.ngrok-free.dev', '*.ngrok-free.app', '*.ngrok.io'],

  // Security headers applied to every response. CSP ships REPORT-ONLY first so it
  // can't break the app (Next uses inline styles/scripts); promote it to an
  // enforced `Content-Security-Policy` once you've confirmed no violations.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://*.upstash.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
