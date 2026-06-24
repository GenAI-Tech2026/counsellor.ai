/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep these native/heavy packages out of the bundler so they load as plain
  // Node modules at runtime (onnxruntime-node inside transformers.js, etc.).
  serverExternalPackages: ['@supabase/supabase-js', '@xenova/transformers'],

  // Allow the dev server (and its HMR websocket at /_next/webpack-hmr) to be
  // reached through the ngrok tunnel. Next blocks cross-origin requests to
  // dev-only endpoints by default, which otherwise kills hot reload when the
  // browser origin is the ngrok host instead of localhost.
  allowedDevOrigins: ['*.ngrok-free.dev', '*.ngrok-free.app', '*.ngrok.io'],
};

export default nextConfig;
