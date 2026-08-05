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
  // pdfjs-dist loads two things dynamically (a runtime `import()` for its
  // worker script, an optional require() for @napi-rs/canvas's DOMMatrix/
  // ImageData/Path2D polyfill — needed for PDF text positioning, not just
  // rendering) instead of a static require Next's output tracer can see,
  // so both get silently dropped from the deployed function unless forced
  // in here.
  outputFileTracingIncludes: {
    '/api/onboarding/extract': ['./node_modules/@napi-rs/canvas*/**/*', './node_modules/pdfjs-dist/**/*'],
  },
};

export default nextConfig;
