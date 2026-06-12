import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useMigrate } from "@/lib/supabase/useMigrate";
import { mockProfiles } from "@/mocks/profiles";
import { totalUserPoints, userBreakdown } from "@/lib/scoring";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, Target, Trophy, Flame, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function DashboardPage() {
  const authUser = useAuthStore((s) => s.user);
  useMigrate(authUser?.id ?? null);
  const matches = useAppStore((s) => s.matches);
  const predictions = useAppStore((s) => s.predictions);
  const members = useAppStore((s) => s.members);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const user =
    authUser?.id === currentUserId
      ? { id: authUser.id, email: authUser.email, full_name: authUser.full_name, avatar_url: "" }
      : mockProfiles.find((p) => p.id === currentUserId) ?? {
          id: currentUserId,
          email: "",
          full_name: "Usuário local",
          avatar_url: "",
        };

  const live = totalUserPoints(matches, predictions, currentUserId);
  const breakdown = userBreakdown(matches, predictions, currentUserId);
  const sortedMembers = [...members].sort((a, b) => b.total_points - a.total_points);
  const myRank = sortedMembers.findIndex((m) => m.user_id === currentUserId) + 1;

  const lineData = [
    { rodada: "R1", pontos: 0 },
    { rodada: "R2", pontos: 0 },
    { rodada: "R3", pontos: 0 },
    { rodada: "R4", pontos: 0 },
    { rodada: "R5", pontos: 0 },
    { rodada: "R6", pontos: 0 },
  ];
  const barData = [
    { tipo: "Exato", pts: breakdown.exact || 0 },
    { tipo: "Saldo", pts: breakdown.winnerWithDiff || 0 },
    { tipo: "Vencedor", pts: breakdown.winnerOnly || 0 },
    { tipo: "Artilheiros", pts: breakdown.scorers || 0 },
    { tipo: "Zebras", pts: breakdown.zebraMultiplied || 0 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">Olá, {user.full_name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seu desempenho no bolão.</p>
        </div>
        <Button asChild>
          <Link to="/palpites"><Sparkles className="size-4 mr-1" /> Inserir palpites</Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={<Trophy className="size-4" />} label="Pontos Totais" value={`${live}`} accent="primary" />
        <KpiCard icon={<TrendingUp className="size-4" />} label="Rank na Firma" value={`#${myRank || "—"}`} sub={`de ${members.length} membros`} />
        <KpiCard icon={<Target className="size-4" />} label="Acertos em Cheio" value="0" />
        <KpiCard icon={<Flame className="size-4" />} label="Aproveitamento" value="—" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Desempenho por rodada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="rodada" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="pontos" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4, fill: "var(--primary)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Tipos de acerto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tipo" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Bar dataKey="pts" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Top da Firma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedMembers.slice(0, 5).map((m, idx) => {
            const p = authUser?.id === m.user_id
              ? { id: authUser.id, email: authUser.email, full_name: authUser.full_name, avatar_url: "" }
              : mockProfiles.find((x) => x.id === m.user_id);
            const isMe = m.user_id === currentUserId;
            const name = p?.full_name ?? "Usuário local";
            return (
              <div key={m.id} className={`flex items-center justify-between p-3 rounded-md ${isMe ? "bg-primary/5 border border-primary/20" : ""}`}>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-6">{String(idx + 1).padStart(2, "0")}</span>
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    {name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                  </div>
                  <span className={`text-sm ${isMe ? "font-bold text-primary" : "font-semibold"}`}>{name}{isMe && " (você)"}</span>
                </div>
                <span className={`font-mono text-sm font-bold ${idx === 0 ? "text-accent" : ""}`}>{m.total_points} pts</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: "primary" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3 text-muted-foreground">
          <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
          {icon}
        </div>
        <div className={`text-3xl font-bold tracking-tight ${accent === "primary" ? "text-primary" : ""}`}>{value}</div>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}