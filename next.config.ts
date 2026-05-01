import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Static export: produces a fully static `out/` directory consumable by
  // any static host (EdgeOne Pages, Cloudflare Pages, S3, Vercel). All our
  // pages are client-rendered (Studio is a client component, tldraw loads
  // dynamically via ssr:false), so no SSR features are lost.
  output: 'export',
  images: {
    // Image Optimization service requires a Node runtime; with static
    // export we ship raw images. We don't currently use next/image with
    // remote sources but disable optimization to be safe across hosts.
    unoptimized: true,
  },
};

export default nextConfig;
