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
};

export default nextConfig;
