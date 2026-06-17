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

export const syncAllMembers = createServerFn({ method: "POST" })
  .validator(
    (d: {
      members: Array<{
        user_id: string;
        league_id: string;
        has_paid_admin: boolean;
        total_points: number;
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
      for (const member of data.members) {
        await supabaseFetch(
          supabaseUrl,
          serviceKey,
          `members?league_id=eq.${member.league_id}&user_id=eq.${member.user_id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              has_paid_admin: member.has_paid_admin,
              total_points: member.total_points,
            }),
          },
        );
      }
      return { ok: true, count: data.members.length };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
