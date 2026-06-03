/** @type {import('next').NextConfig} */
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://rentorbit-api:4000";

const nextConfig = {
  compress: true,
  output: "standalone",
  transpilePackages: ["@rentorbit/shared"],
  images: {
    unoptimized: true
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/:path*`
      }
    ];
  }
};

export default nextConfig;
