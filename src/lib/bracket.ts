import type { MockMatch, MockPrediction, MatchPhase } from "@/mocks/types";
import { PHASE_ORDER } from "@/mocks/types";

// ---------------------------------------------------------------------------
// FIFA Ranking (FIFA/Coca-Cola Men's World Ranking, simulated)
// ---------------------------------------------------------------------------
const FIFA_RANKING: Record<string, number> = {
  Brasil: 5,
  Argentina: 1,
  França: 2,
  Espanha: 8,
  Inglaterra: 4,
  Portugal: 6,
  Alemanha: 10,
  Holanda: 7,
  Bélgica: 3,
  Uruguai: 11,
  Croácia: 9,
  Marrocos: 13,
  Japão: 18,
  México: 12,
  "Estados Unidos": 14,
  Senegal: 20,
  "Coreia do Sul": 23,
  Suíça: 15,
  Colômbia: 16,
  Equador: 28,
  Canadá: 33,
  Tunísia: 31,
  Egito: 34,
  Irã: 21,
  "Nova Zelândia": 104,
  "Cabo Verde": 66,
  "Arábia Saudita": 54,
  Iraque: 59,
  Noruega: 42,
  Argélia: 30,
  Áustria: 22,
  Jordânia: 70,
  "RD do Congo": 64,
  Uzbequistão: 74,
  Gana: 29,
  Panamá: 45,
  "África do Sul": 66,
  "República Tcheca": 36,
  "Bósnia-Herzegovina": 39,
  Qatar: 58,
  Haiti: 87,
  Escócia: 38,
  Paraguai: 44,
  Austrália: 25,
  Turquia: 26,
  "Costa do Marfim": 40,
  Curaçao: 81,
  Suécia: 24,
};

const DEFAULT_FIFA_RANK = 100;

// ---------------------------------------------------------------------------
// Fair Play simulation (deterministic, based on team name)
// ---------------------------------------------------------------------------
function fairPlayScore(team: string): number {
  let h = 0;
  for (let i = 0; i < team.length; i++) h = (h * 31 + team.charCodeAt(i)) | 0;
  // Score 0–100 where higher = cleaner
  return 30 + (Math.abs(h) % 71);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface GroupStanding {
  team: string;
  flag: string;
  group: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  fairPlay: number;
  fifaRank: number;
}

export interface GroupStandingsResult {
  groups: Record<string, GroupStanding[]>;
  thirdPlaceRanking: GroupStanding[];
  qualifiedThirdLetters: string[];
}

// ---------------------------------------------------------------------------
// 1. Build group standings from predictions
// ---------------------------------------------------------------------------
function getStandingsForGroup(
  groupMatches: MockMatch[],
  predictions: MockPrediction[],
): GroupStanding[] {
  const teams = new Map<string, GroupStanding>();

  for (const m of groupMatches) {
    if (!teams.has(m.home_team)) {
      teams.set(m.home_team, {
        team: m.home_team,
        flag: m.home_flag,
        group: m.group ?? "",
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
        fairPlay: fairPlayScore(m.home_team),
        fifaRank: FIFA_RANKING[m.home_team] ?? DEFAULT_FIFA_RANK,
      });
    }
    if (!teams.has(m.away_team)) {
      teams.set(m.away_team, {
        team: m.away_team,
        flag: m.away_flag,
        group: m.group ?? "",
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
        fairPlay: fairPlayScore(m.away_team),
        fifaRank: FIFA_RANKING[m.away_team] ?? DEFAULT_FIFA_RANK,
      });
    }

    const p = predictions.find((x) => x.match_id === m.id);
    const hs = p?.predicted_home_score;
    const as = p?.predicted_away_score;
    if (hs === null || hs === undefined || as === null || as === undefined) continue;

    const home = teams.get(m.home_team)!;
    const away = teams.get(m.away_team)!;
    home.mp++;
    away.mp++;
    home.gf += hs;
    home.ga += as;
    away.gf += as;
    away.ga += hs;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (hs > as) {
      home.w++;
      home.pts += 3;
      away.l++;
    } else if (as > hs) {
      away.w++;
      away.pts += 3;
      home.l++;
    } else {
      home.d++;
      home.pts++;
      away.d++;
      away.pts++;
    }
  }

  return Array.from(teams.values());
}

// ---------------------------------------------------------------------------
// 2. Tiebreaker: head-to-head among tied teams
// ---------------------------------------------------------------------------
interface H2HStats {
  team: string;
  pts: number;
  gd: number;
  gf: number;
}

function computeH2H(
  tied: GroupStanding[],
  groupMatches: MockMatch[],
  predictions: MockPrediction[],
): Map<string, H2HStats> {
  const stats = new Map<string, H2HStats>();
  for (const t of tied) stats.set(t.team, { team: t.team, pts: 0, gd: 0, gf: 0 });

  for (const m of groupMatches) {
    if (!stats.has(m.home_team) || !stats.has(m.away_team)) continue;
    const p = predictions.find((x) => x.match_id === m.id);
    const hs = p?.predicted_home_score;
    const as = p?.predicted_away_score;
    if (hs === null || hs === undefined || as === null || as === undefined) continue;

    const h = stats.get(m.home_team)!;
    const a = stats.get(m.away_team)!;
    h.gf += hs;
    h.gd += hs - as;
    a.gf += as;
    a.gd += as - hs;
    if (hs > as) h.pts += 3;
    else if (as > hs) a.pts += 3;
    else {
      h.pts++;
      a.pts++;
    }
  }
  return stats;
}

// ---------------------------------------------------------------------------
// 3. Sort group standings with all tiebreakers
// ---------------------------------------------------------------------------
function sortGroupStandings(
  standings: GroupStanding[],
  groupMatches: MockMatch[],
  predictions: MockPrediction[],
): GroupStanding[] {
  const sorted = [...standings];

  sorted.sort((a, b) => {
    // 1. Points
    if (a.pts !== b.pts) return b.pts - a.pts;

    // If tied: check FIFA tiebreaker steps
    const tied = standings.filter((s) => s.pts === a.pts);
    if (tied.length >= 2) {
      const h2h = computeH2H(tied, groupMatches, predictions);
      const ha = h2h.get(a.team)!;
      const hb = h2h.get(b.team)!;

      // 2. H2H points
      if (ha.pts !== hb.pts) return hb.pts - ha.pts;
      // 3. H2H GD
      if (ha.gd !== hb.gd) return hb.gd - ha.gd;
      // 4. H2H GF
      if (ha.gf !== hb.gf) return hb.gf - ha.gf;
    }

    // 5. Overall GD
    if (a.gd !== b.gd) return b.gd - a.gd;
    // 6. Overall GF
    if (a.gf !== b.gf) return b.gf - a.gf;
    // 7. Fair Play
    if (a.fairPlay !== b.fairPlay) return b.fairPlay - a.fairPlay;
    // 8. FIFA Ranking (lower = better)
    return a.fifaRank - b.fifaRank;
  });

  return sorted;
}

// ---------------------------------------------------------------------------
// 4. Build complete group standings + 3rd place ranking
// ---------------------------------------------------------------------------
export function computeGroupStandings(
  matches: MockMatch[],
  predictions: MockPrediction[],
): GroupStandingsResult {
  const groupMatches = matches.filter((m) => m.phase === "grupos");
  const groups = Array.from(new Set(groupMatches.map((m) => m.group!))).sort();

  const result: Record<string, GroupStanding[]> = {};
  const allThird: GroupStanding[] = [];

  for (const g of groups) {
    const gms = groupMatches.filter((m) => m.group === g);
    const raw = getStandingsForGroup(gms, predictions);
    const sorted = sortGroupStandings(raw, gms, predictions);
    result[g] = sorted;

    if (sorted.length >= 3) allThird.push(sorted[2]);
  }

  // Rank 3rd place teams (same tiebreakers but overall, not H2H since they're different groups)
  allThird.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    if (a.gf !== b.gf) return b.gf - a.gf;
    if (a.fairPlay !== b.fairPlay) return b.fairPlay - a.fairPlay;
    return a.fifaRank - b.fifaRank;
  });

  const qualifiedThird = allThird.slice(0, 8);
  const qualifiedLetters = qualifiedThird
    .map((t) => t.group)
    .filter(Boolean)
    .sort();

  return {
    groups: result,
    thirdPlaceRanking: allThird,
    qualifiedThirdLetters: qualifiedLetters,
  };
}

// ---------------------------------------------------------------------------
// 5. FIFA matrix (Annex C) — 495 entries
// ---------------------------------------------------------------------------
const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const WINNERS = ["A", "B", "D", "E", "G", "I", "K", "L"] as const;
type WinnerLetter = (typeof WINNERS)[number];

const FIFA_MATRIX = new Map<string, string>([
  ["EFGHIJKL", "EJIFHGLK"],
  ["DFGHIJKL", "HGIDJFLK"],
  ["DEGHIJKL", "EJIDHGLK"],
  ["DEFHIJKL", "EJIDHFLK"],
  ["DEFGIJKL", "EGIDJFLK"],
  ["DEFGHJKL", "EGJDHFLK"],
  ["DEFGHIKL", "EGIDHFLK"],
  ["DEFGHIJL", "EGJDHFLI"],
  ["DEFGHIJK", "EGJDHFIK"],
  ["CFGHIJKL", "HGICJFLK"],
  ["CEGHIJKL", "EJICHGLK"],
  ["CEFHIJKL", "EJICHFLK"],
  ["CEFGIJKL", "EGICJFLK"],
  ["CEFGHJKL", "EGJCHFLK"],
  ["CEFGHIKL", "EGICHFLK"],
  ["CEFGHIJL", "EGJCHFLI"],
  ["CEFGHIJK", "EGJCHFIK"],
  ["CDGHIJKL", "HGICJDLK"],
  ["CDFHIJKL", "CJIDHFLK"],
  ["CDFGIJKL", "CGIDJFLK"],
  ["CDFGHJKL", "CGJDHFLK"],
  ["CDFGHIKL", "CGIDHFLK"],
  ["CDFGHIJL", "CGJDHFLI"],
  ["CDFGHIJK", "CGJDHFIK"],
  ["CDEHIJKL", "EJICHDLK"],
  ["CDEGIJKL", "EGICJDLK"],
  ["CDEGHJKL", "EGJCHDLK"],
  ["CDEGHIKL", "EGICHDLK"],
  ["CDEGHIJL", "EGJCHDLI"],
  ["CDEGHIJK", "EGJCHDIK"],
  ["CDEFIJKL", "CJEDIFLK"],
  ["CDEFHJKL", "CJEDHFLK"],
  ["CDEFHIKL", "CEIDHFLK"],
  ["CDEFHIJL", "CJEDHFLI"],
  ["CDEFHIJK", "CJEDHFIK"],
  ["CDEFGJKL", "CGEDJFLK"],
  ["CDEFGIKL", "CGEDIFLK"],
  ["CDEFGIJL", "CGEDJFLI"],
  ["CDEFGIJK", "CGEDJFIK"],
  ["CDEFGHKL", "CGEDHFLK"],
  ["CDEFGHJL", "CGJDHFLE"],
  ["CDEFGHJK", "CGJDHFEK"],
  ["CDEFGHIL", "CGEDHFLI"],
  ["CDEFGHIK", "CGEDHFIK"],
  ["CDEFGHIJ", "CGJDHFEI"],
  ["BFGHIJKL", "HJBFIGLK"],
  ["BEGHIJKL", "EJIBHGLK"],
  ["BEFHIJKL", "EJBFIHLK"],
  ["BEFGIJKL", "EJBFIGLK"],
  ["BEFGHJKL", "EJBFHGLK"],
  ["BEFGHIKL", "EGBFIHLK"],
  ["BEFGHIJL", "EJBFHGLI"],
  ["BEFGHIJK", "EJBFHGIK"],
  ["BDGHIJKL", "HJBDIGLK"],
  ["BDFHIJKL", "HJBDIFLK"],
  ["BDFGIJKL", "IGBDJFLK"],
  ["BDFGHJKL", "HGBDJFLK"],
  ["BDFGHIKL", "HGBDIFLK"],
  ["BDFGHIJL", "HGBDJFLI"],
  ["BDFGHIJK", "HGBDJFIK"],
  ["BDEHIJKL", "EJBDIHLK"],
  ["BDEGIJKL", "EJBDIGLK"],
  ["BDEGHJKL", "EJBDHGLK"],
  ["BDEGHIKL", "EGBDIHLK"],
  ["BDEGHIJL", "EJBDHGLI"],
  ["BDEGHIJK", "EJBDHGIK"],
  ["BDEFIJKL", "EJBDIFLK"],
  ["BDEFHJKL", "EJBDHFLK"],
  ["BDEFHIKL", "EIBDHFLK"],
  ["BDEFHIJL", "EJBDHFLI"],
  ["BDEFHIJK", "EJBDHFIK"],
  ["BDEFGJKL", "EGBDJFLK"],
  ["BDEFGIKL", "EGBDIFLK"],
  ["BDEFGIJL", "EGBDJFLI"],
  ["BDEFGIJK", "EGBDJFIK"],
  ["BDEFGHKL", "EGBDHFLK"],
  ["BDEFGHJL", "HGBDJFLE"],
  ["BDEFGHJK", "HGBDJFEK"],
  ["BDEFGHIL", "EGBDHFLI"],
  ["BDEFGHIK", "EGBDHFIK"],
  ["BDEFGHIJ", "HGBDJFEI"],
  ["BCGHIJKL", "HJBCIGLK"],
  ["BCFHIJKL", "HJBCIFLK"],
  ["BCFGIJKL", "IGBCJFLK"],
  ["BCFGHJKL", "HGBCJFLK"],
  ["BCFGHIKL", "HGBCIFLK"],
  ["BCFGHIJL", "HGBCJFLI"],
  ["BCFGHIJK", "HGBCJFIK"],
  ["BCEHIJKL", "EJBCIHLK"],
  ["BCEGIJKL", "EJBCIGLK"],
  ["BCEGHJKL", "EJBCHGLK"],
  ["BCEGHIKL", "EGBCIHLK"],
  ["BCEGHIJL", "EJBCHGLI"],
  ["BCEGHIJK", "EJBCHGIK"],
  ["BCEFIJKL", "EJBCIFLK"],
  ["BCEFHJKL", "EJBCHFLK"],
  ["BCEFHIKL", "EIBCHFLK"],
  ["BCEFHIJL", "EJBCHFLI"],
  ["BCEFHIJK", "EJBCHFIK"],
  ["BCEFGJKL", "EGBCJFLK"],
  ["BCEFGIKL", "EGBCIFLK"],
  ["BCEFGIJL", "EGBCJFLI"],
  ["BCEFGIJK", "EGBCJFIK"],
  ["BCEFGHKL", "EGBCHFLK"],
  ["BCEFGHJL", "HGBCJFLE"],
  ["BCEFGHJK", "HGBCJFEK"],
  ["BCEFGHIL", "EGBCHFLI"],
  ["BCEFGHIK", "EGBCHFIK"],
  ["BCEFGHIJ", "HGBCJFEI"],
  ["BCDHIJKL", "HJBCIDLK"],
  ["BCDGIJKL", "IGBCJDLK"],
  ["BCDGHJKL", "HGBCJDLK"],
  ["BCDGHIKL", "HGBCIDLK"],
  ["BCDGHIJL", "HGBCJDLI"],
  ["BCDGHIJK", "HGBCJDIK"],
  ["BCDFIJKL", "CJBDIFLK"],
  ["BCDFHJKL", "CJBDHFLK"],
  ["BCDFHIKL", "CIBDHFLK"],
  ["BCDFHIJL", "CJBDHFLI"],
  ["BCDFHIJK", "CJBDHFIK"],
  ["BCDFGJKL", "CGBDJFLK"],
  ["BCDFGIKL", "CGBDIFLK"],
  ["BCDFGIJL", "CGBDJFLI"],
  ["BCDFGIJK", "CGBDJFIK"],
  ["BCDFGHKL", "CGBDHFLK"],
  ["BCDFGHJL", "CGBDHFLJ"],
  ["BCDFGHJK", "HGBCJFDK"],
  ["BCDFGHIL", "CGBDHFLI"],
  ["BCDFGHIK", "CGBDHFIK"],
  ["BCDFGHIJ", "HGBCJFDI"],
  ["BCDEIJKL", "EJBCIDLK"],
  ["BCDEHJKL", "EJBCHDLK"],
  ["BCDEHIKL", "EIBCHDLK"],
  ["BCDEHIJL", "EJBCHDLI"],
  ["BCDEHIJK", "EJBCHDIK"],
  ["BCDEGJKL", "EGBCJDLK"],
  ["BCDEGIKL", "EGBCIDLK"],
  ["BCDEGIJL", "EGBCJDLI"],
  ["BCDEGIJK", "EGBCJDIK"],
  ["BCDEGHKL", "EGBCHDLK"],
  ["BCDEGHJL", "HGBCJDLE"],
  ["BCDEGHJK", "HGBCJDEK"],
  ["BCDEGHIL", "EGBCHDLI"],
  ["BCDEGHIK", "EGBCHDIK"],
  ["BCDEGHIJ", "HGBCJDEI"],
  ["BCDEFJKL", "CJBDEFLK"],
  ["BCDEFIKL", "CEBDIFLK"],
  ["BCDEFIJL", "CJBDEFLI"],
  ["BCDEFIJK", "CJBDEFIK"],
  ["BCDEFHKL", "CEBDHFLK"],
  ["BCDEFHJL", "CJBDHFLE"],
  ["BCDEFHJK", "CJBDHFEK"],
  ["BCDEFHIL", "CEBDHFLI"],
  ["BCDEFHIK", "CEBDHFIK"],
  ["BCDEFHIJ", "CJBDHFEI"],
  ["BCDEFGKL", "CGBDEFLK"],
  ["BCDEFGJL", "CGBDJFLE"],
  ["BCDEFGJK", "CGBDJFEK"],
  ["BCDEFGIL", "CGBDEFLI"],
  ["BCDEFGIK", "CGBDEFIK"],
  ["BCDEFGIJ", "CGBDJFEI"],
  ["BCDEFGHL", "CGBDHFLE"],
  ["BCDEFGHK", "CGBDHFEK"],
  ["BCDEFGHJ", "HGBCJFDE"],
  ["BCDEFGHI", "CGBDHFEI"],
  ["AFGHIJKL", "HJIFAGLK"],
  ["AEGHIJKL", "EJIAHGLK"],
  ["AEFHIJKL", "EJIFAHLK"],
  ["AEFGIJKL", "EJIFAGLK"],
  ["AEFGHJKL", "EGJFAHLK"],
  ["AEFGHIKL", "EGIFAHLK"],
  ["AEFGHIJL", "EGJFAHLI"],
  ["AEFGHIJK", "EGJFAHIK"],
  ["ADGHIJKL", "HJIDAGLK"],
  ["ADFHIJKL", "HJIDAFLK"],
  ["ADFGIJKL", "IGJDAFLK"],
  ["ADFGHJKL", "HGJDAFLK"],
  ["ADFGHIKL", "HGIDAFLK"],
  ["ADFGHIJL", "HGJDAFLI"],
  ["ADFGHIJK", "HGJDAFIK"],
  ["ADEHIJKL", "EJIDAHLK"],
  ["ADEGIJKL", "EJIDAGLK"],
  ["ADEGHJKL", "EGJDAHLK"],
  ["ADEGHIKL", "EGIDAHLK"],
  ["ADEGHIJL", "EGJDAHLI"],
  ["ADEGHIJK", "EGJDAHIK"],
  ["ADEFIJKL", "EJIDAFLK"],
  ["ADEFHJKL", "HJEDAFLK"],
  ["ADEFHIKL", "HEIDAFLK"],
  ["ADEFHIJL", "HJEDAFLI"],
  ["ADEFHIJK", "HJEDAFIK"],
  ["ADEFGJKL", "EGJDAFLK"],
  ["ADEFGIKL", "EGIDAFLK"],
  ["ADEFGIJL", "EGJDAFLI"],
  ["ADEFGIJK", "EGJDAFIK"],
  ["ADEFGHKL", "HGEDAFLK"],
  ["ADEFGHJL", "HGJDAFLE"],
  ["ADEFGHJK", "HGJDAFEK"],
  ["ADEFGHIL", "HGEDAFLI"],
  ["ADEFGHIK", "HGEDAFIK"],
  ["ADEFGHIJ", "HGJDAFEI"],
  ["ACGHIJKL", "HJICAGLK"],
  ["ACFHIJKL", "HJICAFLK"],
  ["ACFGIJKL", "IGJCAFLK"],
  ["ACFGHJKL", "HGJCAFLK"],
  ["ACFGHIKL", "HGICAFLK"],
  ["ACFGHIJL", "HGJCAFLI"],
  ["ACFGHIJK", "HGJCAFIK"],
  ["ACEHIJKL", "EJICAHLK"],
  ["ACEGIJKL", "EJICAGLK"],
  ["ACEGHJKL", "EGJCAHLK"],
  ["ACEGHIKL", "EGICAHLK"],
  ["ACEGHIJL", "EGJCAHLI"],
  ["ACEGHIJK", "EGJCAHIK"],
  ["ACEFIJKL", "EJICAFLK"],
  ["ACEFHJKL", "HJECAFLK"],
  ["ACEFHIKL", "HEICAFLK"],
  ["ACEFHIJL", "HJECAFLI"],
  ["ACEFHIJK", "HJECAFIK"],
  ["ACEFGJKL", "EGJCAFLK"],
  ["ACEFGIKL", "EGICAFLK"],
  ["ACEFGIJL", "EGJCAFLI"],
  ["ACEFGIJK", "EGJCAFIK"],
  ["ACEFGHKL", "HGECAFLK"],
  ["ACEFGHJL", "HGJCAFLE"],
  ["ACEFGHJK", "HGJCAFEK"],
  ["ACEFGHIL", "HGECAFLI"],
  ["ACEFGHIK", "HGECAFIK"],
  ["ACEFGHIJ", "HGJCAFEI"],
  ["ACDHIJKL", "HJICADLK"],
  ["ACDGIJKL", "IGJCADLK"],
  ["ACDGHJKL", "HGJCADLK"],
  ["ACDGHIKL", "HGICADLK"],
  ["ACDGHIJL", "HGJCADLI"],
  ["ACDGHIJK", "HGJCADIK"],
  ["ACDFIJKL", "CJIDAFLK"],
  ["ACDFHJKL", "HJFCADLK"],
  ["ACDFHIKL", "HFICADLK"],
  ["ACDFHIJL", "HJFCADLI"],
  ["ACDFHIJK", "HJFCADIK"],
  ["ACDFGJKL", "CGJDAFLK"],
  ["ACDFGIKL", "CGIDAFLK"],
  ["ACDFGIJL", "CGJDAFLI"],
  ["ACDFGIJK", "CGJDAFIK"],
  ["ACDFGHKL", "HGFCADLK"],
  ["ACDFGHJL", "CGJDAFLH"],
  ["ACDFGHJK", "HGJCAFDK"],
  ["ACDFGHIL", "HGFCADLI"],
  ["ACDFGHIK", "HGFCADIK"],
  ["ACDFGHIJ", "HGJCAFDI"],
  ["ACDEIJKL", "EJICADLK"],
  ["ACDEHJKL", "HJECADLK"],
  ["ACDEHIKL", "HEICADLK"],
  ["ACDEHIJL", "HJECADLI"],
  ["ACDEHIJK", "HJECADIK"],
  ["ACDEGJKL", "EGJCADLK"],
  ["ACDEGIKL", "EGICADLK"],
  ["ACDEGIJL", "EGJCADLI"],
  ["ACDEGIJK", "EGJCADIK"],
  ["ACDEGHKL", "HGECADLK"],
  ["ACDEGHJL", "HGJCADLE"],
  ["ACDEGHJK", "HGJCADEK"],
  ["ACDEGHIL", "HGECADLI"],
  ["ACDEGHIK", "HGECADIK"],
  ["ACDEGHIJ", "HGJCADEI"],
  ["ACDEFJKL", "CJEDAFLK"],
  ["ACDEFIKL", "CEIDAFLK"],
  ["ACDEFIJL", "CJEDAFLI"],
  ["ACDEFIJK", "CJEDAFIK"],
  ["ACDEFHKL", "HEFCADLK"],
  ["ACDEFHJL", "HJFCADLE"],
  ["ACDEFHJK", "HJECAFDK"],
  ["ACDEFHIL", "HEFCADLI"],
  ["ACDEFHIK", "HEFCADIK"],
  ["ACDEFHIJ", "HJECAFDI"],
  ["ACDEFGKL", "CGEDAFLK"],
  ["ACDEFGJL", "CGJDAFLE"],
  ["ACDEFGJK", "CGJDAFEK"],
  ["ACDEFGIL", "CGEDAFLI"],
  ["ACDEFGIK", "CGEDAFIK"],
  ["ACDEFGIJ", "CGJDAFEI"],
  ["ACDEFGHL", "HGFCADLE"],
  ["ACDEFGHK", "HGECAFDK"],
  ["ACDEFGHJ", "HGJCAFDE"],
  ["ACDEFGHI", "HGECAFDI"],
  ["ABGHIJKL", "HJBAIGLK"],
  ["ABFHIJKL", "HJBAIFLK"],
  ["ABFGIJKL", "IJBFAGLK"],
  ["ABFGHJKL", "HJBFAGLK"],
  ["ABFGHIKL", "HGBAIFLK"],
  ["ABFGHIJL", "HJBFAGLI"],
  ["ABFGHIJK", "HJBFAGIK"],
  ["ABEHIJKL", "EJBAIHLK"],
  ["ABEGIJKL", "EJBAIGLK"],
  ["ABEGHJKL", "EJBAHGLK"],
  ["ABEGHIKL", "EGBAIHLK"],
  ["ABEGHIJL", "EJBAHGLI"],
  ["ABEGHIJK", "EJBAHGIK"],
  ["ABEFIJKL", "EJBAIFLK"],
  ["ABEFHJKL", "EJBFAHLK"],
  ["ABEFHIKL", "EIBFAHLK"],
  ["ABEFHIJL", "EJBFAHLI"],
  ["ABEFHIJK", "EJBFAHIK"],
  ["ABEFGJKL", "EJBFAGLK"],
  ["ABEFGIKL", "EGBAIFLK"],
  ["ABEFGIJL", "EJBFAGLI"],
  ["ABEFGIJK", "EJBFAGIK"],
  ["ABEFGHKL", "EGBFAHLK"],
  ["ABEFGHJL", "HJBFAGLE"],
  ["ABEFGHJK", "HJBFAGEK"],
  ["ABEFGHIL", "EGBFAHLI"],
  ["ABEFGHIK", "EGBFAHIK"],
  ["ABEFGHIJ", "HJBFAGEI"],
  ["ABDHIJKL", "IJBDAHLK"],
  ["ABDGIJKL", "IJBDAGLK"],
  ["ABDGHJKL", "HJBDAGLK"],
  ["ABDGHIKL", "IGBDAHLK"],
  ["ABDGHIJL", "HJBDAGLI"],
  ["ABDGHIJK", "HJBDAGIK"],
  ["ABDFIJKL", "IJBDAFLK"],
  ["ABDFHJKL", "HJBDAFLK"],
  ["ABDFHIKL", "HIBDAFLK"],
  ["ABDFHIJL", "HJBDAFLI"],
  ["ABDFHIJK", "HJBDAFIK"],
  ["ABDFGJKL", "FJBDAGLK"],
  ["ABDFGIKL", "IGBDAFLK"],
  ["ABDFGIJL", "FJBDAGLI"],
  ["ABDFGIJK", "FJBDAGIK"],
  ["ABDFGHKL", "HGBDAFLK"],
  ["ABDFGHJL", "HGBDAFLJ"],
  ["ABDFGHJK", "HGBDAFJK"],
  ["ABDFGHIL", "HGBDAFLI"],
  ["ABDFGHIK", "HGBDAFIK"],
  ["ABDFGHIJ", "HGBDAFIJ"],
  ["ABDEIJKL", "EJBAIDLK"],
  ["ABDEHJKL", "EJBDAHLK"],
  ["ABDEHIKL", "EIBDAHLK"],
  ["ABDEHIJL", "EJBDAHLI"],
  ["ABDEHIJK", "EJBDAHIK"],
  ["ABDEGJKL", "EJBDAGLK"],
  ["ABDEGIKL", "EGBAIDLK"],
  ["ABDEGIJL", "EJBDAGLI"],
  ["ABDEGIJK", "EJBDAGIK"],
  ["ABDEGHKL", "EGBDAHLK"],
  ["ABDEGHJL", "HJBDAGLE"],
  ["ABDEGHJK", "HJBDAGEK"],
  ["ABDEGHIL", "EGBDAHLI"],
  ["ABDEGHIK", "EGBDAHIK"],
  ["ABDEGHIJ", "HJBDAGEI"],
  ["ABDEFJKL", "EJBDAFLK"],
  ["ABDEFIKL", "EIBDAFLK"],
  ["ABDEFIJL", "EJBDAFLI"],
  ["ABDEFIJK", "EJBDAFIK"],
  ["ABDEFHKL", "HEBDAFLK"],
  ["ABDEFHJL", "HJBDAFLE"],
  ["ABDEFHJK", "HJBDAFEK"],
  ["ABDEFHIL", "HEBDAFLI"],
  ["ABDEFHIK", "HEBDAFIK"],
  ["ABDEFHIJ", "HJBDAFEI"],
  ["ABDEFGKL", "EGBDAFLK"],
  ["ABDEFGJL", "EGBDAFLJ"],
  ["ABDEFGJK", "EGBDAFJK"],
  ["ABDEFGIL", "EGBDAFLI"],
  ["ABDEFGIK", "EGBDAFIK"],
  ["ABDEFGIJ", "EGBDAFIJ"],
  ["ABDEFGHL", "HGBDAFLE"],
  ["ABDEFGHK", "HGBDAFEK"],
  ["ABDEFGHJ", "HGBDAFEJ"],
  ["ABDEFGHI", "HGBDAFEI"],
  ["ABCHIJKL", "IJBCAHLK"],
  ["ABCGIJKL", "IJBCAGLK"],
  ["ABCGHJKL", "HJBCAGLK"],
  ["ABCGHIKL", "IGBCAHLK"],
  ["ABCGHIJL", "HJBCAGLI"],
  ["ABCGHIJK", "HJBCAGIK"],
  ["ABCFIJKL", "IJBCAFLK"],
  ["ABCFHJKL", "HJBCAFLK"],
  ["ABCFHIKL", "HIBCAFLK"],
  ["ABCFHIJL", "HJBCAFLI"],
  ["ABCFHIJK", "HJBCAFIK"],
  ["ABCFGJKL", "CJBFAGLK"],
  ["ABCFGIKL", "IGBCAFLK"],
  ["ABCFGIJL", "CJBFAGLI"],
  ["ABCFGIJK", "CJBFAGIK"],
  ["ABCFGHKL", "HGBCAFLK"],
  ["ABCFGHJL", "HGBCAFLJ"],
  ["ABCFGHJK", "HGBCAFJK"],
  ["ABCFGHIL", "HGBCAFLI"],
  ["ABCFGHIK", "HGBCAFIK"],
  ["ABCFGHIJ", "HGBCAFIJ"],
  ["ABCEIJKL", "EJBAICLK"],
  ["ABCEHJKL", "EJBCAHLK"],
  ["ABCEHIKL", "EIBCAHLK"],
  ["ABCEHIJL", "EJBCAHLI"],
  ["ABCEHIJK", "EJBCAHIK"],
  ["ABCEGJKL", "EJBCAGLK"],
  ["ABCEGIKL", "EGBAICLK"],
  ["ABCEGIJL", "EJBCAGLI"],
  ["ABCEGIJK", "EJBCAGIK"],
  ["ABCEGHKL", "EGBCAHLK"],
  ["ABCEGHJL", "HJBCAGLE"],
  ["ABCEGHJK", "HJBCAGEK"],
  ["ABCEGHIL", "EGBCAHLI"],
  ["ABCEGHIK", "EGBCAHIK"],
  ["ABCEGHIJ", "HJBCAGEI"],
  ["ABCEFJKL", "EJBCAFLK"],
  ["ABCEFIKL", "EIBCAFLK"],
  ["ABCEFIJL", "EJBCAFLI"],
  ["ABCEFIJK", "EJBCAFIK"],
  ["ABCEFHKL", "HEBCAFLK"],
  ["ABCEFHJL", "HJBCAFLE"],
  ["ABCEFHJK", "HJBCAFEK"],
  ["ABCEFHIL", "HEBCAFLI"],
  ["ABCEFHIK", "HEBCAFIK"],
  ["ABCEFHIJ", "HJBCAFEI"],
  ["ABCEFGKL", "EGBCAFLK"],
  ["ABCEFGJL", "EGBCAFLJ"],
  ["ABCEFGJK", "EGBCAFJK"],
  ["ABCEFGIL", "EGBCAFLI"],
  ["ABCEFGIK", "EGBCAFIK"],
  ["ABCEFGIJ", "EGBCAFIJ"],
  ["ABCEFGHL", "HGBCAFLE"],
  ["ABCEFGHK", "HGBCAFEK"],
  ["ABCEFGHJ", "HGBCAFEJ"],
  ["ABCEFGHI", "HGBCAFEI"],
  ["ABCDIJKL", "IJBCADLK"],
  ["ABCDHJKL", "HJBCADLK"],
  ["ABCDHIKL", "HIBCADLK"],
  ["ABCDHIJL", "HJBCADLI"],
  ["ABCDHIJK", "HJBCADIK"],
  ["ABCDGJKL", "CJBDAGLK"],
  ["ABCDGIKL", "IGBCADLK"],
  ["ABCDGIJL", "CJBDAGLI"],
  ["ABCDGIJK", "CJBDAGIK"],
  ["ABCDGHKL", "HGBCADLK"],
  ["ABCDGHJL", "HGBCADLJ"],
  ["ABCDGHJK", "HGBCADJK"],
  ["ABCDGHIL", "HGBCADLI"],
  ["ABCDGHIK", "HGBCADIK"],
  ["ABCDGHIJ", "HGBCADIJ"],
  ["ABCDFJKL", "CJBDAFLK"],
  ["ABCDFIKL", "CIBDAFLK"],
  ["ABCDFIJL", "CJBDAFLI"],
  ["ABCDFIJK", "CJBDAFIK"],
  ["ABCDFHKL", "HFBCADLK"],
  ["ABCDFHJL", "CJBDAFLH"],
  ["ABCDFHJK", "HJBCAFDK"],
  ["ABCDFHIL", "HFBCADLI"],
  ["ABCDFHIK", "HFBCADIK"],
  ["ABCDFHIJ", "HJBCAFDI"],
  ["ABCDFGKL", "CGBDAFLK"],
  ["ABCDFGJL", "CGBDAFLJ"],
  ["ABCDFGJK", "CGBDAFJK"],
  ["ABCDFGIL", "CGBDAFLI"],
  ["ABCDFGIK", "CGBDAFIK"],
  ["ABCDFGIJ", "CGBDAFIJ"],
  ["ABCDFGHL", "CGBDAFLH"],
  ["ABCDFGHK", "HGBCAFDK"],
  ["ABCDFGHJ", "HGBCAFDJ"],
  ["ABCDFGHI", "HGBCAFDI"],
  ["ABCDEJKL", "EJBCADLK"],
  ["ABCDEIKL", "EIBCADLK"],
  ["ABCDEIJL", "EJBCADLI"],
  ["ABCDEIJK", "EJBCADIK"],
  ["ABCDEHKL", "HEBCADLK"],
  ["ABCDEHJL", "HJBCADLE"],
  ["ABCDEHJK", "HJBCADEK"],
  ["ABCDEHIL", "HEBCADLI"],
  ["ABCDEHIK", "HEBCADIK"],
  ["ABCDEHIJ", "HJBCADEI"],
  ["ABCDEGKL", "EGBCADLK"],
  ["ABCDEGJL", "EGBCADLJ"],
  ["ABCDEGJK", "EGBCADJK"],
  ["ABCDEGIL", "EGBCADLI"],
  ["ABCDEGIK", "EGBCADIK"],
  ["ABCDEGIJ", "EGBCADIJ"],
  ["ABCDEGHL", "HGBCADLE"],
  ["ABCDEGHK", "HGBCADEK"],
  ["ABCDEGHJ", "HGBCADEJ"],
  ["ABCDEGHI", "HGBCADEI"],
  ["ABCDEFKL", "CEBDAFLK"],
  ["ABCDEFJL", "CJBDAFLE"],
  ["ABCDEFJK", "CJBDAFEK"],
  ["ABCDEFIL", "CEBDAFLI"],
  ["ABCDEFIK", "CEBDAFIK"],
  ["ABCDEFIJ", "CJBDAFEI"],
  ["ABCDEFHL", "HFBCADLE"],
  ["ABCDEFHK", "HEBCAFDK"],
  ["ABCDEFHJ", "HJBCAFDE"],
  ["ABCDEFHI", "HEBCAFDI"],
  ["ABCDEFGL", "CGBDAFLE"],
  ["ABCDEFGK", "CGBDAFEK"],
  ["ABCDEFGJ", "CGBDAFEJ"],
  ["ABCDEFGI", "CGBDAFEI"],
  ["ABCDEFGH", "HGBCAFDE"],
]);

// ---------------------------------------------------------------------------
// 6. Get matchup for a given 3rd place group letter
// ---------------------------------------------------------------------------
function getThirdPlaceMatchup(key: string, winner: WinnerLetter): string | null {
  const row = FIFA_MATRIX.get(key);
  if (!row) return null;
  const idx = WINNERS.indexOf(winner);
  if (idx === -1) return null;
  return row[idx] ?? null;
}

// ---------------------------------------------------------------------------
// 7. Build Round of 32 matches
// ---------------------------------------------------------------------------
export interface R32Matchup {
  homeType: "1st" | "2nd" | "3rd";
  homeGroup: string;
  awayType: "1st" | "2nd" | "3rd";
  awayGroup: string;
  r32MatchIndex: number; // 0-15
}

export function buildRoundOf32(standings: GroupStandingsResult): R32Matchup[] {
  const { qualifiedThirdLetters } = standings;
  const key = qualifiedThirdLetters.join("");

  const matchups: R32Matchup[] = [];

  // Helper to create a matchup
  const add = (
    hType: R32Matchup["homeType"],
    hG: string,
    aType: R32Matchup["awayType"],
    aG: string,
  ) => {
    matchups.push({
      homeType: hType,
      homeGroup: hG,
      awayType: aType,
      awayGroup: aG,
      r32MatchIndex: matchups.length,
    });
  };

  // --- 2nd vs 2nd (4 matches) ---
  add("2nd", "A", "2nd", "B"); // Match 73
  add("2nd", "D", "2nd", "G"); // Match 88
  add("2nd", "E", "2nd", "I"); // Match 78
  add("2nd", "K", "2nd", "L"); // Match 83

  // --- 1st vs 2nd (4 matches) ---
  add("1st", "C", "2nd", "F"); // Match 76
  add("1st", "F", "2nd", "C"); // Match 75
  add("1st", "H", "2nd", "J"); // Match 84
  add("1st", "J", "2nd", "H"); // Match 86

  // --- 1st vs 3rd (8 matches) ---
  const winnerKeys: WinnerLetter[] = ["A", "B", "D", "E", "G", "I", "K", "L"];
  for (const w of winnerKeys) {
    const thirdGroup = getThirdPlaceMatchup(key, w);
    if (thirdGroup) {
      add("1st", w, "3rd", thirdGroup);
    }
  }

  return matchups;
}

// ---------------------------------------------------------------------------
// 8. Apply matchups to the actual match list
// ---------------------------------------------------------------------------
export function getTeamForSlot(
  groupLetter: string,
  position: "1st" | "2nd" | "3rd",
  standings: GroupStandingsResult,
  allThirdRanked: GroupStanding[],
): { team: string; flag: string } | null {
  const group = groupLetter.toUpperCase();
  const gs = standings.groups[group];
  if (!gs || gs.length < 2) return null;

  if (position === "1st") return { team: gs[0].team, flag: gs[0].flag };
  if (position === "2nd") return { team: gs[1].team, flag: gs[1].flag };

  // 3rd place: find the specific team from this group
  const third = gs[2];
  if (third) return { team: third.team, flag: third.flag };

  return null;
}

// ---------------------------------------------------------------------------
// 9. Propagate winners through knockout bracket
// ---------------------------------------------------------------------------
export function propagateKnockout(
  matches: MockMatch[],
  predictions: MockPrediction[],
): MockMatch[] {
  const next = matches.map((m) => ({ ...m }));

  const propagate = (fromPhase: MatchPhase, toPhase: MatchPhase) => {
    const fromMatches = next.filter((m) => m.phase === fromPhase);
    const toMatches = next.filter((m) => m.phase === toPhase);

    if (toMatches.length === 0) return;

    // Só propaga se TODAS as partidas da fase anterior têm palpites preenchidos
    const allFilled = fromMatches.every((m) => {
      if (m.home_team === "—" || m.away_team === "—") return false;
      const p = predictions.find((x) => x.match_id === m.id);
      return p && p.predicted_home_score !== null && p.predicted_away_score !== null;
    });

    if (!allFilled) return;

    const winners = fromMatches.map((m) => {
      const p = predictions.find((x) => x.match_id === m.id)!;
      return p.predicted_home_score! >= p.predicted_away_score!
        ? { team: m.home_team, flag: m.home_flag }
        : { team: m.away_team, flag: m.away_flag };
    });

    for (let i = 0; i < toMatches.length; i++) {
      const h = winners[i * 2];
      const a = winners[i * 2 + 1];
      if (h) {
        toMatches[i].home_team = h.team;
        toMatches[i].home_flag = h.flag;
      }
      if (a) {
        toMatches[i].away_team = a.team;
        toMatches[i].away_flag = a.flag;
      }
    }
  };

  propagate("r32", "oitavas");
  propagate("oitavas", "quartas");
  propagate("quartas", "semi");
  propagate("semi", "final");

  return next;
}

// ---------------------------------------------------------------------------
// 10. Main entry: compute entire bracket
// ---------------------------------------------------------------------------
export function computeBracket(matches: MockMatch[], predictions: MockPrediction[]): MockMatch[] {
  const standings = computeGroupStandings(matches, predictions);
  const r32Matchups = buildRoundOf32(standings);

  let next = matches.map((m) => ({ ...m }));

  // Check if all group matches have predictions
  const groupMatches = matches.filter((m) => m.phase === "grupos");
  const groupsFilled = groupMatches.every((m) => {
    const p = predictions.find((x) => x.match_id === m.id);
    return p && p.predicted_home_score !== null && p.predicted_away_score !== null;
  });

  if (groupsFilled) {
    const r32Matches = next.filter((m) => m.phase === "r32");

    for (const m of r32Matchups) {
      const homeTeam = getTeamForSlot(
        m.homeGroup,
        m.homeType,
        standings,
        standings.thirdPlaceRanking,
      );
      const awayTeam = getTeamForSlot(
        m.awayGroup,
        m.awayType,
        standings,
        standings.thirdPlaceRanking,
      );
      if (homeTeam && awayTeam && r32Matches[m.r32MatchIndex]) {
        r32Matches[m.r32MatchIndex].home_team = homeTeam.team;
        r32Matches[m.r32MatchIndex].home_flag = homeTeam.flag;
        r32Matches[m.r32MatchIndex].away_team = awayTeam.team;
        r32Matches[m.r32MatchIndex].away_flag = awayTeam.flag;
      }
    }
  }

  // Propagate winners through bracket
  next = propagateKnockout(next, predictions);

  return next;
}

// ---------------------------------------------------------------------------
// Result-based bracket (uses actual match results, not predictions)
// ---------------------------------------------------------------------------

function getStandingsForGroupFromResults(groupMatches: MockMatch[]): GroupStanding[] {
  const teams = new Map<string, GroupStanding>();

  for (const m of groupMatches) {
    if (!teams.has(m.home_team)) {
      teams.set(m.home_team, {
        team: m.home_team,
        flag: m.home_flag,
        group: m.group ?? "",
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
        fairPlay: fairPlayScore(m.home_team),
        fifaRank: FIFA_RANKING[m.home_team] ?? DEFAULT_FIFA_RANK,
      });
    }
    if (!teams.has(m.away_team)) {
      teams.set(m.away_team, {
        team: m.away_team,
        flag: m.away_flag,
        group: m.group ?? "",
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
        fairPlay: fairPlayScore(m.away_team),
        fifaRank: FIFA_RANKING[m.away_team] ?? DEFAULT_FIFA_RANK,
      });
    }

    const hs = m.home_score;
    const as = m.away_score;
    if (hs === null || as === null) continue;

    const home = teams.get(m.home_team)!;
    const away = teams.get(m.away_team)!;
    home.mp++;
    away.mp++;
    home.gf += hs;
    home.ga += as;
    away.gf += as;
    away.ga += hs;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (hs > as) {
      home.w++;
      home.pts += 3;
      away.l++;
    } else if (as > hs) {
      away.w++;
      away.pts += 3;
      home.l++;
    } else {
      home.d++;
      home.pts++;
      away.d++;
      away.pts++;
    }
  }

  return Array.from(teams.values());
}

function computeH2HFromResults(
  tied: GroupStanding[],
  groupMatches: MockMatch[],
): Map<string, H2HStats> {
  const stats = new Map<string, H2HStats>();
  for (const t of tied) stats.set(t.team, { team: t.team, pts: 0, gd: 0, gf: 0 });

  for (const m of groupMatches) {
    if (!stats.has(m.home_team) || !stats.has(m.away_team)) continue;
    const hs = m.home_score;
    const as = m.away_score;
    if (hs === null || as === null) continue;
    const h = stats.get(m.home_team)!;
    const a = stats.get(m.away_team)!;
    h.gf += hs;
    h.gd += hs - as;
    a.gf += as;
    a.gd += as - hs;
    if (hs > as) h.pts += 3;
    else if (as > hs) a.pts += 3;
    else {
      h.pts++;
      a.pts++;
    }
  }
  return stats;
}

function sortGroupStandingsFromResults(
  standings: GroupStanding[],
  groupMatches: MockMatch[],
): GroupStanding[] {
  const sorted = [...standings];
  sorted.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    const tied = standings.filter((s) => s.pts === a.pts);
    if (tied.length >= 2) {
      const h2h = computeH2HFromResults(tied, groupMatches);
      const ha = h2h.get(a.team)!;
      const hb = h2h.get(b.team)!;
      if (ha.pts !== hb.pts) return hb.pts - ha.pts;
      if (ha.gd !== hb.gd) return hb.gd - ha.gd;
      if (ha.gf !== hb.gf) return hb.gf - ha.gf;
    }
    if (a.gd !== b.gd) return b.gd - a.gd;
    if (a.gf !== b.gf) return b.gf - a.gf;
    if (a.fairPlay !== b.fairPlay) return b.fairPlay - a.fairPlay;
    return a.fifaRank - b.fifaRank;
  });
  return sorted;
}

export function computeGroupStandingsFromResults(matches: MockMatch[]): GroupStandingsResult {
  const groupMatches = matches.filter((m) => m.phase === "grupos");
  const groups = Array.from(new Set(groupMatches.map((m) => m.group!))).sort();

  const result: Record<string, GroupStanding[]> = {};
  const allThird: GroupStanding[] = [];

  for (const g of groups) {
    const gms = groupMatches.filter((m) => m.group === g);
    const allPlayed = gms.every((m) => m.home_score !== null && m.away_score !== null);
    if (!allPlayed) continue;
    const raw = getStandingsForGroupFromResults(gms);
    const sorted = sortGroupStandingsFromResults(raw, gms);
    result[g] = sorted;
    if (sorted.length >= 3) allThird.push(sorted[2]);
  }

  allThird.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    if (a.gf !== b.gf) return b.gf - a.gf;
    if (a.fairPlay !== b.fairPlay) return b.fairPlay - a.fairPlay;
    return a.fifaRank - b.fifaRank;
  });

  const qualifiedThird = allThird.slice(0, 8);
  const qualifiedLetters = qualifiedThird
    .map((t) => t.group)
    .filter(Boolean)
    .sort();

  return {
    groups: result,
    thirdPlaceRanking: allThird,
    qualifiedThirdLetters: qualifiedLetters,
  };
}

// Mapeamento oficial FIFA (Match 89-96) — a ordem das oitavas (o0..o7) é
// definida para que o pareamento sequencial quartas (o0×o1, o2×o3, ...)
// produza as quartas de final corretas:
//   q0 (QF-1, Match 97) = o0×o1 = W89×W90 → SF-1
//   q1 (QF-2, Match 98) = o2×o3 = W93×W94 → SF-1
//   q2 (QF-3, Match 99) = o4×o5 = W91×W92 → SF-2
//   q3 (QF-4, Match 100) = o6×o7 = W95×W96 → SF-2
const R32_TO_OITAVAS_PAIRS: [number, number][] = [
  [4, 2],   // o0 (Match 89):  W74 × W77  → 1stC/2ndF × 2ndE/2ndI
  [0, 11],  // o1 (Match 90):  W73 × W75  → 2ndA/2ndB × 1stE/3rd
  [6, 3],   // o2 (Match 93):  W83 × W84  → 1stH/2ndJ × 2ndK/2ndL
  [12, 10], // o3 (Match 94):  W81 × W82  → 1stG/3rd × 1stD/3rd
  [5, 13],  // o4 (Match 91):  W76 × W78  → 1stF/2ndC × 1stI/3rd
  [8, 15],  // o5 (Match 92):  W79 × W80  → 1stA/3rd × 1stL/3rd
  [1, 14],  // o6 (Match 95):  W86 × W88  → 2ndD/2ndG × 1stK/3rd
  [9, 7],   // o7 (Match 96):  W85 × W87  → 1stB/3rd × 1stJ/2ndH
];

export function propagateKnockoutFromResults(matches: MockMatch[]): MockMatch[] {
  const next = matches.map((m) => ({ ...m }));

  const propagate = (
    fromPhase: MatchPhase,
    toPhase: MatchPhase,
    customPairs?: [number, number][],
  ) => {
    const fromMatches = next.filter((m) => m.phase === fromPhase);
    const toMatches = next.filter((m) => m.phase === toPhase);
    if (toMatches.length === 0) return;

    for (let i = 0; i < toMatches.length; i++) {
      const [homeIdx, awayIdx] = customPairs
        ? customPairs[i]
        : [i * 2, i * 2 + 1];

      const homeMatch = fromMatches[homeIdx];
      const awayMatch = fromMatches[awayIdx];

      if (homeMatch && homeMatch.home_score !== null && homeMatch.away_score !== null) {
        const homeWinner = homeMatch.winner
          ? { team: homeMatch.winner, flag: homeMatch.winner_flag ?? homeMatch.home_flag }
          : homeMatch.home_score >= homeMatch.away_score
            ? { team: homeMatch.home_team, flag: homeMatch.home_flag }
            : { team: homeMatch.away_team, flag: homeMatch.away_flag };
        toMatches[i].home_team = homeWinner.team;
        toMatches[i].home_flag = homeWinner.flag;
      }

      if (awayMatch && awayMatch.home_score !== null && awayMatch.away_score !== null) {
        const awayWinner = awayMatch.winner
          ? { team: awayMatch.winner, flag: awayMatch.winner_flag ?? awayMatch.home_flag }
          : awayMatch.home_score >= awayMatch.away_score
            ? { team: awayMatch.home_team, flag: awayMatch.home_flag }
            : { team: awayMatch.away_team, flag: awayMatch.away_flag };
        toMatches[i].away_team = awayWinner.team;
        toMatches[i].away_flag = awayWinner.flag;
      }
    }
  };

  propagate("r32", "oitavas", R32_TO_OITAVAS_PAIRS);
  propagate("oitavas", "quartas");
  propagate("quartas", "semi");
  propagate("semi", "final");

  return next;
}

export function computeBracketFromResults(matches: MockMatch[]): MockMatch[] {
  const next = matches.map((m) => ({ ...m }));

  // Populate R32 progressively — cada grupo que já tem resultado define seus classificados
  const standings = computeGroupStandingsFromResults(next);
  const r32Matchups = buildRoundOf32(standings);
  const r32Matches = next.filter((m) => m.phase === "r32");

  for (const m of r32Matchups) {
    const homeTeam = getTeamForSlot(
      m.homeGroup,
      m.homeType,
      standings,
      standings.thirdPlaceRanking,
    );
    const awayTeam = getTeamForSlot(
      m.awayGroup,
      m.awayType,
      standings,
      standings.thirdPlaceRanking,
    );
    if (homeTeam && awayTeam && r32Matches[m.r32MatchIndex]) {
      r32Matches[m.r32MatchIndex].home_team = homeTeam.team;
      r32Matches[m.r32MatchIndex].home_flag = homeTeam.flag;
      r32Matches[m.r32MatchIndex].away_team = awayTeam.team;
      r32Matches[m.r32MatchIndex].away_flag = awayTeam.flag;
    }
  }

  // Propagate winners through knockout phases from actual results
  return propagateKnockoutFromResults(next);
}
