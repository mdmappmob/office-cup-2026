import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { execSync } from "node:child_process";

function git(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return "dev";
  }
}

const GIT_COUNT = git("git rev-list --count HEAD");
const GIT_HASH = git("git rev-parse --short HEAD");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
  define: {
    __APP_VERSION__: JSON.stringify(GIT_COUNT),
    __APP_COMMIT__: JSON.stringify(GIT_HASH),
  },
});
