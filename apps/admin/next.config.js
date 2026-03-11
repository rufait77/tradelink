/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['tradelink.rufaitlabs.cloud', 'api.tradelink.rufaitlabs.cloud', 'localhost'],
  },
};

module.exports = nextConfig;
