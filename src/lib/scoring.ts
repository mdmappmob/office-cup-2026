import type { MockMatch, MockPrediction } from "@/mocks/types";

export interface ScoreBreakdown {
  exact: number;
  winnerWithDiff: number;
  winnerOnly: number;
  scorers: number;
  lineup: number;
  zebraMultiplied: number;
  total: number;
}

export function scoreMatch(match: MockMatch, prediction: MockPrediction): number {
  if (
    match.home_score === null ||
    match.away_score === null ||
    prediction.predicted_home_score === null ||
    prediction.predicted_away_score === null
  ) return 0;

  const hs = match.home_score;
  const as = match.away_score;
  const phs = prediction.predicted_home_score;
  const pas = prediction.predicted_away_score;

  let pts = 0;
  if (hs === phs && as === pas) pts = 10;
  else if (Math.sign(hs - as) === Math.sign(phs - pas) && hs - as === phs - pas) pts = 7;
  else if (Math.sign(hs - as) === Math.sign(phs - pas)) pts = 5;

  // artilheiros (3pts cada — mock: não há jogadores reais, contamos os palpitados)
  pts += prediction.predicted_goalscorers.length * 3;

  if (prediction.is_zebra && pts > 0) pts = Math.round(pts * 1.5);

  return pts;
}

export function totalUserPoints(matches: MockMatch[], predictions: MockPrediction[], userId: string) {
  return predictions
    .filter((p) => p.user_id === userId)
    .reduce((sum, p) => {
      const m = matches.find((mm) => mm.id === p.match_id);
      return sum + (m ? scoreMatch(m, p) : 0);
    }, 0);
}

export function userBreakdown(matches: MockMatch[], predictions: MockPrediction[], userId: string): ScoreBreakdown {
  const b: ScoreBreakdown = {
    exact: 0, winnerWithDiff: 0, winnerOnly: 0, scorers: 0, lineup: 0, zebraMultiplied: 0, total: 0,
  };
  for (const p of predictions.filter((x) => x.user_id === userId)) {
    const m = matches.find((mm) => mm.id === p.match_id);
    if (!m || m.home_score === null || m.away_score === null) continue;
    if (p.predicted_home_score === null || p.predicted_away_score === null) continue;
    const hs = m.home_score, as = m.away_score;
    const phs = p.predicted_home_score, pas = p.predicted_away_score;
    if (hs === phs && as === pas) b.exact += 10;
    else if (Math.sign(hs - as) === Math.sign(phs - pas) && hs - as === phs - pas) b.winnerWithDiff += 7;
    else if (Math.sign(hs - as) === Math.sign(phs - pas)) b.winnerOnly += 5;
    b.scorers += p.predicted_goalscorers.length * 3;
    if (p.is_zebra) b.zebraMultiplied += Math.round(scoreMatch(m, p) * 0.5);
  }
  b.total = b.exact + b.winnerWithDiff + b.winnerOnly + b.scorers + b.lineup + b.zebraMultiplied;
  return b;
}