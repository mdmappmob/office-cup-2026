import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Link2, Users } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { mockProfiles } from "@/mocks/profiles";
import { mockLeagues } from "@/mocks/leagues";
import { toast } from "sonner";

export function GestaoPage() {
  const members = useAppStore((s) => s.members);
  const toggle = useAppStore((s) => s.toggleMemberPaid);
  const league = mockLeagues[0];

  const copyInvite = () => {
    const url = `${window.location.origin}/convite/${league.id}-token`;
    navigator.clipboard.writeText(url).catch(() => undefined);
    toast.success("Link de convite copiado");
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tighter">Gestão do Bolão</h1>
        <p className="text-sm text-muted-foreground">Controle de membros, pagamentos e convites.</p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Convite</CardTitle>
          <Button onClick={copyInvite} size="sm" variant="outline">
            <Link2 className="size-4 mr-1" /> Copiar link
          </Button>
        </CardHeader>
        <CardContent>
          <code className="block bg-muted/40 border border-border rounded-md p-3 text-xs font-mono text-muted-foreground">
            /convite/{league.id}-token
          </code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Users className="size-4" /> Membros ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.map((m) => {
            const p = mockProfiles.find((x) => x.id === m.user_id);
            return (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    {p?.full_name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{p?.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.has_paid_admin ? (
                    <Badge className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/15">PAGO</Badge>
                  ) : (
                    <Badge variant="outline" className="border-dashed text-muted-foreground">PENDENTE</Badge>
                  )}
                  <Switch
                    checked={m.has_paid_admin}
                    onCheckedChange={() => {
                      toggle(m.id);
                      toast.success(`${p?.full_name} marcado como ${!m.has_paid_admin ? "pago" : "pendente"}`);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}