/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep these out of the bundler and require them from node_modules at runtime.
  //   • @supabase/supabase-js — avoids bundler issues with its dynamic requires.
  //   • onnxruntime-node — the on-device embedding backend used by
  //     @xenova/transformers (lib/embeddings.mjs). It ships a prebuilt native
  //     .node binary per platform (Vercel installs the linux-x64 build); marking
  //     it external lets Output File Tracing include that binary instead of the
  //     bundler trying (and failing) to pack a native addon. This replaces the
  //     old "alias onnxruntime-node → empty.js" hack, which force-selected the
  //     WASM backend and was never actually exercised at runtime on Vercel (the
  //     embedding path used a hosted API that has since been retired).
  serverExternalPackages: ['@supabase/supabase-js', 'onnxruntime-node'],

  // Bundle the on-device embedding model into the /api/chat serverless function.
  // lib/embeddings.mjs loads `bge-small-en-v1.5` from `models/` on disk (never the
  // network — see the comment there). Output File Tracing does NOT pick these up
  // automatically because they're read at runtime by path, not `require`d, so we
  // include the folder explicitly. Without this the model is absent in the
  // deployed function → embedText throws → retrieval fails → the chat replies
  // "temporary problem looking up colleges".
  outputFileTracingIncludes: {
    '/api/chat': [
      './models/**/*',
      // The onnxruntime-node native binding (`onnxruntime_binding.node`) IS traced
      // automatically, but the shared library it dlopen()s at runtime
      // (`libonnxruntime.so.*`) is NOT — nothing `require`s it, so File Tracing
      // can't see it, and it gets dropped from the deployed function. Result on
      // Vercel: the binding loads, then fails to resolve its .so → the ONNX
      // backend throws → embedText throws → retrieval fails → "temporary problem
      // looking up colleges". Force-include the whole linux native dir (x64 +
      // arm64, glob so a version bump of the .so keeps matching).
      './node_modules/onnxruntime-node/bin/napi-v3/linux/**/*',
    ],
  },

  // Hide the Next.js dev server indicator that overlaps the mobile UI
  devIndicators: {
    buildActivityPosition: 'top-right',
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
