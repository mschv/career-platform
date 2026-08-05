/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Server actions are used for the AI + Supabase calls in this MVP.
    serverActions: { bodySizeLimit: '10mb' },
  },
  // pdf-parse (via pdfjs-dist) loads its worker script by relative path at
  // runtime — bundling it into a Next.js chunk breaks that resolution.
  // Keep it as a native Node `require` instead.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  // pdfjs-dist optionally requires @napi-rs/canvas (a native module) to
  // polyfill DOMMatrix/ImageData/Path2D, which PDF text-position parsing
  // actually needs — not just image rendering. That require is dynamic
  // (wrapped so it can fail gracefully in envs without it), so Next's
  // output tracer misses it and drops it from the deployed function
  // unless explicitly included here.
  outputFileTracingIncludes: {
    '/api/onboarding/extract': ['./node_modules/@napi-rs/canvas*/**/*'],
  },
};

export default nextConfig;
