/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'dist',
  allowedDevOrigins: ['10.229.244.158'],
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  devIndicators: false,
};

export default nextConfig;

