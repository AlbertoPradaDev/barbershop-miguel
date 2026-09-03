import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored, minified MediaPipe runtime for the haircut simulator's face
    // validator. Third-party build output, not our code: linting it only
    // produces hundreds of no-unused-expressions warnings.
    "public/vendor/**",
  ]),
]);

export default eslintConfig;
