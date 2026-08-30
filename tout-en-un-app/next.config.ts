import type { NextConfig } from "next";
import "./src/lib/env";

const nextConfig: NextConfig = {
  // Icône « N » de dev tools (bas à gauche), visible uniquement en `next dev`,
  // jamais en production : purement une gêne visuelle pendant le développement.
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-src 'self' https://www.youtube-nocookie.com; frame-ancestors 'self'",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
