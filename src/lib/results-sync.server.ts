import { createServerFn } from "@tanstack/react-start";
import type { SyncResult } from "./results-sync";

interface FootballDataMatch {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
  status: string;
  utcDate: string;
}

interface FootballDataResponse {
  matches: FootballDataMatch[];
}

function mapStatus(apiStatus: string): SyncResult["status"] {
  if (apiStatus === "FINISHED") return "finished";
  if (apiStatus === "IN_PLAY" || apiStatus === "PAUSED") return "live";
  return "scheduled";
}

export const syncFootballData = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    ok: boolean;
    results: SyncResult[];
    error?: string;
  }> => {
    const apiKey = process.env.FOOTBALL_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        results: [],
        error:
          "FOOTBALL_API_KEY não configurada. Obtenha uma chave gratuita em https://www.football-data.org/client/register",
      };
    }

    const competitionId = process.env.FOOTBALL_COMPETITION_ID ?? "2000";
    const url = `https://api.football-data.org/v4/competitions/${competitionId}/matches`;

    try {
      const response = await fetch(url, {
        headers: { "X-Auth-Token": apiKey },
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          results: [],
          error: `API retornou ${response.status}: ${text}`,
        };
      }

      const data = (await response.json()) as FootballDataResponse;

      const results: SyncResult[] = data.matches.map((m) => ({
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        status: mapStatus(m.status),
        matchDate: m.utcDate,
      }));

      return { ok: true, results };
    } catch (err) {
      return {
        ok: false,
        results: [],
        error: (err as Error).message ?? "Erro ao conectar com a API",
      };
    }
  },
);
