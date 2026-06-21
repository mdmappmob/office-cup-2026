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
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path}: ${res.status} ${text}`);
  }
  return res;
}

export const fetchAllLeaguePredictions = createServerFn({ method: "GET" })
  .validator((d: { memberUserIds: string[] }) => d)
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!supabaseUrl || !serviceKey) {
      return [];
    }

    const allPredictions: Array<{
      id: string;
      user_id: string;
      league_id: string;
      match_id: string;
      slot: number;
      predicted_home_score: number | null;
      predicted_away_score: number | null;
      predicted_goalscorers: string[];
      points_earned: number;
      is_zebra: boolean;
    }> = [];

    for (const uid of data.memberUserIds) {
      try {
        const res = await supabaseFetch(
          supabaseUrl,
          serviceKey,
          `predictions?user_id=eq.${uid}&select=*`,
        );
        const rows = await res.json();
        allPredictions.push(...rows);
      } catch (err) {
        console.warn(`Erro ao buscar predictions de ${uid}`, err);
      }
    }

    return allPredictions;
  });
