/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOW-FROM https://www.hauevalleyweddings.com",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://www.hauevalleyweddings.com https://hauevalleyweddings.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
