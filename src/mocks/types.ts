export type MatchPhase = "grupos" | "r32" | "oitavas" | "quartas" | "semi" | "final";
export const PHASE_ORDER: MatchPhase[] = ["grupos", "r32", "oitavas", "quartas", "semi", "final"];
export const PHASE_LABEL: Record<MatchPhase, string> = {
  grupos: "Fase de Grupos",
  r32: "16-avos de Final",
  oitavas: "Oitavas de Final",
  quartas: "Quartas de Final",
  semi: "Semifinais",
  final: "Final",
};

export interface MockProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

export interface MockLeague {
  id: string;
  admin_id: string;
  name: string;
  is_active: boolean;
  payment_status: "paid" | "pending";
}

export interface MockLeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  has_paid_admin: boolean;
  total_points: number;
}

export interface MockMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_date: string;
  phase: MatchPhase;
  group?: string;
  home_score: number | null;
  away_score: number | null;
  status: "scheduled" | "live" | "finished";
  bracket_slot?: string;
}

export interface MockPrediction {
  id: string;
  user_id: string;
  league_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_home_lineup: string[];
  predicted_away_lineup: string[];
  predicted_goalscorers: string[];
  is_zebra: boolean;
  points_earned: number;
}