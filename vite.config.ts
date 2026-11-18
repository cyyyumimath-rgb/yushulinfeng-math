import {defineConfig} from "vite";
import vinext from "vinext";
import {configureToolEnvironment} from "./scripts/tool-environment.mjs";

export default defineConfig(async () => {
  configureToolEnvironment(process.cwd());
  const {cloudflare} = await import("@cloudflare/vite-plugin");
  return {
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: {name:"rsc",childEnvironments:["ssr"]},
        inspectorPort: false,
        config: {
          name: "yushulinfeng-math",
          main: "./worker/index.ts",
          compatibility_date: "2026-05-15",
          compatibility_flags: ["nodejs_compat"],
          d1_databases: [{
            binding: "DB",
            database_name: "math-local",
            database_id: "00000000-0000-4000-8000-000000000000",
          }],
        },
      }),
    ],
  };
});
