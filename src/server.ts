import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

async function getServerEntry() {
  return import("@tanstack/react-start/server-entry").then(
    (m) => ((m as { default?: { fetch: Function } }).default ?? m) as { fetch: Function },
  );
}

export default {
  async fetch(request: Request) {
    try {
      const handler = await getServerEntry();
      return await handler.fetch(request, {}, {});
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
