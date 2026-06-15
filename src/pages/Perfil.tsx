import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { mockProfiles } from "@/mocks/profiles";
import { mockMatches } from "@/mocks/matches";
import { Trash2, AlertTriangle, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { migrateUserData } from "@/lib/supabase/migrate.server";

export function PerfilPage() {
  const [migrating, setMigrating] = useState(false);
  const authUser = useAuthStore((s) => s.user);
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
  const migrated =
    typeof window !== "undefined" && authUser?.id
      ? localStorage.getItem(`supabase_migrated_${authUser.id}`)
      : null;

  const handleMigrate = async () => {
    if (!authUser?.id) return;
    setMigrating(true);
    try {
      const members = localData?.members ?? [];
      const totalPoints =
        members.find((m: { user_id: string }) => m.user_id === authUser.id)?.total_points ?? 0;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const matches = mockMatches.map((m) => ({
        id: m.id,
        home_team: m.home_team,
        away_team: m.away_team,
        home_flag: m.home_flag,
        away_flag: m.away_flag,
        match_date: m.match_date,
        phase: m.phase,
        group: m.group,
      }));
      const result = await migrateUserData({
        data: {
          supabaseUrl,
          userId: authUser.id,
          matches,
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
        toast.success(`${localPredictions} palpite(s) migrados com sucesso!`);
      } else {
        toast.error("Erro na migração", { description: result.error });
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
    </div>
  );
}
