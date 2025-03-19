/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'build',
  output: 'export',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Add null-loader
    // This is needed to avoid issues with aframe and 3d-force-graph-vr
    config.module.rules.push({
      test: /node_modules\/(aframe|aframe-extras|3d-force-graph-vr)/,
      use: 'null-loader',
    });
    
    return config;
  },
};

module.exports = nextConfig;
