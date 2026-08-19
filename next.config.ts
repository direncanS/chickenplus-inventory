import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reuse the RSC payload of recently-visited pages when the user navigates
  // back. Fresh visits still fetch fresh data; this only affects the client
  // router cache for already-prefetched/loaded pages.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
