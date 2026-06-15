/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'dist',
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  devIndicators: false,
};

export default nextConfig;

