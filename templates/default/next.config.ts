import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  /**
   * Keep heavy server-only packages (OpenAI SDK, Agents SDK) out of the
   * Next.js server bundle. They are only ever imported inside Route Handlers
   * and the agent runtime, so leaving them as external Node.js require()
   * calls reduces server bundle size and improves cold-start performance.
   */
  serverExternalPackages: ["@openai/agents", "openai"],

  experimental: {
    /**
     * Tell the bundler to only include the named exports you actually import
     * from these packages instead of the entire module graph.  This is most
     * useful for large utility/icon libraries; listing them here is a no-op
     * for packages already covered by serverExternalPackages, but it future-
     * proofs the config if more client-side dependencies are added later.
     */
    optimizePackageImports: ["zod"],
  },
};

/**
 * Bundle Analyzer
 *
 * Generates a visual report of bundle composition when the ANALYZE env var
 * is set.  Run with:
 *
 *   ANALYZE=true npm run build
 *   ANALYZE=true yarn build
 *   ANALYZE=true pnpm build
 *
 * Three browser tabs will open — client, server, and edge bundles.
 * Use the report to spot large dependencies and decide whether to lazy-load,
 * move to a Server Component, or mark as serverExternalPackages.
 */
export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
