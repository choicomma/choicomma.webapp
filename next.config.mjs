const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "172.30.1.74"],
  experimental: {
    useCache: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zylq-002.dx.commercecloud.salesforce.com",
      },
      {
        protocol: "https",
        hostname: "edge.disstg.commercecloud.salesforce.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;