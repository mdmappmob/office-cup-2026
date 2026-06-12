export interface Database {
  public: {
    Tables: {
      predictions: {
        Row: PredictionRow;
        Insert: Omit<PredictionRow, "id" | "created_at">;
        Update: Partial<Omit<PredictionRow, "id">>;
      };
      members: {
        Row: MemberRow;
        Insert: Omit<MemberRow, "id">;
        Update: Partial<Omit<MemberRow, "id">>;
      };
      matches: {
        Row: MatchRow;
        Insert: Omit<MatchRow, "id">;
        Update: Partial<Omit<MatchRow, "id">>;
      };
    };
  };
}

export interface PredictionRow {
  id: string;
  user_id: string;
  league_id: string;
  match_id: string;
  slot: number;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_goalscorers: string[];
  points_earned: number;
  is_zebra: boolean;
  created_at: string;
}

export interface MemberRow {
  id: string;
  league_id: string;
  user_id: string;
  has_paid_admin: boolean;
  total_points: number;
}

export interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_date: string;
  venue_tz: string | null;
  phase: string;
  group: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  bracket_slot: string | null;
}
