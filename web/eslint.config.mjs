import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The WebGL engine and runtime are a faithful port of imperative code: untyped
    // three.js/GSAP boundaries use `any`, components keep "latest value" refs, and
    // <ClientOnly>-style mounts flip state in an effect. These are intentional, and
    // the project does not use the React Compiler, so they are reported as warnings.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // vendored runtime files copied from the original site (Draco / Basis decoders)
    "public/**",
    // one-off Node tooling (logo generator), not part of the app
    "scripts/**",
  ]),
]);

export default eslintConfig;
