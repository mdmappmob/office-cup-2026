import { useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { predictionsRepo } from "@/lib/db";
import { useShallow } from "zustand/react/shallow";
import { PHASE_LABEL, PHASE_ORDER, type MatchPhase } from "@/mocks/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/Flag";
import { CheckCircle2, ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncFootballData } from "@/lib/results-sync.server";
import { API_TEAM_MAP } from "@/lib/results-sync";

export function AdminResultadosPage() {
  const user = useAuthStore((s) => s.user);
  if (!user?.is_admin) {
    return (
      <div className="max-w-md mx-auto px-8 py-20 text-center space-y-4">
        <ShieldAlert className="size-10 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold tracking-tighter">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Somente o administrador do bolão pode lançar resultados oficiais.
        </p>
      </div>
    );
  }
  return <Body />;
}

function Body() {
  const matches = useAppStore((s) => s.matches);
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
      for (const r of results) {
        if (r.status !== "finished" || r.homeScore === null || r.awayScore === null) continue;
        const homeName = API_TEAM_MAP[r.homeTeam] ?? r.homeTeam;
        const awayName = API_TEAM_MAP[r.awayTeam] ?? r.awayTeam;
          const match = matches.find(
            (m) =>
              (m.home_team === homeName && m.away_team === awayName) &&
              m.status !== "finished",
          );
          if (match) {
            predictionsRepo.settleMatch(match.id, r.homeScore, r.awayScore);
            applied++;
          }
      }
      toast.success(`${applied} resultado(s) aplicado(s)`);
    } finally {
      setSyncing(false);
    }
  };
  const phaseMatches = useMemo(
    () => matches.filter((m) => m.phase === phase),
    [matches, phase],
  );

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">Apuração de Resultados</h1>
          <p className="text-sm text-muted-foreground">
            Lance o placar oficial de cada partida. A pontuação dos palpites é recalculada automaticamente.
          </p>
        </div>
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
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {PHASE_ORDER.map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest border ${
              phase === p ? "bg-foreground text-background border-foreground" : "bg-card border-border"
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
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Data</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-right">Mandante</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-center">Resultado</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Visitante</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-center">Status</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-right">Ação</TableHead>
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

function ResultRow({ matchId }: { matchId: string }) {
  const match = useAppStore((s) => s.matches.find((m) => m.id === matchId)!);
  const predictions = useAppStore(useShallow((s) => s.predictions.filter((p) => p.match_id === matchId)));
  const [hs, setHs] = useState<string>(match.home_score?.toString() ?? "");
  const [as, setAs] = useState<string>(match.away_score?.toString() ?? "");
  const tbd = match.home_team === "—" || match.away_team === "—";
  const finished = match.status === "finished";

  const handleSettle = () => {
    const h = Number(hs);
    const a = Number(as);
    if (Number.isNaN(h) || Number.isNaN(a) || hs === "" || as === "") {
      toast.error("Informe os dois placares.");
      return;
    }
    predictionsRepo.settleMatch(matchId, h, a);
    toast.success(`Resultado registrado · ${predictions.length} palpites apurados.`);
  };

  const dateStr = new Date(match.match_date).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <TableRow className={finished ? "bg-accent/5" : ""}>
      <TableCell className="font-mono text-xs text-muted-foreground">{dateStr}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center gap-2 justify-end">
          <span className="font-semibold text-sm">{match.home_team}</span>
          <Flag team={match.home_team} iso={match.home_flag} size={16} />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 justify-center">
          <Input
            type="number" min={0} disabled={tbd || finished}
            className="w-14 h-9 text-center font-mono text-base font-bold p-0"
            value={hs}
            onChange={(e) => setHs(e.target.value)}
          />
          <span className="text-muted-foreground font-mono">×</span>
          <Input
            type="number" min={0} disabled={tbd || finished}
            className="w-14 h-9 text-center font-mono text-base font-bold p-0"
            value={as}
            onChange={(e) => setAs(e.target.value)}
          />
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
        <Button
          size="sm"
          variant={finished ? "outline" : "default"}
          disabled={tbd}
          onClick={handleSettle}
        >
          {finished ? "Reapurar" : "Encerrar partida"}
        </Button>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
      <StatCard label="Partidas apuradas" value={String(finishedCount)} />
      <StatCard label="Palpites pontuados" value={String(scoredPreds)} />
      <StatCard label="Pontos distribuídos" value={String(totalPts)} />
      <StatCard label="Líder atual" value={top?.user_id ?? "—"} />
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
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}