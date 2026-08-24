import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next only serves qualities listed here (default: [75] alone). The
    // pennant logo is flat-colour art with fine script lettering, which
    // WebP at 75 visibly softens, so it asks for 90.
    qualities: [75, 90],
  },
};

export default nextConfig;
