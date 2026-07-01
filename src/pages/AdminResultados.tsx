import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { predictionsRepo } from "@/lib/db";
import { useShallow } from "zustand/react/shallow";
import { PHASE_LABEL, PHASE_ORDER, type MatchPhase, type MockMatch } from "@/mocks/types";
import { fmtTime, fmtDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/Flag";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncFootballData } from "@/lib/results-sync.server";
import { API_TEAM_MAP } from "@/lib/results-sync";

const USER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function resolveMatch(matches: MockMatch[], apiHome: string, apiAway: string) {
  const searchPairs = [
    [API_TEAM_MAP[apiHome] ?? apiHome, API_TEAM_MAP[apiAway] ?? apiAway],
    [apiHome, apiAway],
    [API_TEAM_MAP[apiAway] ?? apiAway, API_TEAM_MAP[apiHome] ?? apiHome],
    [apiAway, apiHome],
  ];
  for (const [homeName, awayName] of searchPairs) {
    const m = matches.find((m) => m.home_team === homeName && m.away_team === awayName);
    if (m) return m;
  }
  const nHome = normalize(apiHome);
  const nAway = normalize(apiAway);
  for (const m of matches) {
    if (normalize(m.home_team) === nHome && normalize(m.away_team) === nAway) return m;
    if (normalize(m.home_team) === nAway && normalize(m.away_team) === nHome) return m;
  }
  for (const m of matches) {
    if (
      (normalize(m.home_team).includes(nHome) || nHome.includes(normalize(m.home_team))) &&
      (normalize(m.away_team).includes(nAway) || nAway.includes(normalize(m.away_team)))
    )
      return m;
    if (
      (normalize(m.home_team).includes(nAway) || nAway.includes(normalize(m.home_team))) &&
      (normalize(m.away_team).includes(nHome) || nHome.includes(normalize(m.away_team)))
    )
      return m;
  }
  return null;
}

export function AdminResultadosPage() {
  return <Body />;
}

function Body() {
  const matches = useAppStore((s) => s.matches);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const [phase, setPhase] = useState<MatchPhase>("grupos");
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { ok, results, error } = await syncFootballData();
      if (!ok) {
        toast.error("Falha na sincronização", { description: error });
        return;
      }
      let applied = 0;
      let skipped = 0;
      let skippedExtraTime = 0;
      const notFound: string[] = [];
      for (const r of results) {
        if (r.status !== "finished" || r.homeScore === null || r.awayScore === null) continue;
        const currentMatches = useAppStore.getState().matches;
        const match = resolveMatch(currentMatches, r.homeTeam, r.awayTeam);
        if (match) {
          // Skip matches already manually settled by admin for extra time/penalties
          // (winner field is only set when admin manually selects who advanced)
          if (match.status === "finished" && match.winner) {
            skippedExtraTime++;
            continue;
          }
          // Skip matches that went beyond regular time — API retorna placar
          // com prorrogação, mas só o tempo regular vale para pontuação
          if (r.wentToExtraTime) {
            skippedExtraTime++;
            continue;
          }
          const needsUpdate =
            match.home_score === null ||
            match.away_score === null ||
            match.home_score !== r.homeScore ||
            match.away_score !== r.awayScore;
          if (needsUpdate) {
            const isCorrection = match.home_score !== null && match.away_score !== null;
            const res = await predictionsRepo.settleMatch(match.id, r.homeScore, r.awayScore);
            if (!res.ok) {
              toast.error(`Falha ao registrar ${r.homeTeam}×${r.awayTeam}`, {
                description: res.error,
              });
            }
            if (isCorrection) {
              console.info(
                `Sync: resultado corrigido ${match.home_team} ${match.home_score}×${match.away_score} → ${r.homeScore}×${r.awayScore}`,
              );
            }
            applied++;
          } else {
            skipped++;
          }
        } else {
          notFound.push(`${r.homeTeam} × ${r.awayTeam}`);
        }
      }
      if (notFound.length > 0) {
        console.warn("Sync: partidas não encontradas", notFound);
        const finishedCount = results.filter(
          (r) => r.status === "finished" && r.homeScore !== null,
        ).length;
        const msg =
          notFound.length === finishedCount
            ? `Nenhuma das ${finishedCount} partidas finalizadas retornadas pela API correspondeu aos times locais.`
            : `${notFound.length} de ${finishedCount} resultado(s) retornados pela API não corresponderam: ${notFound.slice(0, 5).join(", ")}`;
        toast.warning("Partidas não encontradas", {
          description: msg,
          duration: 8000,
        });
      }
      if (applied > 0) {
        useAppStore.getState().regenerateBracket();
      }
      if (skippedExtraTime > 0) {
        toast.warning(
          `${skippedExtraTime} partida(s) ignorada(s) — foram além do tempo regular (prorrogação/pênaltis). Lance o resultado do tempo regular manualmente em "Apuração".`,
          { duration: 8000 },
        );
      }
      toast.success(
        [
          applied,
          "resultado(s) aplicado(s)",
          skipped > 0 ? `, ${skipped} já encerrado(s)` : "",
        ].join(""),
      );
    } finally {
      setSyncing(false);
    }
  };
  const phaseMatches = useMemo(() => {
    const filtered = matches.filter((m) => m.phase === phase);
    if (phase !== "grupos") {
      return filtered.slice().sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
    }
    return filtered;
  }, [matches, phase]);

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">Apuração de Resultados</h1>
          <p className="text-sm text-muted-foreground">
            Lance o placar oficial de cada partida. A pontuação dos palpites é recalculada
            automaticamente.
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={handleSync}
            className="shrink-0"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando…" : "Sincronizar resultados"}
          </Button>
        )}
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {PHASE_ORDER.map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest border ${
              phase === p
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border"
            }`}
          >
            {PHASE_LABEL[p]}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            {PHASE_LABEL[phase]} · {phaseMatches.length} jogos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                  Data
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-right">
                  Mandante
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-center">
                  Resultado
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                  Visitante
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-center">
                  Status
                </TableHead>
                {isAdmin && (
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest text-right">
                    Ação
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {phaseMatches.map((m) => (
                <ResultRow key={m.id} matchId={m.id} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StatsSummary />
    </div>
  );
}

const KNOCKOUT_PHASES = new Set(["r32", "oitavas", "quartas", "semi", "final"]);

function autoWinner(
  homeTeam: string,
  awayTeam: string,
  homeFlag: string,
  awayFlag: string,
  eh: number | null,
  ea: number | null,
  h: number,
  a: number,
): { winner: string | undefined; winnerFlag: string | undefined } {
  if (eh !== null && ea !== null && eh !== ea) {
    return eh > ea
      ? { winner: homeTeam, winnerFlag: homeFlag }
      : { winner: awayTeam, winnerFlag: awayFlag };
  }
  if (h !== a) {
    return h > a
      ? { winner: homeTeam, winnerFlag: homeFlag }
      : { winner: awayTeam, winnerFlag: awayFlag };
  }
  return { winner: undefined, winnerFlag: undefined };
}

function ResultRow({ matchId }: { matchId: string }) {
  const match = useAppStore((s) => s.matches.find((m) => m.id === matchId)!);
  const predictions = useAppStore(
    useShallow((s) => s.predictions.filter((p) => p.match_id === matchId)),
  );
  const isAdmin = useAppStore((s) => s.isAdmin);
  const [hs, setHs] = useState<string>(match.home_score?.toString() ?? "");
  const [as, setAs] = useState<string>(match.away_score?.toString() ?? "");
  const [ehs, setEhs] = useState<string>(match.extra_home_score?.toString() ?? "");
  const [eas, setEas] = useState<string>(match.extra_away_score?.toString() ?? "");
  const tbd = match.home_team === "—" || match.away_team === "—";
  const finished = match.status === "finished";
  const isKnockout = KNOCKOUT_PHASES.has(match.phase);
  const hNum = Number(hs);
  const aNum = Number(as);
  const ehNum = Number(ehs);
  const eaNum = Number(eas);
  const eh = ehs !== "" ? ehNum : null;
  const ea = eas !== "" ? eaNum : null;
  const { winner, winnerFlag } = autoWinner(match.home_team, match.away_team, match.home_flag, match.away_flag, eh, ea, hNum, aNum);

  useEffect(() => {
    setHs(match.home_score?.toString() ?? "");
    setAs(match.away_score?.toString() ?? "");
    setEhs(match.extra_home_score?.toString() ?? "");
    setEas(match.extra_away_score?.toString() ?? "");
  }, [match.home_score, match.away_score, match.extra_home_score, match.extra_away_score]);

  const handleSettle = async () => {
    const h = Number(hs);
    const a = Number(as);
    if (Number.isNaN(h) || Number.isNaN(a) || hs === "" || as === "") {
      toast.error("Informe os dois placares do tempo regular.");
      return;
    }
    if (isKnockout && !winner) {
      toast.error("Informe os placares da prorrogação/pênaltis.");
      return;
    }
    const prevPhase = match.phase;
    const result = await predictionsRepo.settleMatch(matchId, h, a, eh, ea, winner, winnerFlag);
    if (result.ok) {
      const st = useAppStore.getState();
      const phaseCompleted = st.isPhaseFullySettled(prevPhase);
      if (phaseCompleted) {
        const nextIdx = PHASE_ORDER.indexOf(prevPhase) + 1;
        const nextLabel = nextIdx < PHASE_ORDER.length ? PHASE_LABEL[PHASE_ORDER[nextIdx]] : null;
        toast.success(
          `${PHASE_LABEL[prevPhase]} encerrada!${nextLabel ? ` ${nextLabel} liberada com chaveamento real.` : " Bolão encerrado!"}`,
          { duration: 6000 },
        );
      } else {
        toast.success(`Resultado registrado · ${predictions.length} palpites apurados.`);
      }
    } else {
      toast.error(`Erro ao sincronizar: ${result.error}`);
    }
  };

  return (
    <TableRow className={finished ? "bg-accent/5" : ""}>
      <TableCell className="font-mono text-[10px] text-muted-foreground leading-tight">
        <div>
          {fmtTime(match.match_date, match.venue_tz ?? "America/New_York")}
          <span className="text-[9px] text-muted-foreground/50 ml-1">sede</span>
        </div>
        <div>
          {fmtTime(match.match_date, USER_TZ)}
          <span className="text-[9px] text-muted-foreground/50 ml-1">local</span>
        </div>
        <div className="text-[9px] text-muted-foreground/40">
          {fmtDate(match.match_date, USER_TZ)}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center gap-2 justify-end">
          <span className="font-semibold text-sm">{match.home_team}</span>
          <Flag team={match.home_team} iso={match.home_flag} size={16} />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-center gap-1">
          {/* Tempo Regular — usado para pontuação */}
          <div className="flex items-center gap-1 justify-center">
            <span className="text-[9px] font-mono text-muted-foreground/60 mr-0.5">T.R.</span>
            <Input
              type="number"
              min={0}
              disabled={!isAdmin || tbd}
              className="w-11 h-8 text-center font-mono text-sm font-bold p-0"
              value={hs}
              onChange={(e) => setHs(e.target.value)}
            />
            <span className="text-muted-foreground font-mono text-sm">×</span>
            <Input
              type="number"
              min={0}
              disabled={!isAdmin || tbd}
              className="w-11 h-8 text-center font-mono text-sm font-bold p-0"
              value={as}
              onChange={(e) => setAs(e.target.value)}
            />
          </div>
          {/* Prorrogação/Pênaltis — define quem avança */}
          {isKnockout && (
            <div className="flex flex-col items-center gap-0.5 mt-0.5">
              <div className="flex items-center gap-1 justify-center">
                <span className="text-[9px] font-mono text-muted-foreground/60 mr-0.5">P.R.</span>
                <span className="text-xs font-semibold">{match.home_team}</span>
                <Input
                  type="number"
                  min={0}
                  disabled={!isAdmin || tbd}
                  className="w-11 h-8 text-center font-mono text-sm font-bold p-0"
                  value={ehs}
                  onChange={(e) => setEhs(e.target.value)}
                />
                <span className="text-muted-foreground font-mono text-xs">×</span>
                <Input
                  type="number"
                  min={0}
                  disabled={!isAdmin || tbd}
                  className="w-11 h-8 text-center font-mono text-sm font-bold p-0"
                  value={eas}
                  onChange={(e) => setEas(e.target.value)}
                />
                <span className="text-xs font-semibold">{match.away_team}</span>
              </div>
              {winner && (
                <div className="text-[10px] font-mono text-accent font-bold">
                  Avançou: {winner}
                </div>
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Flag team={match.away_team} iso={match.away_flag} size={16} />
          <span className="font-semibold text-sm">{match.away_team}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {finished ? (
          <Badge className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/15 font-mono text-[10px]">
            <CheckCircle2 className="size-3 mr-1" /> ENCERRADO
          </Badge>
        ) : (
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            agendado
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isAdmin && (
          <Button
            size="sm"
            variant={finished ? "outline" : "default"}
            disabled={tbd || (isKnockout && !winner)}
            onClick={handleSettle}
          >
            {finished ? "Reapurar" : "Encerrar partida"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function StatsSummary() {
  const predictions = useAppStore((s) => s.predictions);
  const matches = useAppStore((s) => s.matches);
  const members = useAppStore((s) => s.members);

  const finishedCount = matches.filter((m) => m.status === "finished").length;
  const scoredPreds = predictions.filter((p) => p.points_earned > 0).length;
  const totalPts = members.reduce((s, m) => s + m.total_points, 0);
  const top = [...members].sort((a, b) => b.total_points - a.total_points)[0];
  const profiles = useAppStore((s) => s.profiles);
  const topName = top ? (profiles[top.user_id] ?? top.user_id.slice(0, 8)) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <StatCard label="Partidas apuradas" value={String(finishedCount)} />
      <StatCard label="Palpites pontuados" value={String(scoredPreds)} />
      <StatCard label="Pontos distribuídos" value={String(totalPts)} />
      <StatCard label="Líder atual" value={topName ?? "—"} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          {label}
        </div>
        <div className="text-sm font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
