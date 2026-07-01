import { createServerFn } from "@tanstack/react-start";

async function supabaseFetch(
  supabaseUrl: string,
  serviceKey: string,
  path: string,
  init?: RequestInit,
) {
  const url = `${supabaseUrl}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "resolution=merge-duplicates",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path}: ${res.status} ${text}`);
  }
}

export const backfillMatchResults = createServerFn({ method: "POST" })
  .validator(
    (      d: {
      matches: Array<{
        id: string;
        home_team: string;
        away_team: string;
        home_flag: string;
        away_flag: string;
        match_date: string;
        venue_tz: string | null;
        phase: string;
        group: string | null;
        home_score: number;
        away_score: number;
        extra_home_score: number | null;
        extra_away_score: number | null;
        winner: string | null;
        winner_flag: string | null;
        status: string;
        bracket_slot: string | null;
      }>;
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!supabaseUrl || !serviceKey) {
      return { ok: false, error: "Credenciais não configuradas" };
    }
    try {
      for (const match of data.matches) {
        await supabaseFetch(supabaseUrl, serviceKey, "matches", {
          method: "POST",
          body: JSON.stringify(match),
        });
      }
      return { ok: true, count: data.matches.length };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
