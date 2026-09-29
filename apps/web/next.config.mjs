/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@trustmesh/types', '@trustmesh/config', '@trustmesh/sdk'],
};

export default nextConfig;
