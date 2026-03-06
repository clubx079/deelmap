/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Old property URLs used /property/:id — redirect to /:slug so [slug] page can resolve by slug or id
      { source: '/property/:path*', destination: '/:path*', permanent: false },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig