import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * No remotePatterns any more. Every frame on the site is the client's own
   * photograph served from /public/photos, so the Pexels and picsum allowances
   * the placeholder set needed are gone: an image host left in this list is an
   * origin the site is still allowed to load from.
   */
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
