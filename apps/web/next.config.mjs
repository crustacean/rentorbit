/** @type {import('next').NextConfig} */
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://rentorbit-api:4000";

const nextConfig = {
  transpilePackages: ["@rentorbit/shared"],
  images: {
    unoptimized: true
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
