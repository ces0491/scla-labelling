import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React 19's `react-hooks/set-state-in-effect` flags every async-load
    // pattern (the canonical "useEffect calls reload(), reload() awaits
    // fetch, setState after await") as an error. The cascading-render
    // hazard is real but the trade-off in code clarity isn't worth it for
    // a labeller-volume UI. Downgrade to a warning so it still surfaces
    // but doesn't block CI.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
