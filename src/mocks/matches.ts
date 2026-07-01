import type { MockMatch, MatchPhase } from "./types";
import { TEAM_ISO } from "@/lib/teams";

// Compat: alguns componentes ainda importam FLAGS. Re-exporta ISO-2 (mapa por nome do time).
// O componente <Flag /> usa esse mesmo mapa para renderizar SVG.
export const FLAGS: Record<string, string> = TEAM_ISO;

type Fixture = [string, string, string, string, string]; // [group, dateISO, home, away, venueTz]

const EDT = "America/New_York";
const CDT = "America/Chicago";
const MT = "America/Mexico_City";
const ET = "America/Toronto";

const GROUP_FIXTURES: Fixture[] = [
  // Grupo A
  ["A", "2026-06-11T16:00:00-03:00", "México", "África do Sul", MT],
  ["A", "2026-06-11T23:00:00-03:00", "Coreia do Sul", "República Tcheca", EDT],
  ["A", "2026-06-18T13:00:00-03:00", "República Tcheca", "África do Sul", EDT],
  ["A", "2026-06-18T22:00:00-03:00", "México", "Coreia do Sul", MT],
  ["A", "2026-06-24T22:00:00-03:00", "República Tcheca", "México", MT],
  ["A", "2026-06-24T22:00:00-03:00", "África do Sul", "Coreia do Sul", EDT],
  // Grupo B
  ["B", "2026-06-12T16:00:00-03:00", "Canadá", "Bósnia-Herzegovina", ET],
  ["B", "2026-06-13T16:00:00-03:00", "Qatar", "Suíça", EDT],
  ["B", "2026-06-18T16:00:00-03:00", "Suíça", "Bósnia-Herzegovina", EDT],
  ["B", "2026-06-18T19:00:00-03:00", "Canadá", "Qatar", ET],
  ["B", "2026-06-24T16:00:00-03:00", "Suíça", "Canadá", ET],
  ["B", "2026-06-24T16:00:00-03:00", "Bósnia-Herzegovina", "Qatar", EDT],
  // Grupo C
  ["C", "2026-06-13T19:00:00-03:00", "Brasil", "Marrocos", EDT],
  ["C", "2026-06-13T22:00:00-03:00", "Haiti", "Escócia", EDT],
  ["C", "2026-06-19T19:00:00-03:00", "Escócia", "Marrocos", EDT],
  ["C", "2026-06-19T21:30:00-03:00", "Brasil", "Haiti", EDT],
  ["C", "2026-06-24T19:00:00-03:00", "Escócia", "Brasil", EDT],
  ["C", "2026-06-24T19:00:00-03:00", "Marrocos", "Haiti", EDT],
  // Grupo D
  ["D", "2026-06-12T22:00:00-03:00", "Estados Unidos", "Paraguai", CDT],
  ["D", "2026-06-14T01:00:00-03:00", "Austrália", "Turquia", CDT],
  ["D", "2026-06-19T16:00:00-03:00", "Estados Unidos", "Austrália", CDT],
  ["D", "2026-06-20T00:00:00-03:00", "Turquia", "Paraguai", CDT],
  ["D", "2026-06-25T23:00:00-03:00", "Turquia", "Estados Unidos", CDT],
  ["D", "2026-06-25T23:00:00-03:00", "Paraguai", "Austrália", CDT],
  // Grupo E
  ["E", "2026-06-14T14:00:00-03:00", "Alemanha", "Curaçao", EDT],
  ["E", "2026-06-14T20:00:00-03:00", "Costa do Marfim", "Equador", EDT],
  ["E", "2026-06-20T17:00:00-03:00", "Alemanha", "Costa do Marfim", EDT],
  ["E", "2026-06-20T21:00:00-03:00", "Equador", "Curaçao", EDT],
  ["E", "2026-06-25T17:00:00-03:00", "Equador", "Alemanha", EDT],
  ["E", "2026-06-25T17:00:00-03:00", "Curaçao", "Costa do Marfim", EDT],
  // Grupo F
  ["F", "2026-06-14T17:00:00-03:00", "Holanda", "Japão", EDT],
  ["F", "2026-06-14T23:00:00-03:00", "Suécia", "Tunísia", EDT],
  ["F", "2026-06-20T14:00:00-03:00", "Holanda", "Suécia", EDT],
  ["F", "2026-06-21T01:00:00-03:00", "Tunísia", "Japão", EDT],
  ["F", "2026-06-25T20:00:00-03:00", "Tunísia", "Holanda", EDT],
  ["F", "2026-06-25T20:00:00-03:00", "Japão", "Suécia", EDT],
  // Grupo G
  ["G", "2026-06-15T16:00:00-03:00", "Bélgica", "Egito", EDT],
  ["G", "2026-06-15T22:00:00-03:00", "Irã", "Nova Zelândia", EDT],
  ["G", "2026-06-21T16:00:00-03:00", "Bélgica", "Irã", EDT],
  ["G", "2026-06-21T22:00:00-03:00", "Nova Zelândia", "Egito", EDT],
  ["G", "2026-06-27T00:00:00-03:00", "Nova Zelândia", "Bélgica", EDT],
  ["G", "2026-06-27T00:00:00-03:00", "Egito", "Irã", EDT],
  // Grupo H
  ["H", "2026-06-15T13:00:00-03:00", "Espanha", "Cabo Verde", EDT],
  ["H", "2026-06-15T19:00:00-03:00", "Arábia Saudita", "Uruguai", EDT],
  ["H", "2026-06-21T13:00:00-03:00", "Espanha", "Arábia Saudita", EDT],
  ["H", "2026-06-21T19:00:00-03:00", "Uruguai", "Cabo Verde", EDT],
  ["H", "2026-06-26T21:00:00-03:00", "Uruguai", "Espanha", EDT],
  ["H", "2026-06-26T21:00:00-03:00", "Cabo Verde", "Arábia Saudita", EDT],
  // Grupo I
  ["I", "2026-06-16T16:00:00-03:00", "França", "Senegal", EDT],
  ["I", "2026-06-16T19:00:00-03:00", "Iraque", "Noruega", EDT],
  ["I", "2026-06-22T18:00:00-03:00", "França", "Iraque", EDT],
  ["I", "2026-06-22T21:00:00-03:00", "Noruega", "Senegal", EDT],
  ["I", "2026-06-26T16:00:00-03:00", "Noruega", "França", EDT],
  ["I", "2026-06-26T16:00:00-03:00", "Senegal", "Iraque", EDT],
  // Grupo J
  ["J", "2026-06-16T22:00:00-03:00", "Argentina", "Argélia", CDT],
  ["J", "2026-06-17T01:00:00-03:00", "Áustria", "Jordânia", CDT],
  ["J", "2026-06-22T14:00:00-03:00", "Argentina", "Áustria", CDT],
  ["J", "2026-06-23T00:00:00-03:00", "Jordânia", "Argélia", CDT],
  ["J", "2026-06-27T23:00:00-03:00", "Jordânia", "Argentina", CDT],
  ["J", "2026-06-27T23:00:00-03:00", "Argélia", "Áustria", CDT],
  // Grupo K
  ["K", "2026-06-17T14:00:00-03:00", "Portugal", "RD do Congo", CDT],
  ["K", "2026-06-17T23:00:00-03:00", "Uzbequistão", "Colômbia", CDT],
  ["K", "2026-06-23T14:00:00-03:00", "Portugal", "Uzbequistão", CDT],
  ["K", "2026-06-23T23:00:00-03:00", "Colômbia", "RD do Congo", CDT],
  ["K", "2026-06-27T20:30:00-03:00", "Colômbia", "Portugal", CDT],
  ["K", "2026-06-27T20:30:00-03:00", "RD do Congo", "Uzbequistão", CDT],
  // Grupo L
  ["L", "2026-06-17T17:00:00-03:00", "Inglaterra", "Croácia", CDT],
  ["L", "2026-06-17T20:00:00-03:00", "Gana", "Panamá", CDT],
  ["L", "2026-06-23T17:00:00-03:00", "Inglaterra", "Gana", CDT],
  ["L", "2026-06-23T20:00:00-03:00", "Panamá", "Croácia", CDT],
  ["L", "2026-06-27T18:00:00-03:00", "Panamá", "Inglaterra", CDT],
  ["L", "2026-06-27T18:00:00-03:00", "Croácia", "Gana", CDT],
];

function makeGroupMatches(): MockMatch[] {
  return GROUP_FIXTURES.map(([g, date, home, away, tz], i) => ({
    id: `g${i}`,
    home_team: home,
    away_team: away,
    home_flag: TEAM_ISO[home] ?? "",
    away_flag: TEAM_ISO[away] ?? "",
    match_date: date,
    venue_tz: tz,
    phase: "grupos" as const,
    group: g,
    home_score: null,
    away_score: null,
    extra_home_score: null,
    extra_away_score: null,
    status: "scheduled" as const,
  }));
}

function makeBracket(
  phase: MatchPhase,
  dates: string[],
  idPrefix: string,
  tz: string = EDT,
): MockMatch[] {
  return dates.map((date, i) => ({
    id: `${idPrefix}${i}`,
    home_team: "—",
    away_team: "—",
    home_flag: "",
    away_flag: "",
    match_date: date,
    venue_tz: tz,
    phase,
    home_score: null,
    away_score: null,
    extra_home_score: null,
    extra_away_score: null,
    status: "scheduled" as const,
    bracket_slot: `${phase}-${i}`,
  }));
}

export const mockMatches: MockMatch[] = [
  ...makeGroupMatches(),
  // R32: 16 matches, Jun 28 - Jul 3 (ordem do bracket: Match 73→88→78→83→76→75→84→86→79→85→81→74→82→77→87→80)
  ...makeBracket(
    "r32",
    [
      // r0 – Match 73: 2nd A vs 2nd B (Los Angeles, 3PM ET)
      "2026-06-28T16:00:00-03:00",
      // r1 – Match 88: 2nd D vs 2nd G (Dallas, 2PM ET)
      "2026-07-03T15:00:00-03:00",
      // r2 – Match 78: 2nd E vs 2nd I (Dallas, 1PM ET)
      "2026-06-30T14:00:00-03:00",
      // r3 – Match 83: 2nd K vs 2nd L (Toronto, 7PM ET)
      "2026-07-02T20:00:00-03:00",
      // r4 – Match 76: 1st C vs 2nd F (Houston, 1PM ET) — Brasil×Japão
      "2026-06-29T14:00:00-03:00",
      // r5 – Match 75: 1st F vs 2nd C (Monterrey, 9PM ET)
      "2026-06-29T22:00:00-03:00",
      // r6 – Match 84: 1st H vs 2nd J (Los Angeles, 3PM ET)
      "2026-07-02T16:00:00-03:00",
      // r7 – Match 86: 1st J vs 2nd H (Miami, 6PM ET)
      "2026-07-03T19:00:00-03:00",
      // r8 – Match 79: 1st A vs 3rd (Mexico City, 9PM ET)
      "2026-06-30T22:00:00-03:00",
      // r9 – Match 85: 1st B vs 3rd (Vancouver, 11PM ET)
      "2026-07-03T00:00:00-03:00",
      // r10 – Match 81: 1st D vs 3rd (San Francisco, 8PM ET)
      "2026-07-01T21:00:00-03:00",
      // r11 – Match 74: 1st E vs 3rd (Boston, 4:30PM ET)
      "2026-06-29T17:30:00-03:00",
      // r12 – Match 82: 1st G vs 3rd (Seattle, 4PM ET)
      "2026-07-01T17:00:00-03:00",
      // r13 – Match 77: 1st I vs 3rd (East Rutherford, 5PM ET)
      "2026-06-30T18:00:00-03:00",
      // r14 – Match 87: 1st K vs 3rd (Kansas City, 9:30PM ET)
      "2026-07-03T22:30:00-03:00",
      // r15 – Match 80: 1st L vs 3rd (Atlanta, 12PM ET)
      "2026-07-01T13:00:00-03:00",
    ],
    "r",
    EDT,
  ),
  // Oitavas: 8 matches, Jul 4-7
  ...makeBracket(
    "oitavas",
    [
      "2026-07-04T13:00:00-03:00",
      "2026-07-04T17:00:00-03:00",
      "2026-07-05T16:00:00-03:00",
      "2026-07-05T20:00:00-03:00",
      "2026-07-06T15:00:00-03:00",
      "2026-07-06T20:00:00-03:00",
      "2026-07-07T12:00:00-03:00",
      "2026-07-07T16:00:00-03:00",
    ],
    "o",
    EDT,
  ),
  // Quartas: 4 matches, Jul 9-11
  ...makeBracket(
    "quartas",
    [
      "2026-07-09T16:00:00-03:00",
      "2026-07-10T15:00:00-03:00",
      "2026-07-11T17:00:00-03:00",
      "2026-07-11T21:00:00-03:00",
    ],
    "q",
    EDT,
  ),
  // Semi: 2 matches, Jul 14-15
  ...makeBracket("semi", ["2026-07-14T15:00:00-03:00", "2026-07-15T15:00:00-03:00"], "s", EDT),
  // Final: Jul 19
  ...makeBracket("final", ["2026-07-19T15:00:00-03:00"], "f", EDT),
];
