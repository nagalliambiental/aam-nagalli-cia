import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    TZ: "America/Sao_Paulo",
  },
  outputFileTracingExcludes: {
    "/*": [
      "./tests/**/*",
      "./**/*.test.*",
      "./**/__tests__/**/*",
      "./**/*.spec.*",
      "./prisma/seed.ts",
      "./scripts/**/*",
    ],
  },
};

export default nextConfig;