// The Mini App calls /api/miniapp/* on its own origin; Next forwards those requests to the Python backend
// (BACKEND_URL), so the browser never needs CORS and the Telegram initData header stays first-party.
// Without BACKEND_URL there are no rewrites: the app is a self-contained demo (see src/app/layout.tsx).
const backend = (process.env.BACKEND_URL || "").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    if (!backend) return [];
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/brand/:path*", destination: `${backend}/static/brand/:path*` },
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
};

export default nextConfig;
