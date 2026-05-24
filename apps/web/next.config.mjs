/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@rentorbit/shared"],
  images: {
    unoptimized: true
  }
};

export default nextConfig;
