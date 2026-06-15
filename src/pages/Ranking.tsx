import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { mockProfiles } from "@/mocks/profiles";

export function RankingPage() {
  const authUser = useAuthStore((s) => s.user);
  const members = useAppStore((s) => s.members);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const sorted = [...members].sort((a, b) => b.total_points - a.total_points);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter">Ranking da Firma</h1>
        <p className="text-sm text-muted-foreground">
          Classificação geral dos participantes do bolão.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            Bolão da Diretoria 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 font-mono text-[10px] uppercase tracking-widest">
                  Pos
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                  Membro
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                  Status
                </TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest">
                  Pontos
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((m, idx) => {
                const p =
                  authUser?.id === m.user_id
                    ? {
                        id: authUser.id,
                        email: authUser.email,
                        full_name: authUser.full_name,
                        avatar_url: "",
                      }
                    : mockProfiles.find((x) => x.id === m.user_id);
                const isMe = m.user_id === currentUserId;
                const name = p?.full_name ?? "Usuário local";
                return (
                  <TableRow key={m.id} className={isMe ? "bg-primary/5" : ""}>
                    <TableCell className="font-mono">{String(idx + 1).padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                          {name
                            .split(" ")
                            .map((x) => x[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <span className={isMe ? "font-bold text-primary" : "font-semibold"}>
                          {name}
                          {isMe && " (você)"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.has_paid_admin ? (
                        <Badge className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/15">
                          PAGO
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-dashed text-muted-foreground">
                          PENDENTE
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {m.total_points}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
