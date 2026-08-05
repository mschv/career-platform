/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Server actions are used for the AI + Supabase calls in this MVP.
    serverActions: { bodySizeLimit: '10mb' },
  },
};

export default nextConfig;
