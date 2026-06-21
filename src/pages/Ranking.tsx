import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase/client";
import { PHASE_LABEL, PHASE_ORDER, type MatchPhase } from "@/mocks/types";
import { PHASE_MULTIPLIER } from "@/lib/scoring";
import { Trophy, Swords, Shield, Medal, Star, Crown, TrendingUp } from "lucide-react";

const PHASE_ICON: Record<MatchPhase, React.ReactNode> = {
  grupos: <Trophy className="size-4" />,
  r32: <Swords className="size-4" />,
  oitavas: <Shield className="size-4" />,
  quartas: <Medal className="size-4" />,
  semi: <Star className="size-4" />,
  final: <Crown className="size-4" />,
};

function memberPointsInPhase(
  userId: string,
  phase: MatchPhase,
  predictions: ReturnType<typeof useAppStore.getState>["predictions"],
  matches: ReturnType<typeof useAppStore.getState>["matches"],
): number {
  const phaseMatchIds = new Set(matches.filter((m) => m.phase === phase).map((m) => m.id));
  return predictions
    .filter((p) => p.user_id === userId && phaseMatchIds.has(p.match_id))
    .reduce((sum, p) => sum + (p.points_earned ?? 0), 0);
}

export function RankingPage() {
  const authUser = useAuthStore((s) => s.user);
  const members = useAppStore((s) => s.members);
  const predictions = useAppStore((s) => s.predictions);
  const matches = useAppStore((s) => s.matches);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const profiles = useAppStore((s) => s.profiles);
  const loadFromSupabase = useAppStore((s) => s.loadFromSupabase);

  const sorted = useMemo(
    () => [...members].sort((a, b) => b.total_points - a.total_points),
    [members],
  );

  const [leagueName, setLeagueName] = useState("");
  const [tab, setTab] = useState("geral");
  const [phaseTab, setPhaseTab] = useState<MatchPhase>("grupos");

  useEffect(() => {
    supabase
      .from("leagues")
      .select("name")
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setLeagueName(data[0].name);
      })
      .catch(() => {});
    loadFromSupabase();
  }, []);

  const phaseRankings = useMemo(() => {
    const result: Record<MatchPhase, Array<{ user_id: string; points: number }>> = {
      grupos: [],
      r32: [],
      oitavas: [],
      quartas: [],
      semi: [],
      final: [],
    };
    for (const phase of PHASE_ORDER) {
      const phaseMembers = sorted.map((m) => ({
        user_id: m.user_id,
        points: memberPointsInPhase(m.user_id, phase, predictions, matches),
      }));
      result[phase] = phaseMembers.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const nameA = profiles[a.user_id] ?? "";
        const nameB = profiles[b.user_id] ?? "";
        return nameA.localeCompare(nameB);
      });
    }
    return result;
  }, [predictions, matches, sorted, profiles]);

  const cumulativeEarned = useMemo(() => {
    const totals: Record<string, number> = {};
    const result: Record<MatchPhase, Record<string, number>> = {
      grupos: {},
      r32: {},
      oitavas: {},
      quartas: {},
      semi: {},
      final: {},
    };
    for (const phase of PHASE_ORDER) {
      const phaseMatchIds = new Set(matches.filter((m) => m.phase === phase).map((m) => m.id));
      for (const m of members) {
        const phasePts = predictions
          .filter((p) => p.user_id === m.user_id && phaseMatchIds.has(p.match_id))
          .reduce((sum, p) => sum + (p.points_earned ?? 0), 0);
        totals[m.user_id] = (totals[m.user_id] ?? 0) + phasePts;
        if (!result[phase]) result[phase] = {};
        result[phase][m.user_id] = totals[m.user_id];
      }
    }
    return result;
  }, [members, predictions, matches]);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter">Classificação</h1>
        <p className="text-sm text-muted-foreground">Classificação dos participantes do bolão.</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="geral">
            <Trophy className="size-3.5 mr-1.5" />
            Classificação Geral
          </TabsTrigger>
          <TabsTrigger value="fase">
            <TrendingUp className="size-3.5 mr-1.5" />
            Por Fase
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
                {leagueName || "Bolão da Diretoria 2026"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 font-mono text-[10px] uppercase tracking-widest">
                      Pos
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                      Membro
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                      Status
                    </TableHead>
                    <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest">
                      Pontos
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((m, idx) => {
                    const isMe = m.user_id === currentUserId || m.user_id === authUser?.id;
                    const name =
                      profiles[m.user_id] ?? (isMe ? authUser?.full_name : "Usuário local");
                    return (
                      <TableRow key={m.id} className={isMe ? "bg-primary/5" : ""}>
                        <TableCell className="font-mono">
                          {String(idx + 1).padStart(2, "0")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                              {name
                                ?.split(" ")
                                .map((x) => x[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <span className={isMe ? "font-bold text-primary" : "font-semibold"}>
                              {name}
                              {isMe && " (você)"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.has_paid_admin ? (
                            <Badge className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/15">
                              PAGO
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-dashed text-muted-foreground"
                            >
                              PENDENTE
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {m.total_points}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fase">
          <Tabs value={phaseTab} onValueChange={(v) => setPhaseTab(v as MatchPhase)}>
            <div className="flex items-center gap-4 mb-6">
              <TabsList>
                {PHASE_ORDER.map((phase) => (
                  <TabsTrigger key={phase} value={phase}>
                    <span className="mr-1.5">{PHASE_ICON[phase]}</span>
                    {PHASE_LABEL[phase]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {PHASE_ORDER.map((phase) => {
              const rankings = phaseRankings[phase];
              const mult = PHASE_MULTIPLIER[phase];
              return (
                <TabsContent key={phase} value={phase}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          {PHASE_ICON[phase]}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold">{PHASE_LABEL[phase]}</CardTitle>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                            Pontuação multiplicada por{" "}
                            <strong className="text-primary">×{mult}</strong>
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 font-mono text-[10px] uppercase tracking-widest">
                              Pos
                            </TableHead>
                            <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                              Membro
                            </TableHead>
                            <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest">
                              Pontos na Fase
                            </TableHead>
                            <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                              Acumulado
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rankings.map((r, idx) => {
                            const isMe = r.user_id === currentUserId || r.user_id === authUser?.id;
                            const name = profiles[r.user_id] ?? "Usuário local";
                            const cum = cumulativeEarned[phase]?.[r.user_id] ?? 0;
                            return (
                              <TableRow key={r.user_id} className={isMe ? "bg-primary/5" : ""}>
                                <TableCell className="font-mono text-muted-foreground">
                                  {String(idx + 1).padStart(2, "0")}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                      {name
                                        .split(" ")
                                        .map((x) => x[0])
                                        .slice(0, 2)
                                        .join("")}
                                    </div>
                                    <span
                                      className={isMe ? "font-bold text-primary" : "font-semibold"}
                                    >
                                      {name}
                                      {isMe && " (você)"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                  {r.points}
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                  {cum}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
