import type { MockLeague, MockLeagueMember } from "./types";

export const mockLeagues: MockLeague[] = [
  {
    id: "l1",
    admin_id: "u1",
    name: "Bolão da Diretoria 2026",
    is_active: true,
    payment_status: "paid",
  },
];

export const CURRENT_LEAGUE_ID = "l1";

export const mockLeagueMembers: MockLeagueMember[] = [
  { id: "m1", league_id: "l1", user_id: "u1", has_paid_admin: true, total_points: 482 },
  { id: "m2", league_id: "l1", user_id: "u2", has_paid_admin: true, total_points: 540 },
  { id: "m3", league_id: "l1", user_id: "u3", has_paid_admin: true, total_points: 525 },
  { id: "m4", league_id: "l1", user_id: "u4", has_paid_admin: true, total_points: 460 },
  { id: "m5", league_id: "l1", user_id: "u5", has_paid_admin: true, total_points: 415 },
  { id: "m6", league_id: "l1", user_id: "u6", has_paid_admin: false, total_points: 0 },
  { id: "m7", league_id: "l1", user_id: "u7", has_paid_admin: true, total_points: 380 },
  { id: "m8", league_id: "l1", user_id: "u8", has_paid_admin: false, total_points: 0 },
];
