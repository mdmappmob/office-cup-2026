import { mockMatches } from "@/mocks/matches";
import type { MockMatch } from "@/mocks/types";

/** Tabela inicial de jogos — usada como seed do "DB" piloto. */
export function getSeedMatches(): MockMatch[] {
  return mockMatches;
}