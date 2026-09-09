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
      "./node_modules/.prisma/client/query_engine-*.dll.node",
      "./node_modules/.prisma/client/**/*.tmp*",
      "./node_modules/@prisma/engines/**/*",
      "./node_modules/@prisma/client/runtime/*.cockroachdb.*",
      "./node_modules/@prisma/client/runtime/*.mysql.*",
      "./node_modules/@prisma/client/runtime/*.sqlserver.*",
      "./node_modules/@prisma/client/runtime/*.sqlite.*",
    ],
  },
};

export default nextConfig;