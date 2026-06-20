import type { MockMatch, MockPrediction, MatchPhase } from "@/mocks/types";
import { analyzeMatch } from "./copilot";
import { PHASE_ORDER } from "@/mocks/types";

export const PHASE_MULTIPLIER: Record<MatchPhase, number> = {
  grupos: 1,
  r32: 2,
  oitavas: 3,
  quartas: 4,
  semi: 5,
  final: 6,
};

export interface ScoreBreakdown {
  exact: number;
  winnerWithDiff: number;
  winnerOnly: number;
  correctDraw: number;
  oneTeamScore: number;
  invertedScore: number;
  zebraMultiplied: number;
  total: number;
}

function computeBasePoints(
  hs: number,
  as: number,
  phs: number,
  pas: number,
): { tier: string; pts: number } {
  if (hs === phs && as === pas) return { tier: "exact", pts: 10 };

  const realSign = Math.sign(hs - as);
  const predSign = Math.sign(phs - pas);

  if (realSign === predSign && realSign !== 0) {
    if (hs - as === phs - pas) return { tier: "winnerWithDiff", pts: 7 };
    return { tier: "winnerOnly", pts: 5 };
  }

  if (realSign === 0 && predSign === 0) return { tier: "correctDraw", pts: 3 };

  if (hs === phs || as === pas) return { tier: "oneTeamScore", pts: 2 };

  if (hs === pas && as === phs) return { tier: "invertedScore", pts: 1 };

  return { tier: "none", pts: 0 };
}

export function scoreMatch(match: MockMatch, prediction: MockPrediction): number {
  if (
    match.home_score === null ||
    match.away_score === null ||
    prediction.predicted_home_score === null ||
    prediction.predicted_away_score === null
  )
    return 0;

  const hs = match.home_score;
  const as = match.away_score;
  const phs = prediction.predicted_home_score;
  const pas = prediction.predicted_away_score;

  const { pts } = computeBasePoints(hs, as, phs, pas);
  if (pts === 0) return 0;

  const multiplier = PHASE_MULTIPLIER[match.phase] ?? 1;
  const multiplied = pts * multiplier;

  if (analyzeMatch(match, prediction).isZebra) return Math.round(multiplied * 1.5);
  return multiplied;
}

export function totalUserPoints(
  _matches: MockMatch[],
  predictions: MockPrediction[],
  userId: string,
) {
  return predictions
    .filter((p) => p.user_id === userId)
    .reduce((sum, p) => sum + (p.points_earned ?? 0), 0);
}

export function userBreakdown(
  matches: MockMatch[],
  predictions: MockPrediction[],
  userId: string,
): ScoreBreakdown {
  const b: ScoreBreakdown = {
    exact: 0,
    winnerWithDiff: 0,
    winnerOnly: 0,
    correctDraw: 0,
    oneTeamScore: 0,
    invertedScore: 0,
    zebraMultiplied: 0,
    total: 0,
  };
  for (const p of predictions.filter((x) => x.user_id === userId)) {
    const m = matches.find((mm) => mm.id === p.match_id);
    if (!m || m.home_score === null || m.away_score === null) continue;
    if (p.predicted_home_score === null || p.predicted_away_score === null) continue;
    const hs = m.home_score,
      as = m.away_score;
    const phs = p.predicted_home_score,
      pas = p.predicted_away_score;
    const { tier, pts } = computeBasePoints(hs, as, phs, pas);
    if (pts === 0) continue;
    const multiplier = PHASE_MULTIPLIER[m.phase] ?? 1;
    const finalPts = pts * multiplier;
    const isZebra = analyzeMatch(m, p).isZebra;
    if (tier === "exact") b.exact += finalPts;
    else if (tier === "winnerWithDiff") b.winnerWithDiff += finalPts;
    else if (tier === "winnerOnly") b.winnerOnly += finalPts;
    else if (tier === "correctDraw") b.correctDraw += finalPts;
    else if (tier === "oneTeamScore") b.oneTeamScore += finalPts;
    else if (tier === "invertedScore") b.invertedScore += finalPts;
    if (isZebra) b.zebraMultiplied += Math.round(finalPts * 0.5);
  }
  b.total =
    b.exact +
    b.winnerWithDiff +
    b.winnerOnly +
    b.correctDraw +
    b.oneTeamScore +
    b.invertedScore +
    b.zebraMultiplied;
  return b;
}

export function breakdownFromPoints(
  predictions: MockPrediction[],
  userId: string,
  matches?: MockMatch[],
): ScoreBreakdown {
  const b: ScoreBreakdown = {
    exact: 0,
    winnerWithDiff: 0,
    winnerOnly: 0,
    correctDraw: 0,
    oneTeamScore: 0,
    invertedScore: 0,
    zebraMultiplied: 0,
    total: 0,
  };

  for (const p of predictions.filter((x) => x.user_id === userId)) {
    const pts = p.points_earned;
    if (pts <= 0) continue;

    // If matches available, use computeBasePoints for accurate tier detection
    if (matches) {
      const m = matches.find((mm) => mm.id === p.match_id);
      if (
        m &&
        m.home_score != null &&
        m.away_score != null &&
        p.predicted_home_score != null &&
        p.predicted_away_score != null
      ) {
        const { tier, pts: base } = computeBasePoints(
          m.home_score,
          m.away_score,
          p.predicted_home_score,
          p.predicted_away_score,
        );
        if (base === 0) continue;
        const multiplier = PHASE_MULTIPLIER[m.phase] ?? 1;
        const finalBase = base * multiplier;
        switch (tier) {
          case "exact":
            b.exact += finalBase;
            break;
          case "winnerWithDiff":
            b.winnerWithDiff += finalBase;
            break;
          case "winnerOnly":
            b.winnerOnly += finalBase;
            break;
          case "correctDraw":
            b.correctDraw += finalBase;
            break;
          case "oneTeamScore":
            b.oneTeamScore += finalBase;
            break;
          case "invertedScore":
            b.invertedScore += finalBase;
            break;
        }
        if (p.is_zebra) b.zebraMultiplied += Math.round(finalBase * 0.5);
        continue;
      }
    }

    // Fallback: derive from points_earned (works for grupos ×1 only)
    if (p.is_zebra) {
      let base = 0;
      if (pts === 15) {
        base = 10;
        b.exact += base;
      } else if (pts === 11) {
        base = 7;
        b.winnerWithDiff += base;
      } else if (pts === 8) {
        base = 5;
        b.winnerOnly += base;
      } else if (pts === 5) {
        base = 3;
        b.correctDraw += base;
      } else if (pts === 3) {
        base = 2;
        b.oneTeamScore += base;
      } else if (pts === 2) {
        base = 1;
        b.invertedScore += base;
      } else continue;
      b.zebraMultiplied += pts - base;
    } else {
      if (pts === 10) b.exact += pts;
      else if (pts === 7) b.winnerWithDiff += pts;
      else if (pts === 5) b.winnerOnly += pts;
      else if (pts === 3) b.correctDraw += pts;
      else if (pts === 2) b.oneTeamScore += pts;
      else if (pts === 1) b.invertedScore += pts;
    }
  }

  b.total =
    b.exact +
    b.winnerWithDiff +
    b.winnerOnly +
    b.correctDraw +
    b.oneTeamScore +
    b.invertedScore +
    b.zebraMultiplied;
  return b;
}

export function pointsByPhase(
  predictions: MockPrediction[],
  matches: MockMatch[],
  userId: string,
): Record<MatchPhase, number> {
  const result: Record<string, number> = {};
  for (const phase of PHASE_ORDER) result[phase] = 0;
  for (const p of predictions.filter((x) => x.user_id === userId)) {
    const m = matches.find((mm) => mm.id === p.match_id);
    if (!m) continue;
    result[m.phase] = (result[m.phase] ?? 0) + (p.points_earned ?? 0);
  }
  return result as Record<MatchPhase, number>;
}
