import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { mockProfiles } from "@/mocks/profiles";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function PerfilPage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const user = mockProfiles.find((p) => p.id === currentUserId)!;
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
      </div>
    </div>
  );
}