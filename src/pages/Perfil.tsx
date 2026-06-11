import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { mockProfiles } from "@/mocks/profiles";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle } from "lucide-react";

export function PerfilPage() {
  const authUser = useAuthStore((s) => s.user);
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
  const isAdmin = useAppStore((s) => s.isAdmin);
  const setAdmin = useAppStore((s) => s.setAdmin);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold tracking-tighter mb-1">Meu Perfil</h1>
      <p className="text-sm text-muted-foreground mb-8">Informações da conta e preferências.</p>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center font-bold">
                {user.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
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
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="admin">Simular usuário como admin</Label>
              <Switch id="admin" checked={isAdmin} onCheckedChange={setAdmin} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Toggle apenas para demonstração: alterna a visibilidade do item "Gestão do Bolão" na sidebar.
            </p>
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
              Apaga todos os dados locais (palpites, membros, usuários, sessão) e recarrega a página.
              As partidas reais da Copa são mantidas.
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