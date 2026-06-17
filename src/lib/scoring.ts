import type { MockMatch, MockPrediction } from "@/mocks/types";
import { analyzeMatch } from "./copilot";

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

  if (analyzeMatch(match, prediction).isZebra) return Math.round(pts * 1.5);
  return pts;
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
    if (tier === "exact") b.exact += pts;
    else if (tier === "winnerWithDiff") b.winnerWithDiff += pts;
    else if (tier === "winnerOnly") b.winnerOnly += pts;
    else if (tier === "correctDraw") b.correctDraw += pts;
    else if (tier === "oneTeamScore") b.oneTeamScore += pts;
    else if (tier === "invertedScore") b.invertedScore += pts;
    if (analyzeMatch(m, p).isZebra) b.zebraMultiplied += Math.round(pts * 0.5);
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

export function breakdownFromPoints(predictions: MockPrediction[], userId: string): ScoreBreakdown {
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
