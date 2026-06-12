import { Fragment, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PHASE_LABEL, PHASE_ORDER, type MatchPhase } from "@/mocks/types";
import { Lock, Sparkles, Brain, ChevronDown, CheckCircle2, X, Plus, Trash2, AlertTriangle } from "lucide-react";
import { analyzeMatch } from "@/lib/copilot";
import { matchesRepo, predictionsRepo } from "@/lib/db";
import { useShallow } from "zustand/react/shallow";
import { Flag } from "@/components/Flag";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const BR_TZ = "America/Sao_Paulo";

function brDate(dateStr: string, style: "short" | "long" = "short"): string {
  const d = new Date(dateStr);
  if (style === "long") {
    return d.toLocaleString("pt-BR", { timeZone: BR_TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { timeZone: BR_TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function PalpitesPage() {
  const matches = useAppStore((s) => s.matches);
  const predictions = useAppStore((s) => s.predictions);
  const isPhaseExpired = useAppStore((s) => s.isPhaseExpired);
  const getPhaseFirstMatchDate = useAppStore((s) => s.getPhaseFirstMatchDate);
  const phaseProgress = useAppStore((s) => s.phaseProgress);

  const r32Expired = isPhaseExpired("r32");

  const { unlocked, phaseLockStatus } = useMemo(() => {
    const isFilled = (id: string) => {
      const p = predictions.find((x) => x.match_id === id);
      return !!p && p.predicted_home_score !== null && p.predicted_away_score !== null;
    };
    const result: MatchPhase[] = ["grupos"];
    const lockStatus: Record<MatchPhase, boolean> = {} as Record<MatchPhase, boolean>;
    for (const phase of PHASE_ORDER) {
      lockStatus[phase] = isPhaseExpired(phase);
    }
    for (let i = 1; i < PHASE_ORDER.length; i++) {
      const prev = PHASE_ORDER[i - 1];
      const prevMatches = matches.filter((m) => m.phase === prev);
      if (prevMatches.length > 0 && prevMatches.every((m) => isFilled(m.id))) {
        result.push(PHASE_ORDER[i]);
      } else break;
    }
    return { unlocked: result, phaseLockStatus: lockStatus };
  }, [matches, predictions, isPhaseExpired]);

  const incompleteAlerts = useMemo(() => {
    const alerts: { phase: MatchPhase; deadline: string }[] = [];
    for (let i = 0; i < PHASE_ORDER.length; i++) {
      const phase = PHASE_ORDER[i];
      if (phaseLockStatus[phase]) continue;
      const nextPhase = PHASE_ORDER[i + 1];
      if (!nextPhase) continue;
      if (isPhaseExpired(nextPhase)) continue;
      const { filled, total } = phaseProgress(phase);
      if (filled < total) {
        const deadline = getPhaseFirstMatchDate(nextPhase);
        if (deadline) {
          alerts.push({ phase, deadline: brDate(deadline, "long") });
        }
      }
    }
    return alerts;
  }, [phaseLockStatus, isPhaseExpired, phaseProgress, getPhaseFirstMatchDate]);

  const [activePhase, setActivePhase] = useState<MatchPhase>("grupos");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toast.success("Palpites salvos", { description: "Sincronizados localmente." });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      {r32Expired && (
        <div className="mb-6 p-4 rounded-md border border-destructive/40 bg-destructive/10 flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">Prazo de palpites encerrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              A 2ª fase (16-avos de final) já começou. Não é mais permitido alterar palpites em nenhuma fase.
              Os palpites já registrados serão considerados para a pontuação final.
            </p>
          </div>
        </div>
      )}

      {!r32Expired && incompleteAlerts.length > 0 && (
        <div className="mb-6 p-4 rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Atenção: palpites incompletos</p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
              {incompleteAlerts.map((a) => (
                <li key={a.phase}>
                  {PHASE_LABEL[a.phase]}: preencha todos os jogos <strong>antes de {a.deadline}</strong> (horário de Brasília).
                  Caso contrário, você será desclassificado(a) desta fase em diante.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter">Palpites</h1>
        <p className="text-sm text-muted-foreground">
          Preencha todos os jogos de uma fase para liberar a próxima.
          {!r32Expired && (
            <> Use <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted">Ctrl + S</kbd> para salvar.</>
          )}
        </p>
      </header>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {PHASE_ORDER.map((p) => {
          const isUnlocked = unlocked.includes(p);
          const isActive = activePhase === p;
          const expired = phaseLockStatus[p];
          const disabled = !isUnlocked || expired || r32Expired;
          return (
            <button
              key={p}
              onClick={() => !disabled && setActivePhase(p)}
              disabled={disabled}
              className={`px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest border transition-colors whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? "bg-foreground text-background border-foreground"
                  : isUnlocked && !expired && !r32Expired
                    ? "bg-card hover:bg-muted border-border"
                    : "bg-muted/30 text-muted-foreground border-dashed cursor-not-allowed"
              }`}
            >
              {(disabled) && <Lock className="size-3" />}
              {PHASE_LABEL[p]}
            </button>
          );
        })}
      </div>

      <PhaseProgress phase={activePhase} />

      <div className="mt-6 space-y-3">
        <MatchListByGroup
          phase={activePhase}
          selectedMatchId={selectedMatchId}
          onSelect={(id) => setSelectedMatchId((cur) => (cur === id ? null : id))}
          onClear={() => setSelectedMatchId(null)}
        />
      </div>
    </div>
  );
}

function PhaseProgress({ phase }: { phase: MatchPhase }) {
  const matches = useAppStore((s) => s.matches);
  const predictions = useAppStore((s) => s.predictions);
  const progress = useMemo(() => {
    const ms = matches.filter((m) => m.phase === phase);
    const filled = ms.filter((m) => {
      const p = predictions.find((x) => x.match_id === m.id);
      return !!p && p.predicted_home_score !== null && p.predicted_away_score !== null;
    }).length;
    return { filled, total: ms.length };
  }, [matches, predictions, phase]);
  const pct = progress.total === 0 ? 0 : (progress.filled / progress.total) * 100;
  return (
    <div className="border border-border rounded-md bg-card p-4">
      <div className="flex justify-between text-xs font-mono uppercase tracking-widest mb-2">
        <span className="text-muted-foreground">Progresso da fase</span>
        <span className="font-bold">
          {progress.filled} / {progress.total}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function MatchListByGroup({
  phase,
  selectedMatchId,
  onSelect,
  onClear,
}: {
  phase: MatchPhase;
  selectedMatchId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const allMatches = useAppStore((s) => s.matches);
  const matches = useMemo(() => allMatches.filter((m) => m.phase === phase), [allMatches, phase]);
  const grouped = useMemo(() => {
    if (phase !== "grupos") return { __all: matches };
    return matches.reduce<Record<string, typeof matches>>((acc, m) => {
      const k = m.group ?? "—";
      acc[k] = acc[k] || [];
      acc[k].push(m);
      return acc;
    }, {});
  }, [matches, phase]);

  if (phase !== "grupos") {
    return (
      <div className="space-y-3">
        {matches.map((m) => (
          <div key={m.id}>
            <BracketRow matchId={m.id} isSelected={selectedMatchId === m.id} onSelect={onSelect} />
            <AnimatePresence initial={false}>
              {selectedMatchId === m.id && <MatchDetailsInline matchId={m.id} onClose={onClear} />}
            </AnimatePresence>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([groupKey, gMatches]) => (
        <GroupTable
          key={groupKey}
          groupKey={groupKey}
          matchIds={gMatches.map((m) => m.id)}
          selectedMatchId={selectedMatchId}
          onSelect={onSelect}
          onClear={onClear}
        />
      ))}
    </div>
  );
}

function GroupTable({
  groupKey,
  matchIds,
  selectedMatchId,
  onSelect,
  onClear,
}: {
  groupKey: string;
  matchIds: string[];
  selectedMatchId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const predictions = useAppStore((s) => s.predictions);
  const filledCount = useMemo(
    () =>
      matchIds.filter((id) => {
        const p = predictions.find((x) => x.match_id === id);
        return !!p && p.predicted_home_score !== null && p.predicted_away_score !== null;
      }).length,
    [matchIds, predictions],
  );
  const selectedInGroup =
    selectedMatchId && matchIds.includes(selectedMatchId) ? selectedMatchId : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="border border-border rounded-md bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold tracking-tight">Grupo {groupKey}</h3>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {matchIds.length} jogos
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {filledCount} / {matchIds.length} preenchidos
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/10 hover:bg-muted/10">
            <TableHead className="font-mono text-[10px] uppercase tracking-widest w-[110px]">
              Data
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-widest text-right">
              Mandante
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-widest text-center w-[160px]">
              Placar
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-widest">
              Visitante
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-widest text-center w-[90px]">
              Status
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matchIds.map((id) => (
            <Fragment key={id}>
              <MatchRow matchId={id} isSelected={selectedInGroup === id} onSelect={onSelect} />
              <AnimatePresence initial={false}>
                {selectedInGroup === id && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <MatchDetailsInline matchId={id} onClose={onClear} />
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}

function MatchRow({
  matchId,
  isSelected,
  onSelect,
}: {
  matchId: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const match = useAppStore((s) => s.matches.find((x) => x.id === matchId)!);
  const prediction = useAppStore((s) => s.predictions.find((p) => p.match_id === matchId));
  const upsert = predictionsRepo.upsertPrediction;
  const tbd = match.home_team === "—" || match.away_team === "—";
  const finished = match.status === "finished";
  const phaseLocked = useAppStore((s) => s.isPhaseExpired(match.phase));
  const r32Expired = useAppStore((s) => s.isPhaseExpired("r32"));
  const locked = tbd || finished || phaseLocked || r32Expired;
  const filled =
    prediction?.predicted_home_score !== null &&
    prediction?.predicted_home_score !== undefined &&
    prediction?.predicted_away_score !== null &&
    prediction?.predicted_away_score !== undefined;

  const dateStr = brDate(match.match_date);

  const analysis = useMemo(
    () => (filled ? analyzeMatch(match, prediction) : null),
    [filled, match, prediction],
  );
  const isZebra = !!analysis?.isZebra;

  return (
    <TableRow
      onClick={() => !locked && onSelect(matchId)}
      className={`cursor-pointer ${filled ? "bg-accent/5" : ""} ${isSelected ? "bg-accent/10 border-l-2 border-l-primary" : ""}`}
    >
      <TableCell className="font-mono text-xs text-muted-foreground">{dateStr}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center gap-2 justify-end">
          <span className="font-semibold text-sm">{match.home_team}</span>
          <Flag team={match.home_team} iso={match.home_flag} size={16} />
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 justify-center">
          <Input
            type="number"
            min={0}
            disabled={locked}
            className="w-12 h-9 text-center font-mono text-base font-bold p-0"
            value={prediction?.predicted_home_score ?? ""}
            onChange={(e) =>
              upsert(matchId, {
                predicted_home_score: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <span className="text-muted-foreground font-mono text-xs">×</span>
          <Input
            type="number"
            min={0}
            disabled={locked}
            className="w-12 h-9 text-center font-mono text-base font-bold p-0"
            value={prediction?.predicted_away_score ?? ""}
            onChange={(e) =>
              upsert(matchId, {
                predicted_away_score: e.target.value === "" ? null : Number(e.target.value),
              })
            }
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
        {isZebra ? (
          <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15 font-mono text-[10px]">
            ZEBRA
          </Badge>
        ) : filled ? (
          <Badge className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/15 font-mono text-[10px]">
            <CheckCircle2 className="size-3 mr-1" /> OK
          </Badge>
        ) : (
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            —
          </span>
        )}
      </TableCell>
      <TableCell>
        <Button
          size="icon"
          variant={isSelected ? "secondary" : "ghost"}
          disabled={tbd}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(matchId);
          }}
          title={isZebra ? "Zebra detectada pelo Copilot" : "Abrir Copilot"}
        >
          {isZebra ? (
            <span className="text-base leading-none" aria-label="zebra">
              🦓
            </span>
          ) : (
            <ChevronDown
              className={`size-4 transition-transform ${isSelected ? "rotate-180" : ""}`}
            />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function BracketRow({
  matchId,
  isSelected,
  onSelect,
}: {
  matchId: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const match = useAppStore((s) => s.matches.find((x) => x.id === matchId)!);
  const prediction = useAppStore((s) => s.predictions.find((p) => p.match_id === matchId));
  const upsert = predictionsRepo.upsertPrediction;
  const tbd = match.home_team === "—" || match.away_team === "—";
  const finished = match.status === "finished";
  const phaseLocked = useAppStore((s) => s.isPhaseExpired(match.phase));
  const r32Expired = useAppStore((s) => s.isPhaseExpired("r32"));
  const locked = tbd || finished || phaseLocked || r32Expired;
  const filled =
    prediction?.predicted_home_score !== null &&
    prediction?.predicted_home_score !== undefined &&
    prediction?.predicted_away_score !== null &&
    prediction?.predicted_away_score !== undefined;
  const analysis = useMemo(
    () => (filled ? analyzeMatch(match, prediction) : null),
    [filled, match, prediction],
  );
  const isZebra = !!analysis?.isZebra;

  return (
    <Card
      onClick={() => !locked && onSelect(matchId)}
      className={`transition-colors ${tbd ? "" : "cursor-pointer"} ${isSelected ? "border-primary" : filled ? "border-accent/40" : ""}`}
    >
      <CardContent className="p-4 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-4">
        <div className="flex items-center gap-3 justify-end">
          <span className="font-semibold">{match.home_team}</span>
          <Flag team={match.home_team} iso={match.home_flag} size={22} />
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            type="number"
            min={0}
            disabled={locked}
            className="w-12 h-10 text-center font-mono text-lg font-bold p-0"
            value={prediction?.predicted_home_score ?? ""}
            onChange={(e) =>
              upsert(matchId, {
                predicted_home_score: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <span className="text-muted-foreground font-mono">×</span>
          <Input
            type="number"
            min={0}
            disabled={locked}
            className="w-12 h-10 text-center font-mono text-lg font-bold p-0"
            value={prediction?.predicted_away_score ?? ""}
            onChange={(e) =>
              upsert(matchId, {
                predicted_away_score: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
        <div className="flex items-center gap-3">
          <Flag team={match.away_team} iso={match.away_flag} size={22} />
          <span className="font-semibold">{match.away_team}</span>
        </div>
        <Button
          size="icon"
          variant={isSelected ? "secondary" : "ghost"}
          disabled={tbd}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(matchId);
          }}
          title={isZebra ? "Zebra detectada pelo Copilot" : "Abrir Copilot"}
        >
          {isZebra ? (
            <span className="text-base leading-none" aria-label="zebra">
              🦓
            </span>
          ) : (
            <ChevronDown
              className={`size-4 transition-transform ${isSelected ? "rotate-180" : ""}`}
            />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function MatchDetailsInline({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const match = matchesRepo.getMatch(matchId);
  if (!match) return null;
  return (
    <motion.div
      key={matchId}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="mx-3 my-2 overflow-hidden rounded-md border border-border bg-popover shadow-lg"
    >
      <div className="px-4 py-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <Flag team={match.home_team} iso={match.home_flag} size={16} />
              {match.home_team}
              <span className="text-muted-foreground font-mono">×</span>
              {match.away_team}
              <Flag team={match.away_team} iso={match.away_flag} size={16} />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              {brDate(match.match_date, "long")}
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} title="Fechar">
            <X className="size-4" />
          </Button>
        </div>
        <div className="w-full space-y-5">
          <AlternativePalpites matchId={matchId} />
          <section>
            <h4 className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              <Brain className="size-3.5 text-primary" /> Copilot das Zebras
            </h4>
            <CopilotPanel matchId={matchId} />
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function CopilotPanel({ matchId }: { matchId: string }) {
  const match = useAppStore((s) => s.matches.find((x) => x.id === matchId)!);
  const prediction = useAppStore((s) => s.predictions.find((p) => p.match_id === matchId));
  const analysis = useMemo(() => analyzeMatch(match, prediction), [match, prediction]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-bold">{analysis.verdict}</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          Prob. {analysis.probability}%
        </span>
      </div>
      <ul className="space-y-1.5">
        {analysis.reasoning.map((r, i) => (
          <li
            key={i}
            className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3"
          >
            {r}
          </li>
        ))}
      </ul>
      {analysis.isZebra && (
        <div className="pt-2 border-t border-border">
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
            Zebra definida automaticamente pelo Copilot estatístico
          </span>
        </div>
      )}
    </div>
  );
}

function AlternativePalpites({ matchId }: { matchId: string }) {
  const userId = useAppStore((s) => s.currentUserId);
  const predictions = useAppStore(
    useShallow((s) =>
      s.predictions
        .filter((p) => p.match_id === matchId && p.user_id === userId)
        .sort((a, b) => a.slot - b.slot),
    ),
  );
  const addSlot = useAppStore((s) => s.addPredictionSlot);
  const removePrediction = predictionsRepo.removePrediction;
  const upsert = predictionsRepo.upsertPrediction;
  const match = useAppStore((s) => s.matches.find((m) => m.id === matchId)!);
  const tbd = match.home_team === "—" || match.away_team === "—";
  const finished = match.status === "finished";
  const phaseLocked = useAppStore((s) => s.isPhaseExpired(match.phase));
  const r32Expired = useAppStore((s) => s.isPhaseExpired("r32"));
  const locked = tbd || finished || phaseLocked || r32Expired;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h4 className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Meus palpites para esta partida
        </h4>
        <Button
          size="sm"
          variant="outline"
          disabled={locked}
          onClick={() => addSlot(matchId)}
          className="h-7"
        >
          <Plus className="size-3.5 mr-1" /> Novo palpite
        </Button>
      </div>
      <div className="space-y-2">
        {predictions.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Preencha o placar acima — seu 1º palpite aparece aqui automaticamente.
          </p>
        )}
        {predictions.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-background/50"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-12">
              Slot {p.slot}
            </span>
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <Flag team={match.home_team} iso={match.home_flag} size={14} />
              <Input
                type="number"
                min={0}
                disabled={locked || finished}
                className="w-12 h-8 text-center font-mono text-sm font-bold p-0"
                value={p.predicted_home_score ?? ""}
                onChange={(e) =>
                  upsert(
                    matchId,
                    {
                      predicted_home_score: e.target.value === "" ? null : Number(e.target.value),
                    },
                    p.slot,
                  )
                }
              />
              <span className="text-muted-foreground font-mono text-xs">×</span>
              <Input
                type="number"
                min={0}
                disabled={locked || finished}
                className="w-12 h-8 text-center font-mono text-sm font-bold p-0"
                value={p.predicted_away_score ?? ""}
                onChange={(e) =>
                  upsert(
                    matchId,
                    {
                      predicted_away_score: e.target.value === "" ? null : Number(e.target.value),
                    },
                    p.slot,
                  )
                }
              />
              <Flag team={match.away_team} iso={match.away_flag} size={14} />
            </div>
            {p.points_earned > 0 && (
              <span className="font-mono text-xs text-accent font-bold">+{p.points_earned}pts</span>
            )}
            {p.slot > 1 && !locked && (
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => removePrediction(p.id)}
                title="Remover este palpite"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground font-mono">
          Pontuação considera o melhor palpite cadastrado.
        </p>
      </div>
    </section>
  );
}
