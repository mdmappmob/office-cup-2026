import type { MockMatch, MatchPhase } from "./types";
import { TEAM_ISO } from "@/lib/teams";

// Compat: alguns componentes ainda importam FLAGS. Re-exporta ISO-2 (mapa por nome do time).
// O componente <Flag /> usa esse mesmo mapa para renderizar SVG.
export const FLAGS: Record<string, string> = TEAM_ISO;

type Fixture = [string, string, string, string]; // [group, dateISO, home, away]

const GROUP_FIXTURES: Fixture[] = [
  // Grupo A
  ["A", "2026-06-11T16:00:00Z", "México", "África do Sul"],
  ["A", "2026-06-11T23:00:00Z", "Coreia do Sul", "República Tcheca"],
  ["A", "2026-06-18T13:00:00Z", "República Tcheca", "África do Sul"],
  ["A", "2026-06-18T22:00:00Z", "México", "Coreia do Sul"],
  ["A", "2026-06-24T22:00:00Z", "República Tcheca", "México"],
  ["A", "2026-06-24T22:00:00Z", "África do Sul", "Coreia do Sul"],
  // Grupo B
  ["B", "2026-06-12T16:00:00Z", "Canadá", "Bósnia-Herzegovina"],
  ["B", "2026-06-13T16:00:00Z", "Qatar", "Suíça"],
  ["B", "2026-06-18T16:00:00Z", "Suíça", "Bósnia-Herzegovina"],
  ["B", "2026-06-18T19:00:00Z", "Canadá", "Qatar"],
  ["B", "2026-06-24T16:00:00Z", "Suíça", "Canadá"],
  ["B", "2026-06-24T16:00:00Z", "Bósnia-Herzegovina", "Qatar"],
  // Grupo C
  ["C", "2026-06-13T19:00:00Z", "Brasil", "Marrocos"],
  ["C", "2026-06-13T22:00:00Z", "Haiti", "Escócia"],
  ["C", "2026-06-19T19:00:00Z", "Escócia", "Marrocos"],
  ["C", "2026-06-19T21:30:00Z", "Brasil", "Haiti"],
  ["C", "2026-06-24T19:00:00Z", "Escócia", "Brasil"],
  ["C", "2026-06-24T19:00:00Z", "Marrocos", "Haiti"],
  // Grupo D
  ["D", "2026-06-12T22:00:00Z", "Estados Unidos", "Paraguai"],
  ["D", "2026-06-14T01:00:00Z", "Austrália", "Turquia"],
  ["D", "2026-06-19T16:00:00Z", "Estados Unidos", "Austrália"],
  ["D", "2026-06-20T00:00:00Z", "Turquia", "Paraguai"],
  ["D", "2026-06-25T23:00:00Z", "Turquia", "Estados Unidos"],
  ["D", "2026-06-25T23:00:00Z", "Paraguai", "Austrália"],
  // Grupo E
  ["E", "2026-06-14T14:00:00Z", "Alemanha", "Curaçao"],
  ["E", "2026-06-14T20:00:00Z", "Costa do Marfim", "Equador"],
  ["E", "2026-06-20T17:00:00Z", "Alemanha", "Costa do Marfim"],
  ["E", "2026-06-20T21:00:00Z", "Equador", "Curaçao"],
  ["E", "2026-06-25T17:00:00Z", "Equador", "Alemanha"],
  ["E", "2026-06-25T17:00:00Z", "Curaçao", "Costa do Marfim"],
  // Grupo F
  ["F", "2026-06-14T17:00:00Z", "Holanda", "Japão"],
  ["F", "2026-06-14T23:00:00Z", "Suécia", "Tunísia"],
  ["F", "2026-06-20T14:00:00Z", "Holanda", "Suécia"],
  ["F", "2026-06-21T01:00:00Z", "Tunísia", "Japão"],
  ["F", "2026-06-25T20:00:00Z", "Tunísia", "Holanda"],
  ["F", "2026-06-25T20:00:00Z", "Japão", "Suécia"],
  // Grupo G
  ["G", "2026-06-15T16:00:00Z", "Bélgica", "Egito"],
  ["G", "2026-06-15T22:00:00Z", "Irã", "Nova Zelândia"],
  ["G", "2026-06-21T16:00:00Z", "Bélgica", "Irã"],
  ["G", "2026-06-21T22:00:00Z", "Nova Zelândia", "Egito"],
  ["G", "2026-06-27T00:00:00Z", "Nova Zelândia", "Bélgica"],
  ["G", "2026-06-27T00:00:00Z", "Egito", "Irã"],
  // Grupo H
  ["H", "2026-06-15T13:00:00Z", "Espanha", "Cabo Verde"],
  ["H", "2026-06-15T19:00:00Z", "Arábia Saudita", "Uruguai"],
  ["H", "2026-06-21T13:00:00Z", "Espanha", "Arábia Saudita"],
  ["H", "2026-06-21T19:00:00Z", "Uruguai", "Cabo Verde"],
  ["H", "2026-06-26T21:00:00Z", "Uruguai", "Espanha"],
  ["H", "2026-06-26T21:00:00Z", "Cabo Verde", "Arábia Saudita"],
  // Grupo I
  ["I", "2026-06-16T16:00:00Z", "França", "Senegal"],
  ["I", "2026-06-16T19:00:00Z", "Iraque", "Noruega"],
  ["I", "2026-06-22T18:00:00Z", "França", "Iraque"],
  ["I", "2026-06-22T21:00:00Z", "Noruega", "Senegal"],
  ["I", "2026-06-26T16:00:00Z", "Noruega", "França"],
  ["I", "2026-06-26T16:00:00Z", "Senegal", "Iraque"],
  // Grupo J
  ["J", "2026-06-16T22:00:00Z", "Argentina", "Argélia"],
  ["J", "2026-06-17T01:00:00Z", "Áustria", "Jordânia"],
  ["J", "2026-06-22T14:00:00Z", "Argentina", "Áustria"],
  ["J", "2026-06-23T00:00:00Z", "Jordânia", "Argélia"],
  ["J", "2026-06-27T23:00:00Z", "Jordânia", "Argentina"],
  ["J", "2026-06-27T23:00:00Z", "Argélia", "Áustria"],
  // Grupo K
  ["K", "2026-06-17T14:00:00Z", "Portugal", "RD do Congo"],
  ["K", "2026-06-17T23:00:00Z", "Uzbequistão", "Colômbia"],
  ["K", "2026-06-23T14:00:00Z", "Portugal", "Uzbequistão"],
  ["K", "2026-06-23T23:00:00Z", "Colômbia", "RD do Congo"],
  ["K", "2026-06-27T20:30:00Z", "Colômbia", "Portugal"],
  ["K", "2026-06-27T20:30:00Z", "RD do Congo", "Uzbequistão"],
  // Grupo L
  ["L", "2026-06-17T17:00:00Z", "Inglaterra", "Croácia"],
  ["L", "2026-06-17T20:00:00Z", "Gana", "Panamá"],
  ["L", "2026-06-23T17:00:00Z", "Inglaterra", "Gana"],
  ["L", "2026-06-23T20:00:00Z", "Panamá", "Croácia"],
  ["L", "2026-06-27T18:00:00Z", "Panamá", "Inglaterra"],
  ["L", "2026-06-27T18:00:00Z", "Croácia", "Gana"],
];

function makeGroupMatches(): MockMatch[] {
  return GROUP_FIXTURES.map(([g, date, home, away], i) => ({
    id: `g${i}`,
    home_team: home,
    away_team: away,
    home_flag: TEAM_ISO[home] ?? "",
    away_flag: TEAM_ISO[away] ?? "",
    match_date: date,
    phase: "grupos" as const,
    group: g,
    home_score: null,
    away_score: null,
    status: "scheduled" as const,
  }));
}

function makeBracket(phase: MatchPhase, count: number, idPrefix: string, baseDate: string): MockMatch[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${idPrefix}${i}`,
    home_team: "—",
    away_team: "—",
    home_flag: "",
    away_flag: "",
    match_date: baseDate,
    phase,
    home_score: null,
    away_score: null,
    status: "scheduled" as const,
    bracket_slot: `${phase}-${i}`,
  }));
}

export const mockMatches: MockMatch[] = [
  ...makeGroupMatches(),
  // Copa 2026 traz uma fase a mais: 16-avos (32 → 16) com 16 jogos
  ...makeBracket("r32", 16, "r", "2026-06-30T16:00:00Z"),
  ...makeBracket("oitavas", 8, "o", "2026-07-04T16:00:00Z"),
  ...makeBracket("quartas", 4, "q", "2026-07-09T16:00:00Z"),
  ...makeBracket("semi", 2, "s", "2026-07-14T20:00:00Z"),
  ...makeBracket("final", 1, "f", "2026-07-19T16:00:00Z"),
];