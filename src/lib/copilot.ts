import type { MockMatch, MockPrediction } from "@/mocks/types";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface CopilotAnalysis {
  verdict: string;
  probability: number;
  isZebra: boolean;
  reasoning: string[];
}

export function analyzeMatch(match: MockMatch, prediction: MockPrediction | undefined): CopilotAnalysis {
  const seed = hashStr(match.id + (prediction?.id ?? ""));
  const winProb = 40 + (seed % 50);

  const phs = prediction?.predicted_home_score ?? 0;
  const pas = prediction?.predicted_away_score ?? 0;
  const goalDiff = Math.abs(phs - pas);

  // Considera zebra se palpite contraria favorito (heurística: time "menor" ganhando por 2+)
  const favoritesMap: Record<string, number> = {
    Brasil: 90, Argentina: 88, França: 87, Espanha: 85, Inglaterra: 84, Portugal: 82,
    Alemanha: 81, Holanda: 80, Itália: 79, Bélgica: 76, Uruguai: 75, Croácia: 74,
    Marrocos: 65, Japão: 64, México: 63, EUA: 62, Senegal: 60, Coreia: 58, Nigéria: 58,
    Suíça: 60, Camarões: 55, Colômbia: 70, Equador: 55, Canadá: 52,
  };
  const homeRank = favoritesMap[match.home_team] ?? 60;
  const awayRank = favoritesMap[match.away_team] ?? 60;
  const predictedWinner = phs > pas ? match.home_team : pas > phs ? match.away_team : null;
  const favorite = homeRank >= awayRank ? match.home_team : match.away_team;
  const isUpset = predictedWinner !== null && predictedWinner !== favorite && goalDiff >= 1;

  const reasoning: string[] = [
    `Histórico recente favorece ${favorite} (${Math.max(homeRank, awayRank)}% de força no ranking IA).`,
    `Probabilidade do seu placar (${phs}-${pas}) é estimada em ${winProb}%.`,
    isUpset
      ? `Seu palpite quebra a lógica do favoritismo — característica clássica de zebra.`
      : `Palpite alinhado ao favoritismo do jogo.`,
  ];

  return {
    verdict: isUpset ? "ZEBRA DETECTADA" : "Palpite dentro do padrão",
    probability: winProb,
    isZebra: isUpset,
    reasoning,
  };
}