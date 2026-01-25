/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Handle pdfjs-dist worker
    config.resolve.alias.canvas = false;
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ["ws"],
  },
};

export default nextConfig;
