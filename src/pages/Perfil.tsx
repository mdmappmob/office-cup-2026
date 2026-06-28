import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { mockProfiles } from "@/mocks/profiles";
import { APP_VERSION, APP_COMMIT } from "@/lib/version";
import {
  Trash2,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Copy,
  Users,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { migrateUserData } from "@/lib/supabase/migrate.server";
import { supabase } from "@/lib/supabase/client";

export function PerfilPage() {
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [leagueCode, setLeagueCode] = useState("");
  const [joinedLeague, setJoinedLeague] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [auditData, setAuditData] = useState<Array<{ name: string; totalPoints: number }> | null>(
    null,
  );
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const user =
    authUser?.id === currentUserId
      ? { id: authUser.id, email: authUser.email, full_name: authUser.full_name, avatar_url: "" }
      : (mockProfiles.find((p) => p.id === currentUserId) ?? {
          id: currentUserId,
          email: "",
          full_name: "Usuário local",
          avatar_url: "",
        });
  const raw = typeof window !== "undefined" ? localStorage.getItem("officecup-2026") : null;
  const localData = raw ? JSON.parse(raw)?.state : null;
  const localPredictions = localData?.predictions?.length ?? 0;

  useEffect(() => {
    if (!authUser?.id) return;
    const stored = localStorage.getItem(`supabase_migrated_${authUser.id}`);
    if (stored) {
      setMigrated(true);
      return;
    }
    supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authUser.id)
      .limit(1)
      .then(({ count }) => {
        if (count && count > 0) {
          localStorage.setItem(`supabase_migrated_${authUser.id}`, "1");
          setMigrated(true);
        }
      })
      .catch(() => {});
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id || !isAdmin) return;
    supabase
      .from("leagues")
      .select("invite_code")
      .eq("admin_id", authUser.id)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.invite_code) setLeagueCode(data[0].invite_code);
      })
      .catch(() => {});
  }, [authUser?.id, isAdmin]);

  useEffect(() => {
    if (!authUser?.id || isAdmin) return;
    supabase
      .from("members")
      .select("league_id")
      .eq("user_id", authUser.id)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          supabase
            .from("leagues")
            .select("name")
            .eq("id", data[0].league_id)
            .limit(1)
            .then(({ data: league }) => {
              if (league?.[0]) setJoinedLeague(league[0].name);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [authUser?.id, isAdmin]);

  // Auto-join from invite link (?invite=CODE)
  useEffect(() => {
    if (!authUser?.id || joinedLeague) return;
    const pending = sessionStorage.getItem("pending_invite");
    if (pending) {
      sessionStorage.removeItem("pending_invite");
      setInviteCode(pending);
      setTimeout(() => {
        if (!pending.trim()) return;
        handleJoinWithCode(pending);
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, joinedLeague]);

  const handleResetKnockout = async () => {
    if (!authUser?.id) return;
    setResetting(true);
    setAuditData(null);
    try {
      const { resetKnockoutData } = useAppStore.getState();
      await resetKnockoutData();
      // Re-sync from Supabase to get latest data
      await useAppStore.getState().loadFromSupabase();
      // Audit: get current predictions (only grupo) and calculate points per member
      const predictions = useAppStore.getState().predictions;
      const members = useAppStore.getState().members;
      const profiles = useAppStore.getState().profiles;
      const bestByUser = new Map<string, number>();
      for (const p of predictions) {
        const key = `${p.user_id}|${p.match_id}`;
        const cur = bestByUser.get(key) ?? 0;
        if (p.points_earned > cur) bestByUser.set(key, p.points_earned);
      }
      const userTotals = new Map<string, number>();
      for (const [key, pts] of bestByUser) {
        const uid = key.split("|")[0];
        userTotals.set(uid, (userTotals.get(uid) ?? 0) + pts);
      }
      const audit = Array.from(userTotals.entries())
        .map(([uid, pts]) => ({
          name: profiles[uid] ?? uid.slice(0, 8),
          totalPoints: pts,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints);
      setAuditData(audit);
      toast.success(`Dados R32+ resetados. ${audit.length} membros auditados.`);
    } catch (err) {
      toast.error("Erro ao resetar", { description: (err as Error).message });
    } finally {
      setResetting(false);
    }
  };

  const handleJoinWithCode = async (code: string) => {
    setJoining(true);
    try {
      const { data: league } = await supabase
        .from("leagues")
        .select("id, name")
        .eq("invite_code", code.trim().toUpperCase())
        .maybeSingle();
      if (!league) {
        toast.error("Código inválido");
        return;
      }
      const { error } = await supabase
        .from("members")
        .upsert(
          { user_id: authUser!.id, league_id: league.id, has_paid_admin: false, total_points: 0 },
          { onConflict: "league_id,user_id" },
        );
      if (error) throw error;
      await supabase
        .from("profiles")
        .upsert(
          { id: authUser!.id, full_name: authUser!.full_name, email: authUser!.email },
          { onConflict: "id" },
        );
      setJoinedLeague(league.name);
      toast.success(`Bem-vindo ao ${league.name}!`);
    } catch {
      toast.error("Erro ao entrar no bolão");
    } finally {
      setJoining(false);
    }
  };

  const handleJoinLeague = async () => {
    if (!authUser?.id || !inviteCode.trim()) return;
    setJoining(true);
    try {
      const { data: league } = await supabase
        .from("leagues")
        .select("id, name")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .maybeSingle();
      if (!league) {
        toast.error("Código inválido", { description: "Nenhum bolão encontrado com esse código." });
        return;
      }
      const { error } = await supabase
        .from("members")
        .upsert(
          { user_id: authUser.id, league_id: league.id, has_paid_admin: false, total_points: 0 },
          { onConflict: "league_id,user_id" },
        );
      if (error) throw error;
      await supabase
        .from("profiles")
        .upsert(
          { id: authUser.id, full_name: authUser.full_name, email: authUser.email },
          { onConflict: "id" },
        );
      setJoinedLeague(league.name);
      toast.success(`Bem-vindo ao ${league.name}!`);
      setInviteCode("");
    } catch (err) {
      toast.error("Erro ao entrar no bolão", { description: (err as Error).message });
    } finally {
      setJoining(false);
    }
  };

  const handleMigrate = async () => {
    if (!authUser?.id) return;
    setMigrating(true);
    try {
      const members = localData?.members ?? [];
      const totalPoints =
        members.find((m: { user_id: string }) => m.user_id === authUser.id)?.total_points ?? 0;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const result = await migrateUserData({
        data: {
          supabaseUrl,
          userId: authUser.id,
          email: authUser.email,
          predictions: (localData?.predictions ?? []).map((p: Record<string, unknown>) => ({
            match_id: p.match_id as string,
            slot: (p.slot as number) ?? 1,
            predicted_home_score: (p.predicted_home_score as number | null) ?? null,
            predicted_away_score: (p.predicted_away_score as number | null) ?? null,
            predicted_goalscorers: (p.predicted_goalscorers as string[]) ?? [],
            points_earned: (p.points_earned as number) ?? 0,
            is_zebra: (p.is_zebra as boolean) ?? false,
          })),
          totalPoints,
        },
      });
      if (result.ok) {
        localStorage.setItem(`supabase_migrated_${authUser.id}`, "1");
        toast.success(
          `${localPredictions} palpite(s) migrados com sucesso! (predCount=${result.predCount ?? "?"})`,
        );
      } else {
        toast.error("Erro na migração", {
          description: `${result.error} (preds=${localPredictions})`,
        });
      }
    } catch (err) {
      toast.error("Erro na migração", { description: (err as Error).message });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold tracking-tighter mb-1">Meu Perfil</h1>
      <p className="text-sm text-muted-foreground mb-8">Informações da conta e preferências.</p>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center font-bold">
                {user.full_name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <p className="font-semibold">{user.full_name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && leagueCode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="size-3.5" /> Meu Bolão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Compartilhe o código abaixo com seus amigos para eles entrarem no bolão:
              </p>
              <div className="flex items-center gap-3">
                <code className="px-4 py-2 rounded-md bg-muted font-mono text-sm font-bold tracking-wider">
                  {leagueCode}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(leagueCode);
                    toast.success("Código copiado!");
                  }}
                >
                  <Copy className="size-3.5 mr-1" /> Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isAdmin && !joinedLeague && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <KeyRound className="size-3.5" /> Entrar em Bolão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Insira o código que o administrador do bolão enviou:
              </p>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Ex: BOLAO-A7F2"
                  className="font-mono uppercase w-40"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                />
                <Button
                  size="sm"
                  disabled={!inviteCode.trim() || joining}
                  onClick={handleJoinLeague}
                >
                  {joining ? "Entrando..." : "Entrar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isAdmin && joinedLeague && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-green-600">
                <CheckCircle2 className="size-3.5" /> Meu Bolão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Você está participando do <strong>{joinedLeague}</strong>.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Upload className="size-3.5" /> Migração Supabase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {localPredictions > 0
                ? `Você tem ${localPredictions} palpite(s) salvos apenas no navegador. Clique abaixo para enviá-los ao Supabase e sincronizar entre dispositivos.`
                : `Nenhum palpite local encontrado.`}
            </p>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                disabled={!localPredictions || migrating || !!migrated}
                onClick={handleMigrate}
              >
                {migrating ? (
                  "Migrando..."
                ) : migrated ? (
                  <>
                    <CheckCircle2 className="size-3.5 mr-1" /> Migrado
                  </>
                ) : (
                  "Migrar dados locais"
                )}
              </Button>
              {migrated && (
                <Badge variant="outline" className="text-[10px] text-green-600">
                  <CheckCircle2 className="size-3 mr-1" /> Dados no Supabase
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-destructive flex items-center gap-2">
                <RotateCcw className="size-3.5" /> Resetar R32+
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Limpa resultados e palpites das fases mata-mata (R32 até Final) no Supabase e local.
                Palpites da fase de grupos e pontuação são preservados. Após reset, realiza
                auditoria dos pontos de cada membro.
              </p>
              <Button
                variant="destructive"
                size="sm"
                disabled={resetting}
                onClick={handleResetKnockout}
              >
                {resetting ? "Resetando..." : "Resetar R32+"}
              </Button>
              {auditData && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-foreground mb-2">
                    Auditoria — Pontos Fase de Grupos:
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membro</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditData.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right font-mono">{row.totalPoints}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-destructive flex items-center gap-2">
              <AlertTriangle className="size-3.5" /> Reset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Apaga todos os dados locais (palpites, membros, usuários, sessão) e recarrega a
              página. As partidas reais da Copa são mantidas. Se já migrou para o Supabase, os dados
              remotos não são afetados.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                localStorage.removeItem("officecup-2026");
                localStorage.removeItem("current_user_id");
                const req = indexedDB.deleteDatabase("officecup-sqlite");
                req.onsuccess = () => location.reload();
                req.onerror = () => location.reload();
              }}
            >
              <Trash2 className="size-3.5 mr-1" /> Resetar dados da aplicação
            </Button>
          </CardContent>
        </Card>
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center mt-6 font-mono">
        v{APP_VERSION}.{APP_COMMIT}
      </p>
    </div>
  );
}
