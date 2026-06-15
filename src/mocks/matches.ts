import type { MockMatch, MatchPhase } from "./types";
import { TEAM_ISO } from "@/lib/teams";

// Compat: alguns componentes ainda importam FLAGS. Re-exporta ISO-2 (mapa por nome do time).
// O componente <Flag /> usa esse mesmo mapa para renderizar SVG.
export const FLAGS: Record<string, string> = TEAM_ISO;

type Fixture = [string, string, string, string]; // [group, dateISO, home, away]

const GROUP_FIXTURES: Fixture[] = [
  // Grupo A
  ["A", "2026-06-11T16:00:00-03:00", "México", "África do Sul"],
  ["A", "2026-06-11T23:00:00-03:00", "Coreia do Sul", "República Tcheca"],
  ["A", "2026-06-18T13:00:00-03:00", "República Tcheca", "África do Sul"],
  ["A", "2026-06-18T22:00:00-03:00", "México", "Coreia do Sul"],
  ["A", "2026-06-24T22:00:00-03:00", "República Tcheca", "México"],
  ["A", "2026-06-24T22:00:00-03:00", "África do Sul", "Coreia do Sul"],
  // Grupo B
  ["B", "2026-06-12T16:00:00-03:00", "Canadá", "Bósnia-Herzegovina"],
  ["B", "2026-06-13T16:00:00-03:00", "Qatar", "Suíça"],
  ["B", "2026-06-18T16:00:00-03:00", "Suíça", "Bósnia-Herzegovina"],
  ["B", "2026-06-18T19:00:00-03:00", "Canadá", "Qatar"],
  ["B", "2026-06-24T16:00:00-03:00", "Suíça", "Canadá"],
  ["B", "2026-06-24T16:00:00-03:00", "Bósnia-Herzegovina", "Qatar"],
  // Grupo C
  ["C", "2026-06-13T19:00:00-03:00", "Brasil", "Marrocos"],
  ["C", "2026-06-13T22:00:00-03:00", "Haiti", "Escócia"],
  ["C", "2026-06-19T19:00:00-03:00", "Escócia", "Marrocos"],
  ["C", "2026-06-19T21:30:00-03:00", "Brasil", "Haiti"],
  ["C", "2026-06-24T19:00:00-03:00", "Escócia", "Brasil"],
  ["C", "2026-06-24T19:00:00-03:00", "Marrocos", "Haiti"],
  // Grupo D
  ["D", "2026-06-12T22:00:00-03:00", "Estados Unidos", "Paraguai"],
  ["D", "2026-06-14T01:00:00-03:00", "Austrália", "Turquia"],
  ["D", "2026-06-19T16:00:00-03:00", "Estados Unidos", "Austrália"],
  ["D", "2026-06-20T00:00:00-03:00", "Turquia", "Paraguai"],
  ["D", "2026-06-25T23:00:00-03:00", "Turquia", "Estados Unidos"],
  ["D", "2026-06-25T23:00:00-03:00", "Paraguai", "Austrália"],
  // Grupo E
  ["E", "2026-06-14T14:00:00-03:00", "Alemanha", "Curaçao"],
  ["E", "2026-06-14T20:00:00-03:00", "Costa do Marfim", "Equador"],
  ["E", "2026-06-20T17:00:00-03:00", "Alemanha", "Costa do Marfim"],
  ["E", "2026-06-20T21:00:00-03:00", "Equador", "Curaçao"],
  ["E", "2026-06-25T17:00:00-03:00", "Equador", "Alemanha"],
  ["E", "2026-06-25T17:00:00-03:00", "Curaçao", "Costa do Marfim"],
  // Grupo F
  ["F", "2026-06-14T17:00:00-03:00", "Holanda", "Japão"],
  ["F", "2026-06-14T23:00:00-03:00", "Suécia", "Tunísia"],
  ["F", "2026-06-20T14:00:00-03:00", "Holanda", "Suécia"],
  ["F", "2026-06-21T01:00:00-03:00", "Tunísia", "Japão"],
  ["F", "2026-06-25T20:00:00-03:00", "Tunísia", "Holanda"],
  ["F", "2026-06-25T20:00:00-03:00", "Japão", "Suécia"],
  // Grupo G
  ["G", "2026-06-15T16:00:00-03:00", "Bélgica", "Egito"],
  ["G", "2026-06-15T22:00:00-03:00", "Irã", "Nova Zelândia"],
  ["G", "2026-06-21T16:00:00-03:00", "Bélgica", "Irã"],
  ["G", "2026-06-21T22:00:00-03:00", "Nova Zelândia", "Egito"],
  ["G", "2026-06-27T00:00:00-03:00", "Nova Zelândia", "Bélgica"],
  ["G", "2026-06-27T00:00:00-03:00", "Egito", "Irã"],
  // Grupo H
  ["H", "2026-06-15T13:00:00-03:00", "Espanha", "Cabo Verde"],
  ["H", "2026-06-15T19:00:00-03:00", "Arábia Saudita", "Uruguai"],
  ["H", "2026-06-21T13:00:00-03:00", "Espanha", "Arábia Saudita"],
  ["H", "2026-06-21T19:00:00-03:00", "Uruguai", "Cabo Verde"],
  ["H", "2026-06-26T21:00:00-03:00", "Uruguai", "Espanha"],
  ["H", "2026-06-26T21:00:00-03:00", "Cabo Verde", "Arábia Saudita"],
  // Grupo I
  ["I", "2026-06-16T16:00:00-03:00", "França", "Senegal"],
  ["I", "2026-06-16T19:00:00-03:00", "Iraque", "Noruega"],
  ["I", "2026-06-22T18:00:00-03:00", "França", "Iraque"],
  ["I", "2026-06-22T21:00:00-03:00", "Noruega", "Senegal"],
  ["I", "2026-06-26T16:00:00-03:00", "Noruega", "França"],
  ["I", "2026-06-26T16:00:00-03:00", "Senegal", "Iraque"],
  // Grupo J
  ["J", "2026-06-16T22:00:00-03:00", "Argentina", "Argélia"],
  ["J", "2026-06-17T01:00:00-03:00", "Áustria", "Jordânia"],
  ["J", "2026-06-22T14:00:00-03:00", "Argentina", "Áustria"],
  ["J", "2026-06-23T00:00:00-03:00", "Jordânia", "Argélia"],
  ["J", "2026-06-27T23:00:00-03:00", "Jordânia", "Argentina"],
  ["J", "2026-06-27T23:00:00-03:00", "Argélia", "Áustria"],
  // Grupo K
  ["K", "2026-06-17T14:00:00-03:00", "Portugal", "RD do Congo"],
  ["K", "2026-06-17T23:00:00-03:00", "Uzbequistão", "Colômbia"],
  ["K", "2026-06-23T14:00:00-03:00", "Portugal", "Uzbequistão"],
  ["K", "2026-06-23T23:00:00-03:00", "Colômbia", "RD do Congo"],
  ["K", "2026-06-27T20:30:00-03:00", "Colômbia", "Portugal"],
  ["K", "2026-06-27T20:30:00-03:00", "RD do Congo", "Uzbequistão"],
  // Grupo L
  ["L", "2026-06-17T17:00:00-03:00", "Inglaterra", "Croácia"],
  ["L", "2026-06-17T20:00:00-03:00", "Gana", "Panamá"],
  ["L", "2026-06-23T17:00:00-03:00", "Inglaterra", "Gana"],
  ["L", "2026-06-23T20:00:00-03:00", "Panamá", "Croácia"],
  ["L", "2026-06-27T18:00:00-03:00", "Panamá", "Inglaterra"],
  ["L", "2026-06-27T18:00:00-03:00", "Croácia", "Gana"],
];

function guessTz(home: string): string {
  // Copa 2026: EUA, México e Canadá como sedes
  // América Central/México → UTC-6 (sem horário de verão desde 2023) → 3h de diferença de Brasília
  if (home === "México" || home === "Equador" || home === "Panamá" || home === "Costa Rica")
    return "America/Mexico_City";
  // Canadá → UTC-4 (horário de verão)
  if (home === "Canadá") return "America/Toronto";
  // EUA → fuso central (UTC-5) como padrão mais representativo
  if (home === "Estados Unidos") return "America/Chicago";
  // Demais jogos: fuso central americano (~2h de diferença de Brasília)
  return "America/Chicago";
}

function makeGroupMatches(): MockMatch[] {
  return GROUP_FIXTURES.map(([g, date, home, away], i) => ({
    id: `g${i}`,
    home_team: home,
    away_team: away,
    home_flag: TEAM_ISO[home] ?? "",
    away_flag: TEAM_ISO[away] ?? "",
    match_date: date,
    venue_tz: guessTz(home),
    phase: "grupos" as const,
    group: g,
    home_score: null,
    away_score: null,
    status: "scheduled" as const,
  }));
}

function makeBracket(
  phase: MatchPhase,
  count: number,
  idPrefix: string,
  baseDate: string,
): MockMatch[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${idPrefix}${i}`,
    home_team: "—",
    away_team: "—",
    home_flag: "",
    away_flag: "",
    match_date: baseDate,
    venue_tz: "America/Chicago",
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
  ...makeBracket("r32", 16, "r", "2026-06-30T16:00:00-03:00"),
  ...makeBracket("oitavas", 8, "o", "2026-07-04T16:00:00-03:00"),
  ...makeBracket("quartas", 4, "q", "2026-07-09T16:00:00-03:00"),
  ...makeBracket("semi", 2, "s", "2026-07-14T20:00:00-03:00"),
  ...makeBracket("final", 1, "f", "2026-07-19T16:00:00-03:00"),
];
