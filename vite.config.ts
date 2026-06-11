// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Supabase está pausado (ver _parked/supabase/). Para reativar, restaurar o
// bloco `define` com VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY a partir
// dos secrets HELPDESK_SUPABASE_*.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
