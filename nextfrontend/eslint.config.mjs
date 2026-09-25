import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "server/**",
    "src/components/**",
    "src/legacy-pages/**",
    "src/hooks/**",
    "src/api/**",
    "src/utils/**",
    "src/lib/AuthContext.jsx",
    "src/lib/LegacyAuthContext.jsx",
    "src/lib/PageNotFound.jsx",
  ]),
]);

export default eslintConfig;
