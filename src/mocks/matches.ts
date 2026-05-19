import type { MockMatch, MatchPhase } from "./types";

const TEAMS: Array<{ name: string; flag: string; group: string }> = [
  { name: "Brasil", flag: "🇧🇷", group: "A" }, { name: "México", flag: "🇲🇽", group: "A" },
  { name: "Canadá", flag: "🇨🇦", group: "A" }, { name: "Marrocos", flag: "🇲🇦", group: "A" },
  { name: "Argentina", flag: "🇦🇷", group: "B" }, { name: "Espanha", flag: "🇪🇸", group: "B" },
  { name: "Japão", flag: "🇯🇵", group: "B" }, { name: "Senegal", flag: "🇸🇳", group: "B" },
  { name: "França", flag: "🇫🇷", group: "C" }, { name: "Alemanha", flag: "🇩🇪", group: "C" },
  { name: "Croácia", flag: "🇭🇷", group: "C" }, { name: "Nigéria", flag: "🇳🇬", group: "C" },
  { name: "Inglaterra", flag: "🇬🇧", group: "D" }, { name: "Portugal", flag: "🇵🇹", group: "D" },
  { name: "Uruguai", flag: "🇺🇾", group: "D" }, { name: "Coreia do Sul", flag: "🇰🇷", group: "D" },
  { name: "Holanda", flag: "🇳🇱", group: "E" }, { name: "Bélgica", flag: "🇧🇪", group: "E" },
  { name: "EUA", flag: "🇺🇸", group: "E" }, { name: "Equador", flag: "🇪🇨", group: "E" },
  { name: "Itália", flag: "🇮🇹", group: "F" }, { name: "Colômbia", flag: "🇨🇴", group: "F" },
  { name: "Suíça", flag: "🇨🇭", group: "F" }, { name: "Camarões", flag: "🇨🇲", group: "F" },
];

function makeGroupMatches(): MockMatch[] {
  const matches: MockMatch[] = [];
  const groups = Array.from(new Set(TEAMS.map((t) => t.group)));
  let i = 0;
  for (const g of groups) {
    const ts = TEAMS.filter((t) => t.group === g);
    const pairs: Array<[typeof ts[number], typeof ts[number]]> = [
      [ts[0], ts[1]],
      [ts[2], ts[3]],
    ];
    for (const [h, a] of pairs) {
      matches.push({
        id: `g${i}`,
        home_team: h.name,
        away_team: a.name,
        home_flag: h.flag,
        away_flag: a.flag,
        match_date: `2026-06-${String(11 + (i % 14)).padStart(2, "0")}T16:00:00Z`,
        phase: "grupos",
        group: g,
        home_score: null,
        away_score: null,
        status: "scheduled",
      });
      i++;
    }
  }
  return matches;
}

function makeBracket(phase: MatchPhase, count: number, idPrefix: string): MockMatch[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${idPrefix}${i}`,
    home_team: "—",
    away_team: "—",
    home_flag: "🏳️",
    away_flag: "🏳️",
    match_date: "2026-07-01T16:00:00Z",
    phase,
    home_score: null,
    away_score: null,
    status: "scheduled" as const,
    bracket_slot: `${phase}-${i}`,
  }));
}

export const mockMatches: MockMatch[] = [
  ...makeGroupMatches(),
  ...makeBracket("oitavas", 8, "o"),
  ...makeBracket("quartas", 4, "q"),
  ...makeBracket("semi", 2, "s"),
  ...makeBracket("final", 1, "f"),
];