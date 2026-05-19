import { useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { PHASE_LABEL, PHASE_ORDER, type MatchPhase } from "@/mocks/types";
import { Lock, Sparkles, Users, Goal, Brain } from "lucide-react";
import { analyzeMatch } from "@/lib/copilot";
import { motion } from "framer-motion";

export function PalpitesPage() {
  const unlocked = useAppStore((s) => s.unlockedPhases());
  const [activePhase, setActivePhase] = useState<MatchPhase>("grupos");

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter">Palpites</h1>
        <p className="text-sm text-muted-foreground">
          Preencha todos os jogos de uma fase para liberar a próxima.
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
        <MatchListByGroup phase={activePhase} />
      </div>
    </div>
  );
}

function PhaseProgress({ phase }: { phase: MatchPhase }) {
  const progress = useAppStore((s) => s.phaseProgress(phase));
  const pct = progress.total === 0 ? 0 : (progress.filled / progress.total) * 100;
  return (
    <div className="border border-border rounded-md bg-card p-4">
      <div className="flex justify-between text-xs font-mono uppercase tracking-widest mb-2">
        <span className="text-muted-foreground">Progresso da fase</span>
        <span className="font-bold">{progress.filled} / {progress.total}</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function MatchListByGroup({ phase }: { phase: MatchPhase }) {
  const matches = useAppStore((s) => s.matchesByPhase(phase));
  const grouped = useMemo(() => {
    if (phase !== "grupos") return { __all: matches };
    return matches.reduce<Record<string, typeof matches>>((acc, m) => {
      const k = m.group ?? "—";
      acc[k] = acc[k] || [];
      acc[k].push(m);
      return acc;
    }, {});
  }, [matches, phase]);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([groupKey, gMatches]) => (
        <div key={groupKey}>
          {phase === "grupos" && (
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3 mt-4">
              Grupo {groupKey}
            </h3>
          )}
          <div className="space-y-3">
            {gMatches.map((m) => (
              <MatchCard key={m.id} matchId={m.id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ matchId }: { matchId: string }) {
  const match = useAppStore((s) => s.matches.find((x) => x.id === matchId)!);
  const prediction = useAppStore((s) => s.predictionFor(matchId));
  const upsert = useAppStore((s) => s.upsertPrediction);
  const tbd = match.home_team === "—" || match.away_team === "—";
  const filled =
    prediction?.predicted_home_score !== null && prediction?.predicted_home_score !== undefined &&
    prediction?.predicted_away_score !== null && prediction?.predicted_away_score !== undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className={`overflow-hidden transition-colors ${filled ? "border-accent/40" : ""}`}>
        <CardContent className="p-0">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <span>{new Date(match.match_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              {filled && <Badge className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/15">PALPITE OK</Badge>}
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="flex items-center gap-3 justify-end">
                <span className="font-semibold text-right">{match.home_team}</span>
                <span className="text-2xl">{match.home_flag}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  disabled={tbd}
                  className="w-14 h-12 text-center font-mono text-xl font-bold"
                  value={prediction?.predicted_home_score ?? ""}
                  onChange={(e) =>
                    upsert(matchId, { predicted_home_score: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
                <span className="text-muted-foreground font-mono">×</span>
                <Input
                  type="number"
                  min={0}
                  disabled={tbd}
                  className="w-14 h-12 text-center font-mono text-xl font-bold"
                  value={prediction?.predicted_away_score ?? ""}
                  onChange={(e) =>
                    upsert(matchId, { predicted_away_score: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{match.away_flag}</span>
                <span className="font-semibold">{match.away_team}</span>
              </div>
            </div>
          </div>

          {!tbd && (
            <Accordion type="multiple" className="border-t border-border bg-muted/20">
              <AccordionItem value="lineup" className="border-0">
                <AccordionTrigger className="px-5 py-3 text-xs font-mono uppercase tracking-widest hover:no-underline">
                  <span className="flex items-center gap-2"><Users className="size-3.5" /> Escalações</span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-4">
                  <LineupForm matchId={matchId} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="scorers" className="border-0 border-t border-border">
                <AccordionTrigger className="px-5 py-3 text-xs font-mono uppercase tracking-widest hover:no-underline">
                  <span className="flex items-center gap-2"><Goal className="size-3.5" /> Artilheiros do jogo</span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-4">
                  <ScorersForm matchId={matchId} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="copilot" className="border-0 border-t border-border">
                <AccordionTrigger className="px-5 py-3 text-xs font-mono uppercase tracking-widest hover:no-underline">
                  <span className="flex items-center gap-2"><Brain className="size-3.5 text-primary" /> Copilot das Zebras</span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-4">
                  <CopilotPanel matchId={matchId} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LineupForm({ matchId }: { matchId: string }) {
  const prediction = useAppStore((s) => s.predictionFor(matchId));
  const match = useAppStore((s) => s.matches.find((x) => x.id === matchId)!);
  const upsert = useAppStore((s) => s.upsertPrediction);
  const [home, setHome] = useState(prediction?.predicted_home_lineup?.join(", ") ?? "");
  const [away, setAway] = useState(prediction?.predicted_away_lineup?.join(", ") ?? "");

  const save = () => {
    upsert(matchId, {
      predicted_home_lineup: home.split(",").map((s) => s.trim()).filter(Boolean),
      predicted_away_lineup: away.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{match.home_team} (11 titulares)</label>
        <Input value={home} onChange={(e) => setHome(e.target.value)} onBlur={save} placeholder="ex: Alisson, Vinicius..." />
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{match.away_team} (11 titulares)</label>
        <Input value={away} onChange={(e) => setAway(e.target.value)} onBlur={save} placeholder="ex: Messi, Di María..." />
      </div>
    </div>
  );
}

function ScorersForm({ matchId }: { matchId: string }) {
  const prediction = useAppStore((s) => s.predictionFor(matchId));
  const upsert = useAppStore((s) => s.upsertPrediction);
  const [val, setVal] = useState(prediction?.predicted_goalscorers?.join(", ") ?? "");
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Quem marca?</label>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => upsert(matchId, { predicted_goalscorers: val.split(",").map((s) => s.trim()).filter(Boolean) })}
        placeholder="ex: Vinicius Jr, Rodrygo"
      />
    </div>
  );
}

function CopilotPanel({ matchId }: { matchId: string }) {
  const match = useAppStore((s) => s.matches.find((x) => x.id === matchId)!);
  const prediction = useAppStore((s) => s.predictionFor(matchId));
  const upsert = useAppStore((s) => s.upsertPrediction);
  const analysis = useMemo(() => analyzeMatch(match, prediction), [match, prediction]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-bold">{analysis.verdict}</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">Prob. {analysis.probability}%</span>
      </div>
      <ul className="space-y-1.5">
        {analysis.reasoning.map((r, i) => (
          <li key={i} className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">{r}</li>
        ))}
      </ul>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Marcar como zebra (multiplicador 2x)</span>
        <Button
          size="sm"
          variant={prediction?.is_zebra ? "default" : "outline"}
          onClick={() => upsert(matchId, { is_zebra: !prediction?.is_zebra })}
        >
          {prediction?.is_zebra ? "Zebra ativada" : "Ativar zebra"}
        </Button>
      </div>
    </div>
  );
}