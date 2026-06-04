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
import { Lock, Sparkles, Brain, ChevronDown, CheckCircle2, X } from "lucide-react";
import { analyzeMatch } from "@/lib/copilot";
import { matchesRepo, predictionsRepo } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function PalpitesPage() {
  const matches = useAppStore((s) => s.matches);
  const predictions = useAppStore((s) => s.predictions);
  const unlocked = useMemo(() => {
    const isFilled = (id: string) => {
      const p = predictions.find((x) => x.match_id === id);
      return !!p && p.predicted_home_score !== null && p.predicted_away_score !== null;
    };
    const result: MatchPhase[] = ["grupos"];
    for (let i = 1; i < PHASE_ORDER.length; i++) {
      const prev = PHASE_ORDER[i - 1];
      const prevMatches = matches.filter((m) => m.phase === prev);
      if (prevMatches.length > 0 && prevMatches.every((m) => isFilled(m.id))) {
        result.push(PHASE_ORDER[i]);
      } else break;
    }
    return result;
  }, [matches, predictions]);
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
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter">Palpites</h1>
        <p className="text-sm text-muted-foreground">
          Preencha todos os jogos de uma fase para liberar a próxima. Use{" "}
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted">
            Ctrl + S
          </kbd>{" "}
          para salvar.
        </p>
      </header>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {PHASE_ORDER.map((p) => {
          const isUnlocked = unlocked.includes(p);
          const isActive = activePhase === p;
          return (
            <button
              key={p}
              onClick={() => isUnlocked && setActivePhase(p)}
              disabled={!isUnlocked}
              className={`px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest border transition-colors whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? "bg-foreground text-background border-foreground"
                  : isUnlocked
                    ? "bg-card hover:bg-muted border-border"
                    : "bg-muted/30 text-muted-foreground border-dashed cursor-not-allowed"
              }`}
            >
              {!isUnlocked && <Lock className="size-3" />}
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
  const filled =
    prediction?.predicted_home_score !== null &&
    prediction?.predicted_home_score !== undefined &&
    prediction?.predicted_away_score !== null &&
    prediction?.predicted_away_score !== undefined;

  const dateStr = new Date(match.match_date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const analysis = useMemo(
    () => (filled ? analyzeMatch(match, prediction) : null),
    [filled, match, prediction],
  );
  const isZebra = !!analysis?.isZebra;

  // Sincroniza flag is_zebra automaticamente conforme heurística (sem loop).
  useEffect(() => {
    if (!prediction) return;
    if (isZebra !== prediction.is_zebra) {
      upsert(matchId, { is_zebra: isZebra });
    }
  }, [isZebra, prediction, matchId, upsert]);

  return (
    <TableRow
      onClick={() => !tbd && onSelect(matchId)}
      className={`cursor-pointer ${filled ? "bg-accent/5" : ""} ${isSelected ? "bg-accent/10 border-l-2 border-l-primary" : ""}`}
    >
      <TableCell className="font-mono text-xs text-muted-foreground">{dateStr}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center gap-2 justify-end">
          <span className="font-semibold text-sm">{match.home_team}</span>
          <span className="text-lg">{match.home_flag}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 justify-center">
          <Input
            type="number"
            min={0}
            disabled={tbd}
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
            disabled={tbd}
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
          <span className="text-lg">{match.away_flag}</span>
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
          onClick={() => onSelect(matchId)}
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

  useEffect(() => {
    if (!prediction) return;
    if (isZebra !== prediction.is_zebra) {
      upsert(matchId, { is_zebra: isZebra });
    }
  }, [isZebra, prediction, matchId, upsert]);

  return (
    <Card
      onClick={() => !tbd && onSelect(matchId)}
      className={`transition-colors ${tbd ? "" : "cursor-pointer"} ${isSelected ? "border-primary" : filled ? "border-accent/40" : ""}`}
    >
      <CardContent className="p-4 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-4">
        <div className="flex items-center gap-3 justify-end">
          <span className="font-semibold">{match.home_team}</span>
          <span className="text-2xl">{match.home_flag}</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            disabled={tbd}
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
            disabled={tbd}
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
          <span className="text-2xl">{match.away_flag}</span>
          <span className="font-semibold">{match.away_team}</span>
        </div>
        <Button
          size="icon"
          variant={isSelected ? "secondary" : "ghost"}
          disabled={tbd}
          onClick={() => onSelect(matchId)}
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
              <span className="text-lg">{match.home_flag}</span>
              {match.home_team}
              <span className="text-muted-foreground font-mono">×</span>
              {match.away_team}
              <span className="text-lg">{match.away_flag}</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              {new Date(match.match_date).toLocaleString("pt-BR")}
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} title="Fechar">
            <X className="size-4" />
          </Button>
        </div>
        <div className="w-full">
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
