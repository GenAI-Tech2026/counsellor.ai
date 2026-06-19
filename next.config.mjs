/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep these native/heavy packages out of the bundler so they load as plain
  // Node modules at runtime (onnxruntime-node inside transformers.js, etc.).
  serverExternalPackages: ['@supabase/supabase-js', '@xenova/transformers'],
};

export default nextConfig;
