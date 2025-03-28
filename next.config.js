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
  // Explicitly expose environment variables to be available client-side
  env: {
    NEXT_PUBLIC_NEO4J_URI: process.env.NEXT_PUBLIC_NEO4J_URI || 'neo4j://localhost:7687',
    NEXT_PUBLIC_NEO4J_USER: process.env.NEXT_PUBLIC_NEO4J_USER || 'neo4j',
    NEXT_PUBLIC_NEO4J_PASSWORD: process.env.NEXT_PUBLIC_NEO4J_PASSWORD || 'Rathum12!',
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
